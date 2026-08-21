/* =========================================================================
   部員紹介ページ（members.html）専用のスクリプト
   ・ホーム（index.html）の「監督・コーチのコメント」「選手・スタッフ一覧」
     と全く同じ中身を、このページ用のID（page◯◯）に流し込む
   ・学年フィルター、「その他」シートの補足カード（membersExtras相当）も
     ホームと同じ仕組みで用意している
   ========================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  // ホーム（script.js）と同じく、Googleスプレッドシート連携があれば読み込む
  // （script.js側でも同じ読み込みを行っているが、Promiseは1回目の結果を
  //   使い回すだけなので二重に通信が走ることはない）
  if (typeof window.loadSheetsData === 'function') {
    await window.loadSheetsData();
  }

  // escapeHtml / renderNoteContent は common.js を使う

  const cfg = (typeof sheetsSyncConfig !== 'undefined') ? sheetsSyncConfig : {};
  const settings = window.__syncedSettings || {};

  /* --- 監督・コーチのコメント --- */
  const staffComments = document.getElementById('pageStaffComments');
  const effectiveStaffData = window.__syncedStaffData || (typeof staffData !== 'undefined' ? staffData : []);
  if (staffComments) {
    staffComments.innerHTML = effectiveStaffData.map((s) => `
      <blockquote class="comment-card">
        ${s.photo ? `<img src="${escapeHtml(s.photo)}" alt="${escapeHtml(s.name)}" class="comment-avatar" loading="lazy">` : ''}
        <p class="comment-role">${escapeHtml(s.role)}</p>
        <p class="comment-name">${escapeHtml(s.name)}</p>
        <p class="comment-text">${escapeHtml(s.comment)}</p>
      </blockquote>
    `).join('');
  }
  const staffSyncWarning = document.getElementById('pageStaffSyncWarning');
  if (staffSyncWarning) staffSyncWarning.hidden = !(window.__staffSyncFailed && cfg.staffCsvUrl);

  /* --- 選手・スタッフ一覧 --- */
  const playerGrid = document.getElementById('pagePlayerGrid');
  const filterEmpty = document.getElementById('pageFilterEmpty');
  const rawPlayersData = window.__syncedPlayersData || (typeof playersData !== 'undefined' ? playersData : []);
  const effectivePlayersData = sortByGrade(rawPlayersData); // common.js
  if (playerGrid) {
    playerGrid.innerHTML = effectivePlayersData.map((p) => `
      <article class="player-card${p.isStaff ? ' player-card--staff' : ''}" data-filter-key="${escapeHtml(p.isStaff ? p.role : p.grade)}">
        <div class="player-photo">
          ${p.photo
            ? `<img src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name)}" class="player-photo-img" loading="lazy">`
            : `<span class="player-initial">${escapeHtml(p.initial)}</span>`}
        </div>
        <h3 class="player-name">${escapeHtml(p.name)}</h3>
        <p class="player-meta">${escapeHtml(p.role)}</p>
        ${p.sub ? `<p class="player-quote">${escapeHtml(p.sub)}</p>` : ''}
      </article>
    `).join('');
  }
  const playersSyncWarning = document.getElementById('pagePlayersSyncWarning');
  if (playersSyncWarning) playersSyncWarning.hidden = !(window.__playersSyncFailed && cfg.playersCsvUrl);

  /* --- 「その他」シートの補足カード（Membersの「◯◯」） --- */
  const membersExtras = document.getElementById('pageMembersExtras');
  if (membersExtras) {
    const extras = (settings.sectionExtras && settings.sectionExtras.members) || {};
    const labels = Object.keys(extras);
    membersExtras.innerHTML = labels.map((label) => {
      const item = extras[label];
      return `
        <div class="fact-card">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(item.value)}${item.note ? `<br><span class="fact-note">${renderNoteContent(item.note)}</span>` : ''}</dd>
        </div>
      `;
    }).join('');
  }

  /* --- 学年フィルター ＋ キーワード検索（名前・出身校など） --- */
  const filterBar = document.getElementById('filterBar');

  // スタッフの役職ボタンは、スプレッドシートの「役職」列に入力された文字ごとに
  // 自動生成する（初めて出てきた順番でボタンが並ぶ）
  if (filterBar) {
    const staffRoles = [];
    rawPlayersData.forEach((p) => {
      if (p.isStaff && p.role && !staffRoles.includes(p.role)) staffRoles.push(p.role);
    });
    filterBar.insertAdjacentHTML('beforeend', staffRoles.map((role) =>
      `<button class="filter-btn" data-filter="${escapeHtml(role)}">${escapeHtml(role)}</button>`
    ).join(''));
  }

  const cards = document.querySelectorAll('#pagePlayerGrid .player-card');
  const searchInput = document.getElementById('membersSearchInput');

  const applyFilters = () => {
    const activeBtn = filterBar ? filterBar.querySelector('.filter-btn.is-active') : null;
    const target = activeBtn ? activeBtn.dataset.filter : 'all';
    const query = (searchInput?.value || '').trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesGrade = target === 'all' || card.dataset.filterKey === target;
      // 名前・学年・出身校など、カードに表示されている全文字から検索する
      const matchesSearch = !query || card.textContent.toLowerCase().includes(query);
      const matches = matchesGrade && matchesSearch;
      card.classList.toggle('is-hidden', !matches);
      if (matches) visibleCount += 1;
    });

    if (filterEmpty) filterEmpty.hidden = visibleCount !== 0;
  };

  // ボタンは動的に増えるため、フィルターバー全体へのイベント委譲で処理する
  if (filterBar) {
    filterBar.addEventListener('click', (event) => {
      const btn = event.target.closest('.filter-btn');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilters();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
});
