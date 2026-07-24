/* =========================================================================
   Googleスプレッドシート連携（ニュース・試合結果）
   =========================================================================
   ここは「data.js を直接書き換えなくても、Googleフォームに入力するだけで
   ニュースや試合結果がサイトに反映される」ための仕組みです。

   ★このファイルは基本的に編集不要です。
   　設定するのは data.js の sheetsSyncConfig（URLを貼るだけ）です。

   ★列名は「完全一致」ではなく「キーワードを含むか」で自動的に探します。
   　Googleフォームの質問文は、たとえば
   　「日付を入力してください（例：2026.06.01）」のように、人によって
   　書き方が変わります。この仕組みでは、質問文の中に "日付" という
   　キーワードが含まれていれば自動的にその列だと判断するので、
   　質問文を多少書き換えても壊れません。

   ★安全設計：
   　- sheetsSyncConfig にURLが入っていない／通信に失敗した場合は、
   　  自動的に data.js の newsData / scheduleData（今まで通りの手書きデータ）
   　  が使われます。サイトが真っ白になることはありません。
   　- 通信は最大5秒でタイムアウトします。
   ========================================================================= */

(function () {
  const FETCH_TIMEOUT_MS = 9000;
  // 通信自体の安全上限（万一シートに大量の行があっても処理が重くならないための保険）。
  // 実際に表示する件数は sheetsSyncConfig.newsMaxItems / currentSeason で決まります。
  const SAFETY_MAX_ROWS = 100;

  // 列を探すためのキーワード（この文字を「含む」列を、その項目の列とみなす）。
  // 配列の順番 = 探す優先順位。同じキーワードが複数の列に含まれてしまう事故を防ぐため、
  // 一度どれかの項目に使われた列は、他の項目の候補からは除外される。
  // なので「リンク」「スコア」「勝敗」のような具体的なキーワードを先に、
  // 「結果」のような広い意味になりがちなキーワードは後ろに置いてある。
  const NEWS_KEYWORDS = [
    ["date", "日付"],
    ["tag", "種類"],
    ["title", "タイトル"],
    ["detail", "詳しい"],
    ["text", ["簡単な説明", "本文"]],
    ["pinned", "固定"],
    ["link", "リンク"],
    ["image", ["画像", "写真"]]
  ];
  const NEWS_TAG_MAP = { "試合": "match", "お知らせ": "info", "募集": "recruit" };

  const SCHEDULE_KEYWORDS = [
    ["resultLink", "リンク"],
    ["date", "日付"],
    ["competition", "大会"],
    ["homeAway", "ホーム"],
    ["kickoffTime", "キックオフ"],
    ["venue", "会場"],
    ["opponent", "対戦相手"]
  ];

  // ---- 更新頻度が低いもの（スプレッドシート直接編集。フォームは使わない） ----
  const STAFF_KEYWORDS = [
    ["photo", "写真"],
    ["comment", "コメント"],
    ["role", "役職"],
    ["name", "名前"]
  ];

  const PLAYER_KEYWORDS = [
    ["photo", "写真"],
    ["isStaffRaw", "マネージャー"],
    ["sub", "出身"],
    ["grade", "学年"],
    ["name", "名前"]
  ];

  const SPONSOR_KEYWORDS = [
    ["imageUrl", ["ロゴ", "写真"]],
    ["address", "住所"],
    ["description", "事業内容"],
    ["url", "URL"],
    ["name", "名前"]
  ];

  // 「その他」シートは固定の列名ではなく、1列目＝項目名／2列目＝内容 の
  // 「行」ごとに読み取る（対応する項目名は buildSettingsData 側で判定する）
  const SETTINGS_ROW_KEYWORDS = [
    ["item", "項目"],
    ["value", "内容"],
    ["note", "補足"]
  ];

  const FAQ_KEYWORDS = [
    ["q", "質問"],
    ["a", "回答"],
    ["url", ["URL", "リンク"]]
  ];

  // 「箇条書きで表示したい項目」は1つのセルの中で改行して複数行入力してもらい、
  // 改行ごとに箇条書きの1項目として分割する
  const SUPPORT_KEYWORDS = [
    ["image", ["画像", "写真"]],
    ["lead", "説明"],
    ["itemsRaw", "項目"],
    ["title", "見出し"]
  ];

  // ---- タイムアウト付きfetch ----
  async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!res.ok) throw new Error("HTTPエラー: " + res.status);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  // 1回失敗しても、一時的な通信の乱れの可能性があるので少し待ってもう一度だけ試す。
  // それでもダメだったときだけ本当の「失敗」として扱う
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function fetchWithRetry(url) {
    try {
      return await fetchWithTimeout(url);
    } catch (err) {
      await wait(700);
      return await fetchWithTimeout(url);
    }
  }

  // ---- CSVパーサー（ダブルクォート・カンマ入りの値に対応した最小実装） ----
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (inQuotes) {
        if (c === '"' && next === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\r") {
        // 無視
      } else if (c === "\n") {
        row.push(field); rows.push(row); row = []; field = "";
      } else {
        field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // CSVの2次元配列を { headers: [...], objects: [{列名: 値}, ...] } に変換
  // skipExampleRow を true にすると、1行目（見出し）の次の行（2行目）を
  // 「記入例」とみなして読み飛ばす。選手・スタッフ・スポンサーのように、
  // フォームを介さず直接編集するシートで、2行目に記入例を置けるようにするため
  // skipExampleRow が true の時は「1行目＝記入例（読み飛ばす）／2行目＝見出し／
  // 3行目以降＝データ」という並びとして読む（選手・スタッフ・スポンサー用）。
  // false の時は今まで通り「1行目＝見出し／2行目以降＝データ」（ニュース・試合結果用）
  function csvToTable(csvText, skipExampleRow) {
    const rows = parseCsv(csvText).filter((r) => r.some((v) => v !== ""));
    const headerRowIndex = skipExampleRow ? 1 : 0;
    if (rows.length <= headerRowIndex) return { headers: [], objects: [] };
    const headers = rows[headerRowIndex].map((h) => h.trim());
    const objects = rows.slice(headerRowIndex + 1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] || "").trim(); });
      return obj;
    });
    return { headers, objects };
  }

  // 大文字小文字の違いを無視してキーワード一致させる
  const includesLoose = (haystack, needle) =>
    haystack.toLowerCase().includes(needle.toLowerCase());

  // headers（実際にシートに並んでいる列名）の中から、keywordEntries の
  // キーワードを含む列を探して { 項目名: 実際の列名 } の対応表を作る
  function resolveColumns(headers, keywordEntries) {
    const remaining = headers.slice();
    const resolved = {};
    keywordEntries.forEach(([key, keywordOrList]) => {
      const keywords = Array.isArray(keywordOrList) ? keywordOrList : [keywordOrList];
      let idx = -1;
      for (const kw of keywords) {
        idx = remaining.findIndex((h) => includesLoose(h, kw));
        if (idx !== -1) break;
      }
      if (idx !== -1) {
        resolved[key] = remaining[idx];
        remaining.splice(idx, 1); // 一度使った列は他の項目の候補から外す
      } else {
        resolved[key] = null; // 見つからなかった（フォームにその質問が無い等）
      }
    });
    return resolved;
  }

  const getVal = (obj, cols, key) => (cols[key] ? (obj[cols[key]] || "") : "");

  // "kaneko.jpg" のように入力されても、自動で "images/kaneko.jpg" に補完する
  // （既に "images/" から書かれていれば、それはそのまま使う）
  const resolveImagePath = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return "";
    return v.startsWith("images/") ? v : `images/${v}`;
  };

  // Googleフォームの「ファイルアップロード」質問は、回答スプレッドシートに
  // Googleドライブの共有リンク（例："https://drive.google.com/open?id=XXXX" や
  // ".../file/d/XXXX/view?usp=drivesdk"）がそのまま入力される。
  // これを、元画像そのものではなく「軽量なサムネイル」を返すURL形式に変換する
  // （sz=w800 は幅800pxのサムネイルという意味。元画像が大きくてもここで軽くなる）。
  // ※Googleドライブの正式なCDN機能ではないため、将来的にこの形式が使えなくなる
  //   可能性はゼロではないが、装飾目的のニュース画像用途としては許容している。
  const resolveDriveImage = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return "";
    // すでに images/ 配下のファイル名など、Googleドライブのリンクでない場合はそのまま使う
    if (!v.includes("drive.google.com")) return v;
    // URLの中からファイルIDを取り出す（"id=XXXX" と "/d/XXXX/" の両方の形式に対応）
    const idMatch = v.match(/[?&]id=([^&]+)/) || v.match(/\/d\/([^/]+)/);
    const fileId = idMatch ? idMatch[1] : "";
    if (!fileId) return "";
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  };

  function buildNewsData(headers, objects) {
    const cols = resolveColumns(headers, NEWS_KEYWORDS);
    return objects
      .map((o) => {
        const text = getVal(o, cols, "text");
        const detail = getVal(o, cols, "detail");
        const pinnedRaw = getVal(o, cols, "pinned");
        // 「固定する」→true、「固定しない」（またはそれ以外・未入力）→false
        const pinned = pinnedRaw.includes("しない") ? false : pinnedRaw.includes("する");
        return {
          tag: NEWS_TAG_MAP[getVal(o, cols, "tag")] || "info",
          date: getVal(o, cols, "date"),
          title: getVal(o, cols, "title"),
          text,
          detail, // 「詳しい内容」が未入力なら空のまま（本文へのフォールバックは表示側で行う）
          pinned,
          link: getVal(o, cols, "link"),
          image: resolveDriveImage(getVal(o, cols, "image"))
        };
      })
      .filter((n) => n.title)
      .slice(-SAFETY_MAX_ROWS); // 念のための安全上限（新しい日付順への並び替えと件数の絞り込みは script.js 側で行う）
  }

  // 同じ「日付＋対戦相手」の行が複数あるとき、最後に入力されたものだけを残す
  // （試合結果を後から訂正・追記した場合に、古い行と新しい行が二重表示されるのを防ぐ）
  function dedupeBySameMatch(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const key = `${row.date.trim()}__${row.opponent.trim()}`;
      map.set(key, row); // 同じキーに再度setすると中身は最新のもので上書きされる
    });
    return Array.from(map.values());
  }

  function buildScheduleData(headers, objects) {
    const cols = resolveColumns(headers, SCHEDULE_KEYWORDS);
    const rows = objects
      .map((o) => {
        // 「結果」を選ぶ質問の文言そのものには依存せず、
        // リンクURLの欄に何か入力されているかどうかだけで判定する
        // （選択肢の言い回しをどう変えても壊れないようにするため）
        const link = getVal(o, cols, "resultLink").trim();
        const result = link
          ? { type: "link", url: link, label: "SNSで確認する" }
          : { type: "pending", text: "勝敗未定" };

        // HOME/AWAYは「ホーム」「アウェイ」どちらの表記で回答されても認識できるようにする
        const haRaw = getVal(o, cols, "homeAway");
        const homeAway = /アウェイ|AWAY/i.test(haRaw) ? "AWAY" : /ホーム|HOME/i.test(haRaw) ? "HOME" : "";

        return {
          date: getVal(o, cols, "date"),
          // 年度はここでは読み取らない。日付から自動計算する（script.js側）ので、
          // フォームに「年度」の質問は不要
          competition: getVal(o, cols, "competition"),
          opponent: getVal(o, cols, "opponent"),
          homeAway,
          kickoffTime: getVal(o, cols, "kickoffTime"),
          venue: getVal(o, cols, "venue"),
          result
        };
      })
      .filter((s) => s.date || s.opponent);

    return dedupeBySameMatch(rows).slice(0, SAFETY_MAX_ROWS);
    // ※1月→12月の順への並び替えと、今年度の絞り込みは script.js 側で
    //   日付から自動で行うので、フォームにはどの順番で入力しても大丈夫です。
  }

  function buildStaffData(headers, objects) {
    const cols = resolveColumns(headers, STAFF_KEYWORDS);
    return objects
      .map((o) => ({
        role: getVal(o, cols, "role"),
        name: getVal(o, cols, "name"),
        comment: getVal(o, cols, "comment"),
        photo: resolveImagePath(getVal(o, cols, "photo"))
      }))
      .filter((s) => s.name)
      .slice(0, SAFETY_MAX_ROWS);
  }

  function buildPlayersData(headers, objects) {
    const cols = resolveColumns(headers, PLAYER_KEYWORDS);
    return objects
      .map((o) => {
        const isStaffRaw = getVal(o, cols, "isStaffRaw");
        // 「はい」「Yes」「する」などを true として扱う（空欄・「いいえ」は false）
        const isStaff = /はい|yes|true|する/i.test(isStaffRaw) && !/いいえ|no|しない/i.test(isStaffRaw);

        const name = getVal(o, cols, "name");
        const initial = name.charAt(0); // イニシャルは常に名前の1文字目

        // 学年は「1」「2」「3」「4」（「1年」等でもOK）で入力してもらい、
        // そこから内部用の学年キー（フィルター用）と表示文字（○年生）を作る
        const gradeRaw = getVal(o, cols, "grade");
        const gradeNumMatch = gradeRaw.match(/\d+/);
        const gradeNum = gradeNumMatch ? gradeNumMatch[0] : "";

        const schoolRaw = getVal(o, cols, "sub");

        let grade, role, sub;
        if (isStaff) {
          // マネージャーの場合は、学年・出身校の入力があっても無視する
          grade = "スタッフ";
          role = "マネージャー";
          sub = "";
        } else {
          grade = gradeNum ? `${gradeNum}年` : "";
          role = gradeNum ? `${gradeNum}年生` : "";
          sub = schoolRaw ? `出身：${schoolRaw}` : "";
        }

        return {
          name,
          initial,
          grade,
          role,
          sub,
          photo: resolveImagePath(getVal(o, cols, "photo")),
          isStaff
        };
      })
      .filter((p) => p.name)
      .slice(0, SAFETY_MAX_ROWS);
  }

  function buildSponsorsData(headers, objects) {
    const cols = resolveColumns(headers, SPONSOR_KEYWORDS);
    return objects
      .map((o) => {
        // 「企業名」と「短い表示名」は分けず、1つの「表示する名前」を両方に使う
        const displayName = getVal(o, cols, "name");
        return {
          name: displayName,
          shortName: displayName,
          address: getVal(o, cols, "address"),
          description: getVal(o, cols, "description"),
          url: getVal(o, cols, "url"),
          imageUrl: resolveImagePath(getVal(o, cols, "imageUrl"))
        };
      })
      .filter((s) => s.name)
      .slice(0, SAFETY_MAX_ROWS);
  }

  // 「その他」シート：1列目＝項目名／2列目＝内容／3列目＝補足 の行を読み取る。
  //
  // 判定の優先順位（上から順にチェックし、最初に当てはまったものを使う）：
  //   1. 項目名が「Aboutの「◯◯」」の形（かぎカッコ入り）なら、
  //      ◯◯という名前のAboutの項目カードとして扱う。
  //      ただし「部の紹介文」だけは特別で、Aboutの紹介文（段落）として扱う。
  //   1-2. 「メニューの「News」」のような形は、ヘッダーのメニュー文字を差し替える
  //   1-3. 「News」「Schedule」「Members」「Q&A」「Sponsors」の後にかぎカッコが
  //      続く形（例：「Membersの「新人紹介」」）は、そのセクションの下に
  //      「◯◯：内容」という補足カードとして自動的に追加表示される
  //      → これが「新しい項目を増やしても自動対応できる仕組み」です。
  //        6つのセクション名（News/About/Schedule/Members/Q&A/Sponsors）の
  //        どれでも同じ書き方で使え、コード側の修正は不要です
  //   2. それ以外は、決まったキーワードで判定する（下のリストを参照）
  const SECTION_EXTRA_PREFIXES = [
    ["news", ["News", "ニュース"]],
    ["schedule", ["Schedule", "試合日程", "スケジュール"]],
    ["members", ["Members", "メンバー"]],
    ["faq", ["Q&A", "QA", "よくある質問"]],
    ["sponsors", ["Sponsors", "スポンサー"]]
  ];
  const SETTINGS_ROW_MATCHERS = [
    ["slogan", "スローガン"],
    ["affiliation", "所属"], // 「Aboutの「所属リーグ」」は1.で先に処理されるので、ここに来るのは「トップ画面の所属」系だけ
    ["adviserEmail", "顧問"],
    ["sponsorEmail", ["企業様", "スポンサー", "協賛"]],
    ["sponsorFormUrl", "フォーム"]
  ];
  function buildSettingsData(headers, objects) {
    const cols = resolveColumns(headers, SETTINGS_ROW_KEYWORDS);
    const result = { aboutFacts: {}, sectionExtras: {} };
    objects.forEach((o) => {
      const label = getVal(o, cols, "item");
      const value = getVal(o, cols, "value");
      const note = getVal(o, cols, "note");
      if (!label || !value) return;
      const bracketMatch = label.match(/「(.+?)」/);

      // 1. 「Aboutの「◯◯」」の形は、◯◯をそのままAboutのカード名として扱う
      if (label.includes("About") && bracketMatch) {
        const innerLabel = bracketMatch[1];
        if (innerLabel.includes("紹介文") || innerLabel.includes("部の紹介")) {
          result.aboutText = value;
        } else {
          result.aboutFacts[innerLabel] = { value, note };
        }
        return;
      }

      // 1-2. 「メニューの「News」」のような形は、ヘッダーのメニュー文字を差し替える
      if ((label.includes("メニュー") || label.includes("ヘッダー")) && bracketMatch) {
        const menuKey = bracketMatch[1];
        result.navLabels = result.navLabels || {};
        result.navLabels[menuKey] = value;
        return;
      }

      // 1-3. 「News」「Schedule」「Members」「Q&A」「Sponsors」＋かぎカッコの形は、
      //      そのセクションの補足カードとして自動的に追加する
      if (bracketMatch) {
        const sectionMatch = SECTION_EXTRA_PREFIXES.find(([, kws]) => kws.some((k) => label.includes(k)));
        if (sectionMatch) {
          const sectionKey = sectionMatch[0];
          const innerLabel = bracketMatch[1];
          result.sectionExtras[sectionKey] = result.sectionExtras[sectionKey] || {};
          result.sectionExtras[sectionKey][innerLabel] = { value, note };
          return;
        }
      }

      // 2. トップの活動写真（「トップ」＋「写真」または「画像」を含む行）
      //    セルの中でAlt+Enterで複数行入力すると、自動でスライドショーになる
      //    （1行だけなら今まで通り静止画1枚）
      if (label.includes("トップ") && (label.includes("写真") || label.includes("画像"))) {
        const lines = value.split(/\r?\n/).map((v) => v.trim()).filter((v) => v);
        result.heroPhoto = lines.length > 1 ? lines.map(resolveImagePath) : resolveImagePath(lines[0] || value);
        return;
      }

      // 3. 決まったキーワードでの判定
      const match = SETTINGS_ROW_MATCHERS.find(([, kw]) => {
        const kws = Array.isArray(kw) ? kw : [kw];
        return kws.some((k) => includesLoose(label, k));
      });
      if (!match) return; // どれにも当てはまらない行は無視される
      const key = match[0];
      if (key === "affiliation") {
        // トップ画面の「所属」は、B列を数字部分・C列を単位部分として別々に使う
        // （例：B="SUL" C="2部" → 表示は "SUL" + 小さく "2部"）
        result.affiliationValue = value;
        result.affiliationSuffix = note;
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  function buildFaqData(headers, objects) {
    const cols = resolveColumns(headers, FAQ_KEYWORDS);
    return objects
      .map((o) => ({
        q: getVal(o, cols, "q"),
        a: getVal(o, cols, "a"),
        url: getVal(o, cols, "url")
      }))
      .filter((f) => f.q)
      .slice(0, SAFETY_MAX_ROWS);
  }

  function buildSupportData(headers, objects) {
    const cols = resolveColumns(headers, SUPPORT_KEYWORDS);
    return objects
      .map((o) => {
        // セルの中で改行して複数行入力されたものを、箇条書きの1項目ずつに分ける
        const itemsRaw = getVal(o, cols, "itemsRaw");
        const items = itemsRaw.split(/\r?\n/).map((v) => v.trim()).filter((v) => v);
        return {
          title: getVal(o, cols, "title"),
          lead: getVal(o, cols, "lead"),
          items,
          image: resolveImagePath(getVal(o, cols, "image"))
        };
      })
      .filter((s) => s.title)
      .slice(0, SAFETY_MAX_ROWS);
  }

  // ---- メイン処理：data.js の sheetsSyncConfig を見て、あれば読み込む ----
  window.loadSheetsData = async function loadSheetsData() {
    if (typeof sheetsSyncConfig === "undefined") return;

    const tasks = [];

    if (sheetsSyncConfig.newsCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.newsCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text);
            window.__syncedNewsData = buildNewsData(headers, objects);
            window.__newsSyncFailed = false; // 成功したら必ずリセットする
          })
          .catch((err) => {
            window.__newsSyncFailed = true; // 画面側で「読み込めませんでした」の注意書きを出す判定に使う
            console.warn("[news連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    if (sheetsSyncConfig.scheduleCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.scheduleCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text);
            window.__syncedScheduleData = buildScheduleData(headers, objects);
            window.__scheduleSyncFailed = false; // 成功したら必ずリセットする
          })
          .catch((err) => {
            window.__scheduleSyncFailed = true;
            console.warn("[試合結果連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    if (sheetsSyncConfig.staffCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.staffCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text, true); // 2行目は記入例として読み飛ばす
            window.__syncedStaffData = buildStaffData(headers, objects);
            window.__staffSyncFailed = false;
          })
          .catch((err) => {
            window.__staffSyncFailed = true;
            console.warn("[監督・コーチ連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    if (sheetsSyncConfig.playersCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.playersCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text, true); // 2行目は記入例として読み飛ばす
            window.__syncedPlayersData = buildPlayersData(headers, objects);
            window.__playersSyncFailed = false;
          })
          .catch((err) => {
            window.__playersSyncFailed = true;
            console.warn("[選手連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    if (sheetsSyncConfig.sponsorsCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.sponsorsCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text, true); // 2行目は記入例として読み飛ばす
            window.__syncedSponsorsData = buildSponsorsData(headers, objects);
            window.__sponsorsSyncFailed = false;
          })
          .catch((err) => {
            window.__sponsorsSyncFailed = true;
            console.warn("[スポンサー連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    if (sheetsSyncConfig.settingsCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.settingsCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text, true);
            window.__syncedSettings = buildSettingsData(headers, objects);
            window.__settingsSyncFailed = false;
          })
          .catch((err) => {
            window.__settingsSyncFailed = true;
            console.warn("[その他設定連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    if (sheetsSyncConfig.faqCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.faqCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text, true);
            window.__syncedFaqData = buildFaqData(headers, objects);
            window.__faqSyncFailed = false;
          })
          .catch((err) => {
            window.__faqSyncFailed = true;
            console.warn("[Q&A連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    if (sheetsSyncConfig.supportCsvUrl) {
      tasks.push(
        fetchWithRetry(sheetsSyncConfig.supportCsvUrl)
          .then((text) => {
            const { headers, objects } = csvToTable(text, true);
            window.__syncedSupportData = buildSupportData(headers, objects);
            window.__supportSyncFailed = false;
          })
          .catch((err) => {
            window.__supportSyncFailed = true;
            console.warn("[企業様向けご支援案内連携] 読み込みに失敗したため、data.js の内容を表示します:", err);
          })
      );
    }

    // どちらかが失敗しても、成功した方だけは反映されるようにする
    await Promise.allSettled(tasks);
  };
})();
