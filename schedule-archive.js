/* =========================================================================
   試合日程・結果ページ（schedule.html）専用のスクリプト
   ・ホーム（index.html）の試合日程テーブルと同じ .scoreboard デザインを流用して、
     件数の上限なしに全件・日付順（1月→12月）で表示する
   ・大会名・対戦相手・会場のキーワード検索つき
   ・「今日」以降で最初に来る試合の行だけ、上の罫線を目立たせるのはホームと同じ
   ========================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  // ホーム（script.js）と同じく、Googleスプレッドシート連携があれば読み込む
  // （script.js側でも同じ読み込みを行っているが、Promiseは1回目の結果を
  //   使い回すだけなので二重に通信が走ることはない）
  if (typeof window.loadSheetsData === 'function') {
    await window.loadSheetsData();
  }

  const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  // 「補足」欄にURLだけが入力されていたら、クリックできるリンクに変換する（script.jsと同じロジック）
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

  // "2026.04.25"（年が先）と "4/25/2026"（Googleフォームの日付質問が
  // 月-日-年の順で出力する場合）のどちらでも読み取れるようにする（script.jsと同じロジック）
  const parseDateValue = (str) => {
    const s = String(str || '').trim();
    let m = s.match(/(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})/); // 年が先
    if (m) return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
    m = s.match(/(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})/); // 月/日/年の順
    if (m) return Number(m[3]) * 10000 + Number(m[1]) * 100 + Number(m[2]);
    return null;
  };

  // 「今年度」の判定（script.jsと同じロジック：4月1日～翌年3月31日を1年度とする）
  const cfg = (typeof sheetsSyncConfig !== 'undefined') ? sheetsSyncConfig : {};
  const deriveSeason = (dateStr) => {
    const v = parseDateValue(dateStr);
    if (v === null) return null;
    const year = Math.floor(v / 10000);
    const month = Math.floor((v % 10000) / 100);
    return month >= 4 ? String(year) : String(year - 1);
  };
  const now = new Date();
  const autoSeason = String(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
  const currentSeason = cfg.currentSeason || autoSeason;

  const body = document.getElementById('archiveScheduleBody');
  const empty = document.getElementById('archiveScheduleEmpty');
  if (!body) return;

  const scheduleSyncWarning = document.getElementById('scheduleSyncWarning');
  if (scheduleSyncWarning) scheduleSyncWarning.hidden = !(window.__scheduleSyncFailed && cfg.scheduleCsvUrl);

  const rawScheduleData = window.__syncedScheduleData || (typeof scheduleData !== 'undefined' ? scheduleData : []);
  const allSchedule = rawScheduleData
    .filter((s) => { const season = deriveSeason(s.date); return !season || season === currentSeason; })
    .sort((a, b) => (parseDateValue(a.date) ?? Infinity) - (parseDateValue(b.date) ?? Infinity)); // 1月→12月の順（日付不明は最後）

  if (allSchedule.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }

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

  // HOME/AWAYバッジ、キックオフ時刻・会場を対戦相手のセルにまとめて表示する（script.jsと同じ）
  const renderOpponent = (row) => {
    const haClass = row.homeAway === 'HOME' ? 'ha-home' : row.homeAway === 'AWAY' ? 'ha-away' : '';
    const haBadge = row.homeAway ? `<span class="ha-badge ${haClass}">${escapeHtml(row.homeAway)}</span>` : '';
    const subParts = [];
    const timeMatch = String(row.kickoffTime || '').match(/^\d{1,2}:\d{2}/);
    const kickoffShort = timeMatch ? timeMatch[0] : row.kickoffTime;
    if (kickoffShort) subParts.push(`${escapeHtml(kickoffShort)} KICK OFF`);
    if (row.venue) subParts.push(escapeHtml(row.venue));
    const sub = subParts.length ? `<span class="opponent-sub">${subParts.join(' ・ ')}</span>` : '';
    return `${haBadge}<span class="opponent-name">${escapeHtml(row.opponent)}</span>${sub}`;
  };

  // 今日以降で最初に来る試合の行を探す（そこの上の罫線だけ目立たせる。ホームと同じ）
  const todayValue = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  let dividerIndex = -1;
  for (let i = 0; i < allSchedule.length; i++) {
    const v = parseDateValue(allSchedule[i].date);
    if (v !== null && v >= todayValue) { dividerIndex = i; break; }
  }

  body.innerHTML = allSchedule.map((row, i) => `
    <div class="scoreboard-row${i === dividerIndex && dividerIndex > 0 ? ' scoreboard-row--today' : ''}" role="row">
      <span role="cell" data-label="日付">${escapeHtml(row.date)}</span>
      <span role="cell" data-label="大会">${escapeHtml(row.competition)}</span>
      <span role="cell" data-label="対戦相手" class="opponent-cell">${renderOpponent(row)}</span>
      <span role="cell" data-label="結果">${renderResult(row.result)}</span>
    </div>
  `).join('');

  /* --- 「その他」シートの補足カード（Scheduleの「◯◯」） --- */
  const settings = window.__syncedSettings || {};
  const scheduleExtras = document.getElementById('pageScheduleExtras');
  if (scheduleExtras) {
    const extras = (settings.sectionExtras && settings.sectionExtras.schedule) || {};
    const labels = Object.keys(extras);
    scheduleExtras.innerHTML = labels.map((label) => {
      const item = extras[label];
      return `
        <div class="fact-card">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(item.value)}${item.note ? `<br><span class="fact-note">${renderNoteContent(item.note)}</span>` : ''}</dd>
        </div>
      `;
    }).join('');
  }

  /* --- キーワード検索（大会名・対戦相手・会場など、カードに表示されている全文字から） --- */
  const cards = body.querySelectorAll('.scoreboard-row');
  const searchInput = document.getElementById('scheduleSearchInput');

  const applyFilters = () => {
    const query = (searchInput?.value || '').trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const matches = !query || card.textContent.toLowerCase().includes(query);
      card.classList.toggle('is-hidden', !matches);
      if (matches) visibleCount += 1;
    });

    if (empty) empty.hidden = visibleCount !== 0;
  };

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
});
