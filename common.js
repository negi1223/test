/* =========================================================================
   全ページ共通の小さな関数集
   （script.js / news-archive.js / members-archive.js / schedule-archive.js
    で同じ処理が必要になる部分を、ここに1つだけ置いています）
   ========================================================================= */

// HTMLに埋め込む前に、危険な文字（<script>タグなど）を無害な表記に変換する
const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

// 「補足」欄にURLだけが入力されていたら、テキストのまま出さずにクリックできる
// リンクに変換する。Googleマップのリンクだと分かる場合は「Googleマップで見る →」、
// それ以外のURLは「詳しく見る →」というボタン文字にする
const renderNoteContent = (note) => {
  const trimmed = String(note || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    const isMapUrl = /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(trimmed);
    const label = isMapUrl ? 'Googleマップで見る →' : '詳しく見る →';
    return `<a href="${escapeHtml(trimmed)}" target="_blank" rel="noopener">${label}</a>`;
  }
  return escapeHtml(trimmed);
};

// "2026.06.01" "2026/6/1" "2026-06-01"（年が先）と
// "6/1/2026"（Googleフォームの日付質問が月-日-年の順で出力する場合）の
// どちらの並びでも読み取れるようにする。"後期日程" のような日付以外の文字列は null を返す
const extractYMD = (str) => {
  const s = String(str || '').trim();
  let m = s.match(/(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})/); // 年が先
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  m = s.match(/(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})/); // 月/日/年の順
  if (m) return { y: Number(m[3]), mo: Number(m[1]), d: Number(m[2]) };
  return null;
};
const parseDateValue = (str) => {
  const ymd = extractYMD(str);
  return ymd ? ymd.y * 10000 + ymd.mo * 100 + ymd.d : null;
};

// 日付から「年度」を自動計算する（4月1日～翌年3月31日を1年度とする学校年度のルール）
const deriveSeason = (str) => {
  const ymd = extractYMD(str);
  if (!ymd) return '';
  return String(ymd.mo >= 4 ? ymd.y : ymd.y - 1);
};

// ニュース1件ごとの「日付＋タイトル」から、ページをまたいでも同じ値になる
// 識別子（slug）を作る。news.html側の該当ニュースへリンクするために使う
const newsItemSlug = (item) => {
  const raw = `${item.date}__${item.title}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return 'n' + Math.abs(hash).toString(36);
};

// 入力された順番がバラバラでも、学年順（4年→3年→2年→1年→スタッフ）に並べる。
// 同じ学年の中の並び順は、スプレッドシート（またはdata.js）に入力された順番がそのまま使われる
const GRADE_ORDER = { '4年': 0, '3年': 1, '2年': 2, '1年': 3, 'スタッフ': 4 };
const sortByGrade = (list) =>
  [...list].sort((a, b) => (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99));

// 試合結果（勝敗未定／リンク／スコア）をバッジ表示用のHTMLに変換する
const renderResult = (result) => {
  if (result.type === 'link') {
    return `<a class="badge badge-link" href="${escapeHtml(result.url)}" target="_blank" rel="noopener">${escapeHtml(result.label)}</a>`;
  }
  if (result.type === 'score') {
    const badgeClass = result.win === true ? 'badge-win' : result.win === false ? 'badge-lose' : 'badge-draw';
    return `<span class="badge ${badgeClass}">${escapeHtml(result.text)}</span>`;
  }
  return `<span class="badge badge-pending">${escapeHtml(result.text)}</span>`;
};

// HOME/AWAYバッジ、キックオフ時刻・会場を対戦相手のセルにまとめて表示する
const renderOpponent = (row) => {
  const haClass = row.homeAway === 'HOME' ? 'ha-home' : row.homeAway === 'AWAY' ? 'ha-away' : '';
  const haBadge = row.homeAway ? `<span class="ha-badge ${haClass}">${escapeHtml(row.homeAway)}</span>` : '';
  const subParts = [];
  // Googleフォームの時刻質問は "14:00:00" のように秒まで出力するので、
  // "時:分" の部分だけを取り出して表示する（例："14:00"）
  const timeMatch = String(row.kickoffTime || '').match(/^\d{1,2}:\d{2}/);
  const kickoffShort = timeMatch ? timeMatch[0] : row.kickoffTime;
  if (kickoffShort) subParts.push(`${escapeHtml(kickoffShort)} KICK OFF`);
  if (row.venue) subParts.push(escapeHtml(row.venue));
  const sub = subParts.length ? `<span class="opponent-sub">${subParts.join(' ・ ')}</span>` : '';
  return `${haBadge}<span class="opponent-name">${escapeHtml(row.opponent)}</span>${sub}`;
};
