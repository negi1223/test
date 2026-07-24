/* =========================================================================
   このファイルを編集するだけでサイトの内容を更新できます。
   HTMLやCSSは基本的に触らずに、下の { ... } や [ ... ] の中身を
   書き換え・追加・削除するだけでOKです。

   ・配列（[ ... ]）の1件分は { } で囲まれた「オブジェクト」です
   ・1件をコピー＆ペーストして値を書き換えれば、項目を増やせます
   ・末尾のカンマ「,」を消し忘れないよう注意してください
   ・画像を追加したいときは images フォルダにファイルを置いて、
     このファイルの該当箇所に "images/ファイル名" と書くだけです
   ========================================================================= */


/* -------------------------------------------------------------------------
   0. サイト全体の設定（ヘッダー・フッター・SNS・連絡先など）
   ここを直すと、ヘッダー／フッター／各セクションのリンクや
   メールアドレス表記がまとめて更新されます。
   ------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------
   -1. Googleフォーム連携の設定（ニュース・試合結果）
   ここにURLを貼ると、data.js の newsData / scheduleData の代わりに
   Googleフォームの回答（スプレッドシート）が自動でサイトに表示されます。

   【設定手順】
   ① Googleフォームを作成する（質問の作り方は「サイト更新マニュアル」を参照）
   ② フォームの「回答」タブ → スプレッドシートのアイコンをクリックしてシートを作成
   ③ 作成されたスプレッドシートを開き、上部メニューの
      「ファイル」→「共有」→「ウェブに公開」を選択
   ④ 公開する範囲でシート名を選び、形式を「カンマ区切りの値（.csv）」にして「公開」
   ⑤ 表示されたURLを、下の newsCsvUrl（または scheduleCsvUrl）に "" で囲んで貼り付ける

   ※空欄（""）のままなら、今まで通り下の newsData / scheduleData がそのまま使われます
     （壊れる心配なく、準備ができてから設定できます）

   newsMaxItems：  ニュースを新しい順に何件まで表示するか（初期値6）
   currentSeason： 試合結果に表示する「今年度」を手動で指定したい時だけ使う（例："2027"）。
                   空欄（""）のままにしておくと、パソコンの「今日の日付」から
                   4月1日～翌年3月31日を1年度として自動で判定されるので、
                   通常は何も書き換える必要はありません
                   （年度をまたぐ4月になっても、自動的に前年度の試合結果は
                   表示されなくなります。データ自体は消えないので、
                   過去の記録として振り返ることは引き続き可能です）
   ------------------------------------------------------------------------- */
const sheetsSyncConfig = {
  // 更新頻度が高いもの（Googleフォーム経由）
  newsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=143287817&single=true&output=csv",
  scheduleCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=263763355&single=true&output=csv",

  // 更新頻度が低いもの（Googleフォームは経由せず、スプレッドシートを直接編集する）
  // 空欄（""）のままなら、今まで通り下の playersData / staffData / sponsorsData が使われます。
  // 設定方法は、このファイルの各データの説明コメント（220行目あたり〜）を参照してください
  playersCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=210235188&single=true&output=csv",
  staffCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=1706764530&single=true&output=csv",
  sponsorsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=2145349521&single=true&output=csv",
  settingsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=1120366738&single=true&output=csv", // 現役部員数・所属（ヒーローの数字）。設定方法はheroDataのコメント参照
  faqCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=86208624&single=true&output=csv",       // Q&A。設定方法はfaqDataのコメント参照
  supportCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOz2dky2NJJZRwolzgrwJ4URcbnY8KPY3WwHtPPZyT7tBORmlv-lwaLBKR8mApxroYPcXTB3DNgwUT/pub?gid=1373268438&single=true&output=csv",   // 企業様向けご支援案内。設定方法はsupportDataのコメント参照

  newsMaxItems: 6,
  currentSeason: "" // 空欄なら自動判定。手動で固定したい年度がある時だけ "2027" のように入力する
};


const siteData = {
  clubNameJp: "徳島文理大学男子サッカー部",
  clubNameEn: "BUNRI UNIV. SOCCER CLUB",
  logoInitial: "B",              // ヘッダー左上の丸アイコンの文字（logoImageが空のときに使われます）
  logoImage: "images/logo.jpg",  // ロゴ画像を使いたい場合はここに画像パスを入れる（例: "images/logo.png"）
                                  // 入れると自動的に文字からロゴ画像表示に切り替わります

  instagramUrl: "https://www.instagram.com/bunri.uni",
  instagramHandle: "@bunri.uni",
  xUrl: "https://x.com/bunri_univ",

  // 見学・入部希望者からの連絡先（顧問）
  adviserName: "顧問の金子先生",
  adviserEmail: "kaneko@tks.bunri-u.ac.jp",

  // 企業様・スポンサー様からの連絡先
  sponsorEmail: "tokushimabunri.univ.soccer@gmail.com",

  // Googleフォーム（企業様・スポンサー様向けお問い合わせ専用）
  // 差し替えたい場合はここのURLを書き換えるだけでOK
  // ※sponsorFormEmbedUrl は現在未使用（ページ内プレビューは廃止し、ボタンでフォームを開く形にしています）
  sponsorFormEmbedUrl: "https://docs.google.com/forms/d/e/1FAIpQLSewjVc6v5sLaSuV8EkcaNiRAf_fQkKz0CBimOnra1tyD7aTXA/viewform?embedded=true",
  sponsorFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSewjVc6v5sLaSuV8EkcaNiRAf_fQkKz0CBimOnra1tyD7aTXA/viewform",

  copyrightYear: "2026", // サイトを開設した年（この数字は変えない）。今の年と違えば自動で「2026 - 2027」のように表示される
  copyrightEn: "Tokushima Bunri University Men's Soccer Club. All Rights Reserved."
};

/* -------------------------------------------------------------------------
   ★「その他」スプレッドシート（sheetsSyncConfig.settingsCsvUrl）について

   トップの所属・写真、Aboutのスローガン・紹介文・各カード、ヘッダーメニューの
   文字、企業様・スポンサー様向けメールアドレスなど、いろいろな箇所をまとめて
   1つのスプレッドシートで変更できます（Googleフォームは使いません）。

   他のシート（選手一覧など）と違って「1件＝1行」ではなく、
   「1つの設定＝1行」という表になります。

   【設定手順】
   ① 新しくGoogleスプレッドシートを作る（フォームは作らない）
   ② 1行目に自由に「記入例」を書く（自動的に読み飛ばされ、サイトには使われません）
   ③ 2行目（見出し行）に「項目」「表示される内容」「補足説明(あれば)」の3つを入力する
   ④ 3行目から、変更したい項目だけ1行ずつ入力する（変更しない項目の行は
     作らなくてOK。空欄のまま残しておいても無視されます）
   ⑤ 「ファイル」→「共有」→「ウェブに公開」→ 形式を「カンマ区切りの値(.csv)」にして公開
   ⑥ 表示されたURLを sheetsSyncConfig.settingsCsvUrl に貼る

   【「項目」に入力する内容】

   ★自動対応（コードの修正なしで新しい項目を増やせるもの）
     Aboutの「◯◯」    → ◯◯という名前のAboutのカードを追加・上書きする
                        （例：「Aboutの「後援会」」と書けば、新しいカードが
                        自動で増える。「部の紹介文」だけは特別で、カードでは
                        なくAboutの紹介文の段落として扱われる）
     ヘッダーの「◯◯」  → ヘッダーメニューの文字を差し替える。◯◯には
                        News／About／Schedule／Members／Q&A／Sponsors の
                        いずれかを入れる（この6つ以外は反応しません。
                        メニューの数を増やすのはスプレッドシートだけでは
                        できないため）

   ★決まったキーワードで判定するもの
     トップ画面の所属◯◯ → トップの「所属」の数字。「表示される内容」に
                          数字部分（例："SUL"）、「補足説明」に単位部分
                          （例："2部"）を分けて入れると、元通り
                          "SUL"＋小さく"2部"の表示になる
     トップの活動写真     → トップの活動写真（images/ は省略可）。
                          セルの中でAlt+Enter（Mac: ⌥+Enter）を押して複数行
                          入力すると、自動でスライドショーになります
                          （1行だけなら静止画1枚のまま）
     Aboutのスローガン    → Aboutのスローガン
     顧問                → 顧問の連絡先メールアドレス
     企業様向け／スポンサー／協賛 → 企業様・スポンサー様向けメールアドレス
     お問い合わせフォーム  → 企業様向けお問い合わせフォームのURL

   ※上のどれにも当てはまらない項目名の行は、無視されます（サイトには
     反映されません）。新しい種類の項目を増やしたい場合はご相談ください

   例）
   項目,表示される内容,補足説明(あれば)
   トップ画面の所属リーグ,SUL,1部
   Aboutのスローガン,「一致団結、頂点へ。」,
   Aboutの「活動場所」,徳島文理大学 新グラウンド,
   ヘッダーの「News」,お知らせ,
   ------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------
   1. トップビジュアル（HEROセクション）
   photo: 写真を1枚だけ使いたい場合は "images/hero.jpg" のように文字列で指定する。
          複数枚を自動スライドショーにしたい場合は、配列で並べる（順番に切り替わります）：
          photo: ["images/hero1.jpg", "images/hero2.jpg", "images/hero3.jpg"]
          空のまま（""または[]）にするとダミー表示のままになります

   ※stats の中の「現役部員」は、playersData（選手・マネージャーの合計人数）から
     自動で計算されるので、手入力の必要はありません
   ※「所属」とヒーローの写真は、下の「その他」スプレッドシート
     （sheetsSyncConfig.settingsCsvUrl）でも変更できます。スプレッドシートの
     セル内でAlt+Enterで改行すれば、複数枚指定して自動スライドショーにできます
     （このdata.js側と同じく、1行なら1枚、複数行なら複数枚として扱われます）
   ------------------------------------------------------------------------- */
const heroData = {
  eyebrow: "TOKUSHIMA BUNRI UNIV. SOCCER CLUB",
  headline: "四国から、",
  headlineAccent: "日本一",
  headlineSuffix: "という景色へ。",
  sub: "2025年シーズンより四国大学サッカーリーグ2部に参戦。部員不足の時代を乗り越え、サッカーに打ち込みたい仲間が少しずつ集まっています。選手はもちろん、マネージャー・運営・審判に興味のある方も大歓迎です。",
  photo: "images/hero.jpg",
  photoAlt: "活動中の様子",
  stats: [
    { label: "設立リーグ参戦", value: "2025", suffix: "年〜" },
    { label: "現役部員",     value: "24",   suffix: "名" },
    { label: "所属",         value: "SUL",  suffix: "2部" }
  ]
};


/* -------------------------------------------------------------------------
   2. 部の紹介・練習日時（ABOUTセクション）
   ------------------------------------------------------------------------- */
const aboutData = {
  slogan: "「泥臭く、真摯に、勝利へ。」",
  text: "徳島文理大学男子サッカー部は、2025年シーズンより四国大学サッカーリーグ2部に参戦しています。ここ数年は部員不足に悩まされてきましたが、サッカーに本気で打ち込みたい選手が少しずつ集まり、チームは着実に活気を取り戻しています。選手として戦う仲間はもちろん、審判・運営・マネージャーなど、サッカーに関わりたいすべての人を歓迎するのが私たちのスタンスです。",
  facts: [
    { label: "活動場所",   value: "徳島文理大学 人工芝グラウンド", note: "" },
    { label: "活動日時",   value: "変動制", note: "直近の活動日時は公式Instagramでお知らせしています" },
    { label: "部員数",     value: "選手20名 マネージャー4名", note: "（2026年5月現在・1〜4年生）" },
    { label: "所属リーグ", value: "四国大学サッカーリーグ2部", note: "総理大臣杯・新人戦にも出場" }
  ],
  yearSchedule: [
    { month: "4月",  body: "リーグ戦" },
    { month: "5月",  body: "新人戦予選／インディペンデントリーグ／リーグ戦" },
    { month: "6月",  body: "総理大臣杯予選／インディペンデントリーグ／リーグ戦" },
    { month: "7月",  body: "リーグ戦" },
    { month: "8月",  body: "リーグ戦" },
    { month: "9月",  body: "インディペンデントリーグ／リーグ戦" },
    { month: "10月", body: "四国大学サッカー新人戦／インディペンデントリーグ／リーグ戦" }
  ]
};


/* -------------------------------------------------------------------------
   3. ニュース・試合速報（NEWSセクション）
   ※Googleフォーム連携（sheetsSyncConfig.newsCsvUrl）を設定している場合は、
     このデータの代わりにスプレッドシートの内容が表示されます（新しい日付順に
     sheetsSyncConfig.newsMaxItems件まで）。未設定・読み込み失敗時の保険として
     このデータが使われます。
   tag:    "match"（試合） / "info"（お知らせ） / "recruit"（募集）
   text:   ホームの最新6件カードに表示される「短い説明文」（Googleフォームの質問は
           「ニュースの簡単な説明を入力してください」。以前の「本文」という
           質問文にも引き続き対応している）
   detail: 更新一覧ページ（news.html）のアコーディオンでのみ表示される「詳しい内容」。
           省略した場合は表示時にホームと同じ text がそのまま代わりに使われる
           （このdata.js自体には無理にtextをコピーして書く必要はない）
   pinned: true にすると「固定」タグが付く（更新一覧ページでは「重要」タグになる）。
           表示順はほかと同じく日付の新しい順のまま変わらないが、
           newsMaxItems（最新6件）の件数には数えられず、必ずどこかに表示され続ける
   link:   更新一覧ページ（news.html）のアコーディオンの中にだけ表示される
           「投稿を見る →」リンク（Instagramの投稿など）。省略可。
           ※ホームの「詳しく見る」はこのlinkとは無関係（下記参照）
   ホームの「詳しく見る」について：
           以前はこのlinkに直接ジャンプしていたが、現在はnews.html（更新一覧）の
           同じニュースの場所へジャンプし、自動でアコーディオンを開く仕様に変更した。
           detail（詳しい内容）または image（画像）のどちらかが入力されている
           ときだけ表示される（text＝短い説明文はホームのカードに既に表示されて
           いるので、それだけでは「詳しく見る」は出ない。詳しい内容も画像も無い、
           短い説明文だけのニュースでは「詳しく見る」自体が出ない）
   image:  更新一覧ページ（news.html）で「詳しく見る」を開いた時だけ、詳しい内容の
           下に表示されるお知らせ用の画像（任意）。省略可。ホームのカードには
           表示されない（ホームは今まで通りテキストのみのシンプルな一覧）
           - このデータ（data.js）に直接書く場合は、他の画像と同じく
             "images/ファイル名" の形式で指定する
           - Googleフォーム連携（newsCsvUrl）を使う場合は、こちらは自動で
             入る項目なので手で書く必要はない。フォーム側の設定手順は次の通り：
             ① フォームの編集画面で「ファイルアップロード」形式の質問を追加し、
                質問文に「画像」という文字を含める（例：「(もしあれば)画像を
                アップロードしてください」）
             ② 回答された画像はGoogleドライブに保存され、回答スプレッドシートには
                そのドライブ共有リンクが自動で入る
             ③ サイト側（sheets-sync.js）がそのリンクを自動で軽量なサムネイル
                形式のURLに変換するので、特別な作業は不要
           - 表示のタイミング：画像は「詳しく見る」を押すまでブラウザが読み込まない
             （押した瞬間に初めて画像の通信が始まる）ので、ページを開いた直後の
             表示速度には影響しない
           - Googleドライブの画像リンクをそのまま表示に使う都合上、
             正式なCDN機能ではないため将来的に表示できなくなる可能性はゼロではない
             （装飾目的のニュース画像用途として許容している）
   ------------------------------------------------------------------------- */
const newsData = [
  {
    tag: "info",
    date: "2026.04.01",
    title: "見学・体験練習について",
    text: "見学・体験は随時受け付けています。詳しくはQ&Aをご覧ください。",
    pinned: true,
    link: ""
  },
  {
    tag: "match",
    date: "2026.05.18",
    title: "TM vs 四国学院大学",
    text: "後期リーグに向けた強化試合を実施。チームの完成度を確かめる一戦になりました。",
    detail: "後期リーグに向けた強化試合として、四国学院大学とトレーニングマッチを行いました。夏場の走力強化に取り組んできた成果を確認する一戦となり、選手たちは最後まで運動量を落とさずプレーできました。ご声援ありがとうございました。",
    link: "https://www.instagram.com/reel/DYdjj3vJVxJ/"
  },
  {
    tag: "info",
    date: "2026.05.15",
    title: "リーグ戦前期日程が終了",
    text: "四国大学サッカーリーグ2部の前期日程が終了しました。後期に向けてチーム強化を進めます。",
    link: "https://www.instagram.com/reel/DYUT9ItJd_B/"
  },
  {
    tag: "match",
    date: "2026.05.09",
    title: "SUL2 第4節 vs 徳島大学",
    text: "四国大学サッカーリーグ2部・第4節を戦いました。詳しい試合内容はInstagramで公開中です。",
    link: "https://www.instagram.com/p/DYHvnraGmpp/"
  },
  {
    tag: "match",
    date: "2026.04.25",
    title: "SUL2 第1節 vs 高知工科大学",
    text: "2026シーズンの開幕戦。新加入の1年生も含めた新体制での初陣となりました。",
    link: "https://www.instagram.com/p/DXjOq2Rjk4_/"
  },
  {
    tag: "info",
    date: "2026.04.07",
    title: "GKコーチ就任のお知らせ",
    text: "ゴールキーパー強化のため、新たにGKコーチを迎えました。指導体制がさらに充実します。",
    link: "https://www.instagram.com/p/DW0AsXQiZZN/"
  },
  {
    tag: "recruit",
    date: "2026.04.06",
    title: "学生スタッフ・マネージャー募集",
    text: "選手だけでなく、マネージャーや運営スタッフとして関わりたい新入生も募集しています。",
    link: "https://www.instagram.com/p/DWyYt8tCeIF/"
  }
];


/* -------------------------------------------------------------------------
   4. 試合日程・結果（SCHEDULEセクション）
   ※Googleフォーム連携（siteData.scheduleSheetUrl）を設定している場合は、
     このデータの代わりにスプレッドシートの内容が表示されます。
     未設定、または読み込みに失敗した場合の「保険」としてこのデータが使われます。

   ※年度は date（日付）から自動で計算されるので、season の項目は不要です
     （4月1日～翌年3月31日を1年度として、自動的に今年度分だけ表示されます）
   homeAway:    "HOME" または "AWAY"（省略可。省略時はバッジ非表示）
   kickoffTime: キックオフ時刻。例: "14:00"（省略可）
   venue:       試合会場。例: "野市陸上"（省略可）
   result: { type: "link",    url: "...", label: "SNSで確認する" }
        または { type: "score", text: "3-1 勝",  win: true  }   ※勝ち
        または { type: "score", text: "0-2 負",  win: false }   ※負け
        または { type: "score", text: "1-1 分け", win: null  }  ※引き分け
        または { type: "pending", text: "勝敗未定" }
   ------------------------------------------------------------------------- */
const scheduleData = [
  {
    date: "2026.04.25",
    competition: "SUL2 第1節",
    opponent: "高知工科大学",
    homeAway: "AWAY",
    kickoffTime: "14:00",
    venue: "野市陸上",
    result: { type: "link", url: "https://www.instagram.com/p/DXjOq2Rjk4_/", label: "SNSで確認する" }
  },
  {
    date: "2026.05.02",
    competition: "SUL2 第2節",
    opponent: "香川大学",
    homeAway: "AWAY",
    kickoffTime: "11:30",
    venue: "生島M",
    result: { type: "link", url: "https://www.instagram.com/p/DX0-1WpgApD/", label: "SNSで確認する" }
  },
  {
    date: "2026.05.05",
    competition: "SUL2 第3節",
    opponent: "鳴門教育大学",
    homeAway: "HOME",
    kickoffTime: "18:00",
    venue: "TSV",
    result: { type: "link", url: "https://www.instagram.com/p/DX9VqNPGnOj/", label: "SNSで確認する" }
  },
  {
    date: "2026.05.09",
    competition: "SUL2 第4節",
    opponent: "徳島大学",
    homeAway: "AWAY",
    kickoffTime: "17:00",
    venue: "TSV",
    result: { type: "link", url: "https://www.instagram.com/p/DYHvnraGmpp/", label: "SNSで確認する" }
  },
  {
    date: "2026.05.18",
    competition: "練習試合",
    opponent: "四国学院大学",
    result: { type: "link", url: "https://www.instagram.com/reel/DYdjj3vJVxJ/", label: "SNSで確認する" }
  },
  {
    date: "後期日程",
    competition: "SUL2 / 総理大臣杯 / 新人戦",
    opponent: "調整中",
    result: { type: "pending", text: "勝敗未定" }
  }
  // 例：スコアが分かったら下の形でコピペして追加・置き換え
  // {
  //   date: "2026.06.01",
  //   competition: "SUL2 第5節",
  //   opponent: "○○大学",
  //   result: { type: "score", text: "3-1 勝", win: true }
  // }
];


/* -------------------------------------------------------------------------
   5. 監督・コーチのコメント（MEMBERSセクション上部）
   photo: 顔写真を使いたい場合は画像パスを入れる（例: "images/staff-kaneko.jpg"）

   ※スプレッドシートで管理することもできます（Googleフォームは使いません）。
     sheetsSyncConfig.staffCsvUrl を設定すると、このデータの代わりに
     スプレッドシートの内容が使われます（未設定・失敗時はこのデータのまま）。

     【設定手順】
     ① 新しくGoogleスプレッドシートを作る（フォームは作らない）
     ② 1行目に自由に「記入例」を書く（自動的に読み飛ばされ、サイトには使われません）
     ③ 2行目（見出し行）に「役職」「名前」「コメント」「写真ファイル名」と入力する
     ④ 3行目から、監督・コーチ1人につき1行ずつ入力する
     ⑤ 「ファイル」→「共有」→「ウェブに公開」→ 形式を「カンマ区切りの値(.csv)」にして公開
     ⑥ 表示されたURLを sheetsSyncConfig.staffCsvUrl に貼る
     ※列名は完全一致でなくてOK。「役職」「名前」「コメント」「写真」という
       文字さえ含まれていれば認識されます
     ※「写真ファイル名」は images/ を省略してOK（"kaneko.jpg" だけで
       自動的に "images/kaneko.jpg" として扱われます）
   ------------------------------------------------------------------------- */
const staffData = [
  { role: "監督",        name: "金子 憲一", comment: "審判・運営・マネージャーなど、サッカーに関わりたい人なら誰でも歓迎する方針でチームを率いています。", photo: "images/kaneko.jpg" },
  { role: "コーチ",      name: "池田 隼",   comment: "技術と戦術の両面から選手一人ひとりの成長をサポートします。", photo: "images/ikeda.jpg" },
  { role: "GK学生コーチ", name: "小泉 洋翔", comment: "2026年に就任。ゴールキーパー陣の強化を担当しています。", photo: "images/koizumi.jpg" }
];


/* -------------------------------------------------------------------------
   6. 選手・スタッフ紹介（MEMBERSセクション）
   grade: フィルターボタンと連動する値。"4年" "3年" "2年" "1年" "スタッフ" など
   role: カードに表示する2行目（選手は学年、スタッフは役職などを入れる）
   sub:  カードに表示する3行目（出身校など。不要なら "" のままでOK）
   isStaff: true にすると選手写真の背景色が変わります
   photo: 顔写真を使いたい場合はここに画像パスを入れる（例: "images/player-01.jpg"）
          入れなければ今まで通り initial の文字が丸背景で表示されます

   ※スプレッドシートで管理することもできます（Googleフォームは使いません）。
     sheetsSyncConfig.playersCsvUrl を設定すると、このデータの代わりに
     スプレッドシートの内容が使われます（未設定・失敗時はこのデータのまま）。
     スプレッドシート側で入力した順番に関係なく、サイトには必ず
     「4年生→3年生→2年生→1年生→スタッフ」の順番で表示されます。

     【設定手順】
     ① 新しくGoogleスプレッドシートを作る（フォームは作らない）
     ② 1行目に自由に「記入例」を書く（自動的に読み飛ばされ、サイトには使われません）
     ③ 2行目（見出し行）に「名前」「学年」「出身校」「マネージャーですか」
        「写真ファイル名」の5つを入力する
     ④ 3行目から、選手・マネージャー1人につき1行ずつ入力する
     ⑤ 「ファイル」→「共有」→「ウェブに公開」→ 形式を「カンマ区切りの値(.csv)」にして公開
     ⑥ 表示されたURLを sheetsSyncConfig.playersCsvUrl に貼る

     【各列の入力ルール】
     ・名前：そのまま入力。イニシャル（丸背景に出る1文字）は名前の1文字目が自動で使われます
     ・学年：「1」「2」「3」「4」の数字だけでOK（「1年」のように書いてもOK）。
       自動的に「1年生」のような表示に変換されます
     ・出身校：「〇〇高校」のように学校名だけ入力。表示の際に自動で
       頭に「出身：」が付きます
     ・マネージャーですか：選手には空欄のままでOK。マネージャーなど
       選手以外の人だけ「はい」と入れてください。「はい」にした行は、
       その行の学年・出身校の入力があっても無視され、
       「マネージャー」という表示に統一されます
     ・写真ファイル名：images/ は省略してOK。"kaneko.jpg" と入力するだけで
       自動的に "images/kaneko.jpg" として扱われます（空欄でもOK）
     ※列名は完全一致でなくてOK。「名前」「学年」「出身」「マネージャー」「写真」
       という文字さえ含まれていれば認識されます
   ------------------------------------------------------------------------- */
const playersData = [
  { name: "萩原 一貴", initial: "萩", grade: "4年", role: "4年生", sub: "出身：板野高校", photo: "images/ogiwara.jpg" },
  { name: "藤家 賢人", initial: "藤", grade: "4年", role: "4年生", sub: "出身：新田高校", photo: "images/hujiya.jpg" },

  { name: "小川 浬",   initial: "小", grade: "3年", role: "3年生", sub: "出身：小松島高校", photo: "images/ogawa-3.jpg" },
  { name: "奥本 修也", initial: "奥", grade: "3年", role: "3年生", sub: "出身：川島高校", photo: "images/okumoto.jpg" },
  { name: "竹中 世成", initial: "竹", grade: "3年", role: "3年生", sub: "出身：徳島商業高校", photo: "images/takenaka-3.jpg" },
  { name: "中西 拓海", initial: "中", grade: "3年", role: "3年生", sub: "出身：坂出商業高校", photo: "images/nakanishi.jpg" },
  { name: "三好 龍之介", initial: "三", grade: "3年", role: "3年生", sub: "出身：徳島商業高校", photo: "images/miyoshi.jpg" },

  { name: "井上 賢太朗", initial: "井", grade: "1年", role: "1年生", sub: "出身：今治東中等教育学校", photo: "images/inoue.jpg" },
  { name: "小川 龍輝", initial: "小", grade: "1年", role: "1年生", sub: "出身：高知中央高校", photo: "images/ogawa.jpg" },
  { name: "岸 琉輝",   initial: "岸", grade: "1年", role: "1年生", sub: "出身：新田高校", photo: "images/kishi.jpg" },
  { name: "河野 結仁", initial: "河", grade: "1年", role: "1年生", sub: "出身：今治東中等教育学校", photo: "images/kawano.jpg" },
  { name: "酒井 勇輝", initial: "酒", grade: "1年", role: "1年生", sub: "出身：益田東高校", photo: "images/sakai.jpg" },
  { name: "笹村 時空", initial: "笹", grade: "1年", role: "1年生", sub: "出身：中村高校", photo: "images/sasamura.jpg" },
  { name: "鈴木 大夢", initial: "鈴", grade: "1年", role: "1年生", sub: "出身：今治東中等教育学校", photo: "images/suzuki.jpg" },
  { name: "竹中 琉歌", initial: "竹", grade: "1年", role: "1年生", sub: "出身：相生学院高校", photo: "images/takenaka.jpg" },
  { name: "中野 時哉", initial: "中", grade: "1年", role: "1年生", sub: "出身：鹿児島実業高校", photo: "images/nakano.jpg" },
  { name: "西山 愛輝", initial: "西", grade: "1年", role: "1年生", sub: "出身：明徳義塾高校", photo: "images/nishiyama.jpg" },
  { name: "福田 大喜", initial: "福", grade: "1年", role: "1年生", sub: "出身：徳島科学技術高校", photo: "images/hukuda.jpg" },
  { name: "二塚 結人", initial: "二", grade: "1年", role: "1年生", sub: "出身：高松東高校", photo: "images/niduka.jpg" },
  { name: "松尾 瑞希", initial: "松", grade: "1年", role: "1年生", sub: "出身：高松北高校" },
  // ↑ 松尾選手は現時点で写真データが無いため未設定です（届き次第 photo を追加してください）

  // マネージャー4名：現時点で写真データが届いていないため photo は未設定です
  { name: "高橋 夏希", initial: "高", grade: "スタッフ", role: "マネージャー", sub: "", isStaff: true },
  { name: "奥本 涼葉", initial: "奥", grade: "スタッフ", role: "マネージャー", sub: "", isStaff: true },
  { name: "数藤 夢皆", initial: "数", grade: "スタッフ", role: "マネージャー", sub: "", isStaff: true },
  { name: "野上 一花", initial: "野", grade: "スタッフ", role: "マネージャー", sub: "", isStaff: true }
];


/* -------------------------------------------------------------------------
   7. 新入生向けよくある質問（FAQセクション）
   answerHtml は少しだけHTMLが使えます（リンクを入れたい場合など）。
   例）'Instagram（<a href="...">@bunri.uni</a>）のDMへ'

   ※スプレッドシートで管理することもできます（Googleフォームは使いません）。
     sheetsSyncConfig.faqCsvUrl を設定すると、このデータの代わりに
     スプレッドシートの内容が使われます（未設定・失敗時はこのデータのまま）。

     【設定手順】
     ① 新しくGoogleスプレッドシートを作る（フォームは作らない）
     ② 1行目に自由に「記入例」を書く（自動的に読み飛ばされ、サイトには使われません）
     ③ 2行目（見出し行）に「質問」「回答」「URL(あれば)」の3つを入力する
     ④ 3行目から、Q&A1件につき1行ずつ入力する
     ⑤ 「ファイル」→「共有」→「ウェブに公開」→ 形式を「カンマ区切りの値(.csv)」にして公開
     ⑥ 表示されたURLを sheetsSyncConfig.faqCsvUrl に貼る
     ※列名は完全一致でなくてOK。「質問」「回答」「URL」（または「リンク」）
       という文字さえ含まれていれば認識されます
     ※「URL」に入力があると、回答の下に「詳しく見る→」というリンクが
       自動的に表示されます（空欄ならリンクは表示されません）
     ※スプレッドシート経由の場合、回答欄にHTMLタグは使えません（文章のみ）
   ------------------------------------------------------------------------- */
const faqData = [
  {
    q: "サッカー未経験でも入部できますか？",
    a: "可能です。基礎から取り組める環境を用意しているので、大学からサッカーを始めたいという方も歓迎します。まずは体験練習で雰囲気を見てみてください。"
  },
  {
    q: "マネージャーや運営スタッフとしても参加できますか？",
    a: "はい、大歓迎です。選手としてプレーする以外にも、マネージャー・運営・審判に興味のある方を積極的に募集しています。実際にチームには複数名のマネージャーが在籍し、日々の活動を支えています。"
  },
  {
    q: "見学や体験練習に参加するにはどうすればいいですか？",
    aHtml: '活動日であればいつでも見学可能です。公式Instagram（<a href="{instagramUrl}" target="_blank" rel="noopener">{instagramHandle}</a>）のDMでご連絡いただくか、活動日に直接グラウンドへお越しいただいても大丈夫です。'
  },
  {
    q: "活動日や活動場所を教えてください。",
    aHtml: '徳島文理大学の人工芝グラウンドを拠点に活動しています。活動日時は時期によって変動するため、直近のスケジュールは公式Instagram（<a href="{instagramUrl}" target="_blank" rel="noopener">{instagramHandle}</a>）でご確認ください。'
  },
  {
    q: "県外出身でも入部できますか？",
    a: "もちろんです。現在の部員も愛媛・高知・香川・島根・鹿児島など県外出身者が多数在籍しており、出身地を問わず活躍できるチームです。"
  },
  {
    q: "スポーツ特待生入試について教えてください。",
    aHtml: '徳島文理大学にはスポーツ特待生入試の制度があります。サッカー部としての詳しい条件や相談は、{adviserName}までご連絡ください。'
  }
];


/* -------------------------------------------------------------------------
   8. ご支援いただいている企業様（SPONSORSセクション）
   name:        カードに表示する正式企業名
   shortName:   ロゴ代わりに表示する短い表記（ダミーのテキストロゴ）
   address:     所在地
   description: 事業内容の紹介文
   url:         企業様サイトへのリンク
   imageUrl:    実際のロゴ画像を使いたい場合はここに画像パスを入れる
                （例："images/sponsor-sbm.png"）入れれば自動でテキストから画像表示に切り替わります

   ※スプレッドシートで管理することもできます（Googleフォームは使いません）。
     sheetsSyncConfig.sponsorsCsvUrl を設定すると、このデータの代わりに
     スプレッドシートの内容が使われます（未設定・失敗時はこのデータのまま）。

     【設定手順】
     ① 新しくGoogleスプレッドシートを作る（フォームは作らない）
     ② 1行目に自由に「記入例」を書く（自動的に読み飛ばされ、サイトには使われません）
     ③ 2行目（見出し行）に「表示する名前」「住所」「事業内容」「URL」
        「ロゴ画像ファイル名」の5つを入力する
     ④ 3行目から、企業様1社につき1行ずつ入力する
     ⑤ 「ファイル」→「共有」→「ウェブに公開」→ 形式を「カンマ区切りの値(.csv)」にして公開
     ⑥ 表示されたURLを sheetsSyncConfig.sponsorsCsvUrl に貼る
     ※列名は完全一致でなくてOK。「名前」「住所」「事業内容」「URL」に加えて、
       「ロゴ」または「写真」という文字が含まれていれば認識されます
     ※「ロゴ画像ファイル名」（「写真ファイル名」でもOK）は images/ を省略してOK
       （"sponsor-a.jpg" だけで自動的に "images/sponsor-a.jpg" として扱われます。
       空欄なら「表示する名前」がテキストロゴとして表示されます）
   ------------------------------------------------------------------------- */
const sponsorsData = [
  {
    name: "総合ビル・メンテム株式会社",
    shortName: "総合ビル・メンテム",
    address: "〒770-0923　徳島県徳島市大道2-28",
    description: "清掃管理・設備管理・保安警備業務を中心に、ホテルやマンションの総合管理、ホームメンテナンスまで幅広く地域を支える企業様です。",
    url: "https://www.sbm-inc.co.jp/",
    imageUrl: "images/sponsor-mentemu.jpg"
  },
  {
    name: "御所たらい観光株式会社",
    shortName: "Gosho Kanko",
    address: "〒771-1622　徳島県阿波市市場町香崎字北分338-2",
    description: "1980年の設立以来、阿波市内観光や徳島・四国周遊の貸切バス旅行を通じて、地域の魅力を届ける企業様です。",
    url: "https://www.gosyokanko.co.jp/",
    imageUrl: "images/sponsor-gosho.jpg"
  },
  {
    name: "Auto Crew BAMB（オートクルーバンブ）",
    shortName: "BAMB",
    address: "〒770-8070　徳島県徳島市八万町寺山236-1",
    description: "各種新車・中古車・バイクの販売に加え、一般整備・車検・板金・カー用品販売、レンタカー事業など幅広く展開し、顧客のカーライフを総合的に支援している企業様です。",
    url: "https://www.bamb.jp/",
    imageUrl: "images/sponsor-bamb.jpg"
  },
  {
    name: "東武トップツアーズ株式会社",
    shortName: "東武トップツアーズ",
    address: "東京都墨田区押上一丁目1番2号　東京スカイツリーイーストタワー",
    description: "国内外の旅行企画・販売をはじめ、法人向けの出張手配や各種イベントの企画・運営、地域活性化に関わる事業などを幅広く展開し、多様なニーズに応える総合旅行会社の企業様です。",
    url: "https://www.tobutoptours.co.jp/company/outline/",
    imageUrl: "images/sponsor-toubu.jpg"
  },
  {
    name: "株式会社亀井組",
    shortName: "Kamei",
    address: "徳島県鳴門市撫養町立岩字七校114番地",
    description: "土木・建築工事をはじめ、公共・民間工事を幅広く展開し、地域に根ざしたインフラ整備やまちづくりに貢献している建設会社の企業様です。",
    url: "https://www.kamei93.co.jp/",
    imageUrl: "images/sponsor-kamei.jpg"
  },
  {
    name: "株式会社日産サティオ徳島",
    shortName: "日産サティオ徳島",
    address: "〒771-1151　徳島県徳島市応神町古川日ノ上8",
    description: "日産車の新車・中古車販売をはじめ、車検・整備などのアフターサービスや自動車保険の提案などを行い、地域の顧客のカーライフを総合的にサポートしている自動車販売会社の企業様です。",
    url: "https://ns-tokushima.nissan-dealer.jp/",
    imageUrl: "images/sponsor-nissan.jpg"
  }
];


/* -------------------------------------------------------------------------
   9. 企業様向けご支援案内（SPONSORSセクション下部）
   title: カードの見出し
   lead:  見出し直下の説明文
   items: 箇条書きにする項目（配列）
   image: 案内文書の写真を貼りたい場合はここに画像パスを入れる

   ※スプレッドシートで管理することもできます（Googleフォームは使いません）。
     sheetsSyncConfig.supportCsvUrl を設定すると、このデータの代わりに
     スプレッドシートの内容が使われます（未設定・失敗時はこのデータのまま）。

     【設定手順】
     ① 新しくGoogleスプレッドシートを作る（フォームは作らない）
     ② 1行目に自由に「記入例」を書く（自動的に読み飛ばされ、サイトには使われません）
     ③ 2行目（見出し行）に「見出し」「説明」「箇条書きで表示したい項目」
        「写真ファイル名」の4つを入力する
     ④ 3行目から、案内カード1枚につき1行ずつ入力する
        「箇条書きで表示したい項目」のセルの中で、Alt+Enter（Macは⌥+Enter）を
        押すと1つのセルの中で改行できます。改行した行ごとに、それぞれ別の
        箇条書きとして表示されます。例えば1つのセルの中に

          掲載媒体：練習用ウェア（練習や公式戦ウォーミングアップ時に使用）
          契約期間：2026年4月1日～2027年3月31日
          体裁：①35×15cm（30,000円）／②15×15cm（20,000円）／③10×5cm（10,000円）
          広告仕様：デザインはお申し込み後に相談
          協賛費使用目的：年間活動費（県外への公式戦・遠征貸切バス代、必要備品購入等）

        のように改行しながら入力すると、5つの箇条書きとして表示されます
     ⑤ 「ファイル」→「共有」→「ウェブに公開」→ 形式を「カンマ区切りの値(.csv)」にして公開
     ⑥ 表示されたURLを sheetsSyncConfig.supportCsvUrl に貼る
     ※列名は完全一致でなくてOK。「見出し」「説明」「項目」、「画像」または
       「写真」という文字さえ含まれていれば認識されます
     ※「画像ファイル名」は images/ を省略してOK（"uniform-ad.jpg" だけで
       自動的に "images/uniform-ad.jpg" として扱われます）
   ------------------------------------------------------------------------- */
const supportData = [
  {
    title: "1. 練習着広告協賛企業様募集",
    lead: "サッカー部の練習用ウェアに、企業様の広告を掲載いただけます。",
    items: [
      "掲載媒体：練習用ウェア（練習や公式戦ウォーミングアップ時に使用）",
      "契約期間：2026年4月1日～2027年3月31日",
      "体裁：①35×15cm（30,000円）／②15×15cm（20,000円）／③10×5cm（10,000円）",
      "広告仕様：デザインはお申し込み後に相談",
      "協賛費使用目的：年間活動費（県外への公式戦・遠征貸切バス代、必要備品購入等）"
    ],
    image: "images/support-uniform-ad.jpg"
  },
  {
    title: "2. 寄付金ご協力企業様募集",
    lead: "徳島文理大学男子サッカー部 寄付金趣意書",
    items: [
      "名称：徳島文理大学男子サッカー部",
      "目的：年間活動費（県外への公式戦や遠征時の貸切バス代、チームで必要な備品の購入等）",
      "契約期間：令和8年4月1日～令和9年3月31日",
      "寄付金の種類：受配者指定寄付金制度（法人対象）利用"
    ],
    image: "images/support-donation.jpg"
  }
];
