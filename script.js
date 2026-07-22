document.addEventListener('DOMContentLoaded', async () => {

  /* =========================================================
     ページを「更新（リロード）」した時は、URLに #news などが
     残っていても必ず一番上から表示する。
     news.htmlの「トップページに戻る」リンクなど、通常のページ遷移で
     来た場合はそのまま該当セクションにジャンプする（今まで通り）
  ========================================================= */
  try {
    const navEntries = performance.getEntriesByType('navigation');
    const navType = navEntries.length ? navEntries[0].type : '';
    if (navType === 'reload' && window.location.hash) {
      window.scrollTo(0, 0);
    }
  } catch (e) { /* 古いブラウザでは何もしない */ }

  // Googleスプレッドシート連携（設定されていれば news / schedule を上書きする）
  // 通信中も他の初期化処理は止めず、ニュース・試合結果を描画する直前でだけ待つ
  const sheetsSyncPromise = (typeof window.loadSheetsData === 'function')
    ? window.loadSheetsData()
    : Promise.resolve();

  const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  /* =========================================================
     ロゴをクリックしたら一番上へスクロール
     （ヘッダーが sticky（常に上に張り付く）になっていると、
      #top への通常のアンカーリンクだけでは「もう見えているから」と
      判断されてスクロールされないことがあるため、JSで確実に動かす）
  ========================================================= */
  document.querySelectorAll('.logo').forEach((el) => {
    if (el.getAttribute('href') !== '#top') return; // 別ページへのリンク（例：news.html→index.html）はそのまま遷移させる
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* =========================================================
     モバイルナビゲーションの開閉
  ========================================================= */
  const navToggle = document.getElementById('navToggle');
  const primaryNav = document.getElementById('primaryNav');

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = primaryNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    });

    primaryNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        primaryNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'メニューを開く');
      });
    });
  }

  /* =========================================================
     0. サイト全体の設定（siteData）を反映
     ヘッダー／フッター／各所のSNSリンク・連絡先はここでまとめて反映されます
  ========================================================= */
  if (typeof siteData !== 'undefined') {
    document.querySelectorAll('.js-club-name-jp').forEach((el) => { el.textContent = siteData.clubNameJp; });
    document.querySelectorAll('.js-club-name-en').forEach((el) => { el.textContent = siteData.clubNameEn; });
    document.querySelectorAll('.js-logo-initial').forEach((el) => {
      if (siteData.logoImage) {
        el.innerHTML = `<img src="${escapeHtml(siteData.logoImage)}" alt="${escapeHtml(siteData.clubNameJp)}" class="logo-mark-img">`;
      } else {
        el.textContent = siteData.logoInitial;
      }
    });

    // Instagramへのリンク（ボタンやテキストリンクなど、サイト内の複数箇所に反映）
    document.querySelectorAll('.js-instagram-link').forEach((el) => { el.href = siteData.instagramUrl; });
    document.querySelectorAll('.js-instagram-handle').forEach((el) => { el.textContent = siteData.instagramHandle; });
    document.querySelectorAll('.js-x-link').forEach((el) => { el.href = siteData.xUrl; });

    // 企業様・スポンサー様向けメールアドレス
    document.querySelectorAll('.js-sponsor-email').forEach((el) => {
      el.href = `mailto:${siteData.sponsorEmail}`;
      el.textContent = siteData.sponsorEmail;
    });

    // Googleフォーム（企業様・スポンサー様向け）※埋め込みプレビューは廃止し、ボタンリンクのみ
    const gformButton = document.getElementById('gformButton');
    if (gformButton) gformButton.href = siteData.sponsorFormUrl;

    // フッター著作権表記
    const footerCopy = document.getElementById('footerCopy');
    if (footerCopy) footerCopy.textContent = `© ${siteData.copyrightYear} ${siteData.copyrightEn}`;
  }

  /* =========================================================
     1. トップビジュアル（heroData）
  ========================================================= */
  if (typeof heroData !== 'undefined') {
    const eyebrowEl = document.getElementById('heroEyebrow');
    if (eyebrowEl) eyebrowEl.textContent = heroData.eyebrow;

    const headlineEl = document.getElementById('heroHeadline');
    if (headlineEl) {
      headlineEl.innerHTML = `${escapeHtml(heroData.headline)}<br><span class="hero-copy-accent">${escapeHtml(heroData.headlineAccent)}</span>${escapeHtml(heroData.headlineSuffix)}`;
    }

    const subEl = document.getElementById('heroSub');
    if (subEl) subEl.textContent = heroData.sub;

    const statsEl = document.getElementById('heroStats');
    if (statsEl && heroData.stats) {
      statsEl.innerHTML = heroData.stats.map((s) => `
        <div><dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}<span>${escapeHtml(s.suffix || '')}</span></dd></div>
      `).join('');
    }

    const heroPhotoWrap = document.getElementById('heroPhoto');
    if (heroPhotoWrap && heroData.photo) {
      const img = document.createElement('img');
      img.src = heroData.photo;
      img.alt = heroData.photoAlt || '活動中の様子';
      img.className = 'hero-photo-img';
      img.onerror = () => img.remove(); // 画像が見つからない場合はダミー表示のまま
      heroPhotoWrap.prepend(img);
    }
  }

  /* =========================================================
     2. 部の紹介・練習日時（aboutData）
  ========================================================= */
  if (typeof aboutData !== 'undefined') {
    const sloganEl = document.getElementById('aboutSlogan');
    if (sloganEl) sloganEl.textContent = aboutData.slogan;

    const textEl = document.getElementById('aboutText');
    if (textEl) textEl.textContent = aboutData.text;

    const factsEl = document.getElementById('aboutFacts');
    if (factsEl && aboutData.facts) {
      factsEl.innerHTML = aboutData.facts.map((f) => `
        <div class="fact-card">
          <dt>${escapeHtml(f.label)}</dt>
          <dd>${escapeHtml(f.value)}${f.note ? `<br><span class="fact-note">${escapeHtml(f.note)}</span>` : ''}</dd>
        </div>
      `).join('');
    }

    const yearEl = document.getElementById('yearScheduleGrid');
    if (yearEl && aboutData.yearSchedule) {
      yearEl.innerHTML = aboutData.yearSchedule.map((y) => `
        <div class="ys-card"><span class="ys-month">${escapeHtml(y.month)}</span><span class="ys-body">${escapeHtml(y.body)}</span></div>
      `).join('');
    }
  }

  /* =========================================================
     3. ニュース ／ 4. 試合日程・結果
     （Googleスプレッドシート連携が設定されていれば、そちらを優先して使う。
      未設定・通信失敗のときは data.js の newsData / scheduleData を使う）
  ========================================================= */
  await sheetsSyncPromise;
  const cfg = (typeof sheetsSyncConfig !== 'undefined') ? sheetsSyncConfig : {};
  const newsMaxItems = cfg.newsMaxItems || 6;

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

  // 日付から「年度」を自動計算する（4月1日～翌年3月31日を1年度とする学校年度のルール）。
  // 例：2026.04.01～2027.03.31 はすべて「2026年度」
  // これにより、試合結果フォームで「年度」を毎回入力してもらう必要がなくなる
  const deriveSeason = (str) => {
    const ymd = extractYMD(str);
    if (!ymd) return '';
    return String(ymd.mo >= 4 ? ymd.y : ymd.y - 1);
  };

  // 「今」が何年度かも自動計算する。sheetsSyncConfig.currentSeason に何か
  // 入力されていればそちらを優先する（先取りで来年度の日程を見せたい時などに使える）。
  // 空欄のままなら、パソコンの今日の日付から自動的に判定されるので、
  // 4月になっても手動で書き換える必要はない
  const currentSeason = (cfg.currentSeason && String(cfg.currentSeason).trim())
    ? String(cfg.currentSeason).trim()
    : (() => {
        const now = new Date();
        return String(now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1);
      })();

  // データソース（Googleシート優先、なければ data.js のサンプル）を選んだうえで、
  // 「ニュースは新しい日付順に最新◯件まで（固定はその6件のカウントに含めない）」
  // 「試合結果は今年度のみ・1月→12月の順」を必ず適用する。
  // ※これは data.js の手書きデータを使っているときも同じルールで動く
  //   （投稿・記入した順番に関係なく、日付そのもので正しく並ぶ）
  const rawNewsData = window.__syncedNewsData || (typeof newsData !== 'undefined' ? newsData : []);
  const byNewestFirst = (a, b) => (parseDateValue(b.date) ?? -Infinity) - (parseDateValue(a.date) ?? -Infinity);
  const pinnedNews = rawNewsData.filter((n) => n.pinned);
  const otherNews = rawNewsData.filter((n) => !n.pinned).sort(byNewestFirst).slice(0, newsMaxItems);
  // 固定を上に集めるのではなく、全体をまとめて日付の新しい順に並べる
  // （固定は「6件のカウントから外れて必ず表示される」だけで、並び順は他と同じ）
  const effectiveNewsData = [...pinnedNews, ...otherNews].sort(byNewestFirst);

  const rawScheduleData = window.__syncedScheduleData || (typeof scheduleData !== 'undefined' ? scheduleData : []);
  const effectiveScheduleData = rawScheduleData
    .filter((s) => { const season = deriveSeason(s.date); return !season || season === currentSeason; })
    .sort((a, b) => (parseDateValue(a.date) ?? Infinity) - (parseDateValue(b.date) ?? Infinity)); // 1月→12月の順（日付不明は最後）

  // フォームを設定しているのに読み込みに失敗し、サンプルデータで代用している場合だけ、
  // 控えめな注意書きを表示する（フォーム未設定の場合は表示しない）
  const newsSyncWarning = document.getElementById('newsSyncWarning');
  if (newsSyncWarning) newsSyncWarning.hidden = !(window.__newsSyncFailed && cfg.newsCsvUrl);

  const scheduleSyncWarning = document.getElementById('scheduleSyncWarning');
  if (scheduleSyncWarning) scheduleSyncWarning.hidden = !(window.__scheduleSyncFailed && cfg.scheduleCsvUrl);

  const newsTagLabel = { match: '試合', info: 'お知らせ', recruit: '募集' };
  const newsGrid = document.getElementById('newsGrid');
  if (newsGrid) {
    newsGrid.innerHTML = effectiveNewsData.map((item) => `
      <article class="news-card">
        <span class="news-tag-group">
          <span class="news-tag news-tag--${item.tag}">${newsTagLabel[item.tag] || 'お知らせ'}</span>
          ${item.pinned ? '<span class="news-tag-pinned">固定</span>' : ''}
        </span>
        <time class="news-date">${escapeHtml(item.date)}</time>
        <h3 class="news-title">${escapeHtml(item.title)}</h3>
        <p class="news-text">${escapeHtml(item.text)}</p>
        ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="news-more">詳しく見る</a>` : ''}
      </article>
    `).join('');
  }

  const scheduleBody = document.getElementById('scheduleBody');
  if (scheduleBody) {
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

    // 今日以降で最初に来る試合の行を探す（そこの上の罫線だけ目立たせて、
    // 「ここから上が消化済み、ここから下がこれから」を視覚的に分かるようにする）
    const now = new Date();
    const todayValue = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    let dividerIndex = -1;
    for (let i = 0; i < effectiveScheduleData.length; i++) {
      const v = parseDateValue(effectiveScheduleData[i].date);
      if (v !== null && v >= todayValue) { dividerIndex = i; break; }
    }

    scheduleBody.innerHTML = effectiveScheduleData.map((row, i) => `
      <div class="scoreboard-row${i === dividerIndex && dividerIndex > 0 ? ' scoreboard-row--today' : ''}" role="row">
        <span role="cell" data-label="日付">${escapeHtml(row.date)}</span>
        <span role="cell" data-label="大会">${escapeHtml(row.competition)}</span>
        <span role="cell" data-label="対戦相手" class="opponent-cell">${renderOpponent(row)}</span>
        <span role="cell" data-label="結果">${renderResult(row.result)}</span>
      </div>
    `).join('');
  }

  /* =========================================================
     5. 監督・コーチのコメント
  ========================================================= */
  const staffComments = document.getElementById('staffComments');
  if (staffComments && typeof staffData !== 'undefined') {
    staffComments.innerHTML = staffData.map((s) => `
      <blockquote class="comment-card">
        ${s.photo ? `<img src="${escapeHtml(s.photo)}" alt="${escapeHtml(s.name)}" class="comment-avatar" loading="lazy">` : ''}
        <p class="comment-role">${escapeHtml(s.role)}</p>
        <p class="comment-name">${escapeHtml(s.name)}</p>
        <p class="comment-text">${escapeHtml(s.comment)}</p>
      </blockquote>
    `).join('');
  }

  /* =========================================================
     6. 選手・スタッフ
  ========================================================= */
  const playerGrid = document.getElementById('playerGrid');
  const filterEmpty = document.getElementById('filterEmpty');
  if (playerGrid && typeof playersData !== 'undefined') {
    playerGrid.innerHTML = playersData.map((p) => `
      <article class="player-card${p.isStaff ? ' player-card--staff' : ''}" data-grade="${escapeHtml(p.grade)}">
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

  /* =========================================================
     7. よくある質問（アコーディオン本体もここで組み立てます）
  ========================================================= */
  const faqAccordion = document.getElementById('faqAccordion');
  if (faqAccordion && typeof faqData !== 'undefined') {
    const tokens = {
      '{instagramUrl}': (typeof siteData !== 'undefined' && siteData.instagramUrl) || '',
      '{instagramHandle}': (typeof siteData !== 'undefined' && siteData.instagramHandle) || '',
      '{adviserName}': (typeof siteData !== 'undefined' && siteData.adviserName) || ''
    };
    const applyTokens = (str) => Object.keys(tokens).reduce((acc, key) => acc.split(key).join(tokens[key]), str);

    faqAccordion.innerHTML = faqData.map((item, i) => {
      const n = i + 1;
      const answer = item.aHtml ? applyTokens(item.aHtml) : escapeHtml(item.a || '');
      return `
        <div class="accordion-item">
          <h3>
            <button class="accordion-trigger" aria-expanded="false" aria-controls="faq-a${n}" id="faq-q${n}">
              <span class="q-mark">Q</span>${escapeHtml(item.q)}
            </button>
          </h3>
          <div class="accordion-panel" id="faq-a${n}" role="region" aria-labelledby="faq-q${n}" hidden>
            <p>${answer}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // アコーディオンの開閉（FAQが動的に生成されるため、イベント委譲で処理）
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.accordion-trigger');
    if (!trigger) return;
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!isExpanded));
    if (panel) panel.hidden = isExpanded;
  });

  /* =========================================================
     8. スポンサー
  ========================================================= */
  const sponsorGrid = document.getElementById('sponsorGrid');
  if (sponsorGrid && typeof sponsorsData !== 'undefined') {
    sponsorGrid.innerHTML = sponsorsData.map((s) => `
      <li class="sponsor-card">
        <a class="sponsor-logo" href="${escapeHtml(s.url)}" target="_blank" rel="noopener sponsored">
          ${s.imageUrl
            ? `<img src="${escapeHtml(s.imageUrl)}" alt="${escapeHtml(s.name)}" loading="lazy">`
            : `<span>${escapeHtml(s.shortName || s.name)}</span>`}
        </a>
        <div class="sponsor-info">
          <p class="sponsor-name">${escapeHtml(s.name)}</p>
          ${s.address ? `<p class="sponsor-address">${escapeHtml(s.address)}</p>` : ''}
          ${s.description ? `<p class="sponsor-desc">${escapeHtml(s.description)}</p>` : ''}
        </div>
      </li>
    `).join('');
  }

  /* =========================================================
     9. 企業様向けご支援案内
  ========================================================= */
  const supportGrid = document.getElementById('supportGrid');
  if (supportGrid && typeof supportData !== 'undefined') {
    supportGrid.innerHTML = supportData.map((s) => `
      <article class="support-card">
        ${s.image ? `<img src="${escapeHtml(s.image)}" alt="${escapeHtml(s.title)}" class="support-image" loading="lazy">` : ''}
        <h4 class="support-title">${escapeHtml(s.title)}</h4>
        <p class="support-lead">${escapeHtml(s.lead)}</p>
        <ul class="support-list">
          ${s.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </article>
    `).join('');
  }

  /* =========================================================
     選手・指導者紹介：フィルター機能
     （data.js のレンダリングより後に実行する必要があるためここに配置）
  ========================================================= */
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const target = btn.dataset.filter;
      let visibleCount = 0;
      const cards = document.querySelectorAll('.player-card');

      cards.forEach((card) => {
        const matches = target === 'all' || card.dataset.grade === target;
        card.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount += 1;
      });

      if (filterEmpty) filterEmpty.hidden = visibleCount !== 0;
    });
  });

});
