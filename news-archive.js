/* =========================================================================
   更新一覧ページ（news.html）専用のスクリプト
   ・ホームと同じ .news-card デザインを流用して、全件・新しい日付順に表示する
   ・ホームの「詳しく見る」はInstagramへのリンクだったが、
     このページでは「詳しく見る」がアコーディオンの開閉ボタンになる
   ・detail（詳しい内容）があればそれを、無ければ text（短い説明文）を表示する
   ・試合／お知らせ／募集で絞り込むフィルターボタンつき
   ========================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  // ホーム（script.js）と同じく、Googleスプレッドシート連携があれば読み込む
  if (typeof window.loadSheetsData === 'function') {
    await window.loadSheetsData();
  }

  const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  // "2026.06.01"（年が先）と "6/1/2026"（Googleフォームの日付質問が
  // 月-日-年の順で出力する場合）のどちらでも読み取れるようにする（script.jsと同じロジック）
  const parseDateValue = (str) => {
    const s = String(str || '').trim();
    let m = s.match(/(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})/); // 年が先
    if (m) return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
    m = s.match(/(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})/); // 月/日/年の順
    if (m) return Number(m[3]) * 10000 + Number(m[1]) * 100 + Number(m[2]);
    return null;
  };

  const list = document.getElementById('archiveList');
  const empty = document.getElementById('archiveEmpty');
  if (!list) return;

  // フォームを設定しているのに読み込みに失敗し、サンプルデータで代用している場合だけ、
  // 控えめな注意書きを表示する（フォーム未設定の場合は表示しない）
  const newsSyncWarning = document.getElementById('newsSyncWarning');
  const cfg = (typeof sheetsSyncConfig !== 'undefined') ? sheetsSyncConfig : {};
  if (newsSyncWarning) newsSyncWarning.hidden = !(window.__newsSyncFailed && cfg.newsCsvUrl);

  const newsTagLabel = { match: '試合', info: 'お知らせ', recruit: '募集' };

  const rawNewsData = window.__syncedNewsData || (typeof newsData !== 'undefined' ? newsData : []);
  // 更新一覧ページでは「固定」を上に集めたりはしない。全件をそのまま日付順に並べる。
  // pinned だった項目は「重要」バッジが付くだけで、並び順には影響しない
  const byNewestFirst = (a, b) => (parseDateValue(b.date) ?? -Infinity) - (parseDateValue(a.date) ?? -Infinity);
  const allNews = [...rawNewsData].sort(byNewestFirst);

  if (allNews.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }

  // --- カードを描画（ホームの .news-card と同じ構造＋開閉ボタン＋詳細パネル） ---
  list.innerHTML = allNews.map((item, i) => {
    const detailId = `news-detail-${i}`;
    const toggleId = `news-toggle-${i}`;
    // 「詳しい内容」が未入力の場合は、ホームと同じ短い説明文をそのまま表示する
    const detail = item.detail || item.text || '';
    return `
      <article class="news-card" data-tag="${escapeHtml(item.tag)}" data-pinned="${item.pinned ? 'true' : 'false'}">
        <span class="news-tag-group">
          <span class="news-tag news-tag--${escapeHtml(item.tag)}">${escapeHtml(newsTagLabel[item.tag] || 'お知らせ')}</span>
          ${item.pinned ? '<span class="news-tag-pinned">重要</span>' : ''}
        </span>
        <time class="news-date">${escapeHtml(item.date)}</time>
        <h3 class="news-title">${escapeHtml(item.title)}</h3>
        <p class="news-text">${escapeHtml(item.text)}</p>
        <button class="news-more" type="button" aria-expanded="false" aria-controls="${detailId}" id="${toggleId}">詳しく見る</button>
        <div class="news-detail" id="${detailId}" role="region" aria-labelledby="${toggleId}" hidden>
          <p>${escapeHtml(detail)}</p>
          ${item.link ? `<p><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">投稿を見る →</a></p>` : ''}
        </div>
      </article>
    `;
  }).join('');

  // --- 開閉ボタンの動き（FAQのアコーディオンと同じ仕組み） ---
  list.querySelectorAll('.news-more').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isExpanded));
      if (panel) panel.hidden = isExpanded;
    });
  });

  // --- カテゴリで絞り込むフィルターボタン（Membersの学年フィルターと同じ仕組み） ---
  const filterButtons = document.querySelectorAll('.filter-btn');
  const cards = list.querySelectorAll('.news-card');

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const target = btn.dataset.filter;
      let visibleCount = 0;

      cards.forEach((card) => {
        const matches = target === 'all'
          ? true
          : target === 'pinned'
            ? card.dataset.pinned === 'true'
            : card.dataset.tag === target;
        card.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount += 1;
      });

      if (empty) empty.hidden = visibleCount !== 0;
    });
  });
});
