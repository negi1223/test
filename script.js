/* 写真のURL（Googleドライブ等）が壊れている時（共有設定忘れ・ファイル削除・URLの
   打ち間違いなど）に、ブラウザ標準の「壊れた画像」アイコンをそのまま出さず、
   あらかじめ用意しておいた代わりの表示（イニシャル文字など）に自動で切り替える。
   img タグに data-fallback="代わりに表示するHTML" と onerror="window.handleImgFallback(this)"
   を付けておくだけで使える。全ページで script.js を読み込んでいるので、
   members-archive.js 側からも同じ関数を呼び出せる */
window.handleImgFallback = function (imgEl) {
  imgEl.outerHTML = imgEl.getAttribute('data-fallback') || '';
};

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

  // escapeHtml / renderNoteContent / newsItemSlug は common.js（先に読み込み済み）を使う

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

    // Googleフォームのボタン・メールアドレスは、「その他」シートの内容で
    // 上書きされる可能性があるため、後段（同期完了後）でまとめて設定する

    // フッター著作権表記
    const footerCopy = document.getElementById('footerCopy');
    if (footerCopy) {
      const startYear = parseInt(siteData.copyrightYear, 10);
      const nowYear = new Date().getFullYear();
      const yearLabel = (startYear && nowYear > startYear) ? `${startYear} - ${nowYear}` : siteData.copyrightYear;
      footerCopy.textContent = `© ${yearLabel} ${siteData.copyrightEn}`;
    }
  }

  /* =========================================================
     1. トップビジュアル（heroData）
     ※eyebrow・写真は他の場所で扱う。タイトル・紹介文は「その他」シートで
      上書きできるので、settingsが読み込み終わった後（下の方）でまとめて描画する
  ========================================================= */
  if (typeof heroData !== 'undefined') {
    const eyebrowEl = document.getElementById('heroEyebrow');
    if (eyebrowEl) eyebrowEl.textContent = heroData.eyebrow;
  }

  /* =========================================================
     3. ニュース ／ 4. 試合日程・結果
     （Googleスプレッドシート連携が設定されていれば、そちらを優先して使う。
      未設定・通信失敗のときは data.js の newsData / scheduleData を使う）
  ========================================================= */
  await sheetsSyncPromise;
  const cfg = (typeof sheetsSyncConfig !== 'undefined') ? sheetsSyncConfig : {};
  // スマホ（画面幅900px以下、CSSのブレークポイントと合わせている）では
  // ニュースの表示件数を減らし、代わりに news.html への「もっと見る」に誘導する
  const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
  const newsMaxItems = (isMobileViewport && cfg.newsMaxItemsMobile) || cfg.newsMaxItems || 6;

  /* =========================================================
     1-2. トップの数字・写真、About、連絡先メール
     ※「その他」スプレッドシート（settingsCsvUrl）が設定されていれば、
      該当する項目だけをそちらの値で上書きする。項目名（1列目）で判定するので、
      対応表は data.js の siteData コメント（その他設定のところ）を参照
  ========================================================= */
  const settings = window.__syncedSettings || {};

  // トップ画面のタイトル：「その他」シートで上書きされていれば、value（改行区切り）の中で
  // note（赤枠にしたい文字列）と一致する部分だけを赤枠のspanに変換する。
  // 上書きが無ければ今まで通りdata.jsのheadline/headlineAccent/headlineSuffixを使う
  const headlineEl = document.getElementById('heroHeadline');
  if (headlineEl && typeof heroData !== 'undefined') {
    if (settings.heroTitle) {
      const accent = (settings.heroTitleAccent || '').trim();
      const lines = settings.heroTitle.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
      const htmlLines = lines.map((line) => {
        const escapedLine = escapeHtml(line);
        if (!accent) return escapedLine;
        const escapedAccent = escapeHtml(accent);
        return escapedLine.split(escapedAccent).join(`<span class="hero-copy-accent">${escapedAccent}</span>`);
      });
      headlineEl.innerHTML = htmlLines.join('<br>');
    } else {
      headlineEl.innerHTML = `${escapeHtml(heroData.headline)}<br><span class="hero-copy-accent">${escapeHtml(heroData.headlineAccent)}</span>${escapeHtml(heroData.headlineSuffix)}`;
    }
  }

  const subEl = document.getElementById('heroSub');
  if (subEl && typeof heroData !== 'undefined') {
    subEl.textContent = settings.heroSub || heroData.sub;
  }


  // 「その他」シートの「◯◯セクションの「△△」」という行を、各セクションの
  // 下に補足カードとして表示する（News/Schedule/Members/Q&A/Sponsors共通）
  const renderSectionExtras = (containerId, sectionKey) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const extras = (settings.sectionExtras && settings.sectionExtras[sectionKey]) || {};
    const labels = Object.keys(extras);
    el.innerHTML = labels.map((label) => {
      const item = extras[label];
      return `
        <div class="fact-card">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(item.value)}${item.note ? `<br><span class="fact-note">${renderNoteContent(item.note)}</span>` : ''}</dd>
        </div>
      `;
    }).join('');
  };
  renderSectionExtras('newsExtras', 'news');
  renderSectionExtras('scheduleExtras', 'schedule');
  renderSectionExtras('membersExtras', 'members');
  renderSectionExtras('faqExtras', 'faq');
  renderSectionExtras('sponsorsExtras', 'sponsors');

  // 現役部員数は「選手＋マネージャーの合計」を自動計算する（手入力不要）
  const rawPlayersDataForCount = window.__syncedPlayersData || (typeof playersData !== 'undefined' ? playersData : []);
  const totalMemberCount = String(rawPlayersDataForCount.length);

  const statsEl = document.getElementById('heroStats');
  if (statsEl && typeof heroData !== 'undefined' && heroData.stats) {
    const mergedStats = heroData.stats.map((s) => {
      if (s.label === '現役部員') {
        return { ...s, value: totalMemberCount };
      }
      if (s.label === '所属' && settings.affiliationValue) {
        return { ...s, value: settings.affiliationValue, suffix: settings.affiliationSuffix || '' };
      }
      if (s.label === '設立リーグ参戦' && settings.heroFoundedYear) {
        return { ...s, value: settings.heroFoundedYear };
      }
      return s;
    });
    statsEl.innerHTML = mergedStats.map((s) => `
      <div><dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}<span>${escapeHtml(s.suffix || '')}</span></dd></div>
    `).join('');
  }

  // Membersサマリー（スマホ版トップページ専用）：人数と代表写真を反映
  const membersSummaryCountEl = document.getElementById('membersSummaryCount');
  if (membersSummaryCountEl) membersSummaryCountEl.textContent = `現在 ${totalMemberCount}名 で活動しています`;
  const membersSummaryPhotoEl = document.getElementById('membersSummaryPhoto');
  if (membersSummaryPhotoEl) {
    const summaryPhotoRaw = settings.membersGroupPhoto || (typeof membersSummary !== 'undefined' && membersSummary.photo) || settings.heroPhoto || (typeof heroData !== 'undefined' ? heroData.photo : '');
    const summaryPhoto = Array.isArray(summaryPhotoRaw) ? summaryPhotoRaw[0] : summaryPhotoRaw;
    if (summaryPhoto) {
      membersSummaryPhotoEl.src = summaryPhoto;
    } else {
      membersSummaryPhotoEl.remove(); // 写真が1枚も無ければ、空のダミー画像枠を出さない
    }
  }

  const heroPhotoWrap = document.getElementById('heroPhoto');
  const heroPhotoRaw = settings.heroPhoto || (typeof heroData !== 'undefined' ? heroData.photo : '');
  // 文字列（1枚）でも配列（複数枚＝スライドショー）でも同じように扱えるよう、
  // ここで必ず配列にそろえる（空文字は除く）
  const heroPhotoList = (Array.isArray(heroPhotoRaw) ? heroPhotoRaw : [heroPhotoRaw]).filter(Boolean);

  if (heroPhotoWrap && heroPhotoList.length > 0) {
    // 既存のダミー表示（TEAM PHOTO）は写真が用意できたら消す
    const placeholder = heroPhotoWrap.querySelector('.photo-placeholder');
    if (placeholder) placeholder.remove();

    const slidesHtml = heroPhotoList.map((src, i) => `
      <div class="hero-slide${i === 0 ? ' is-active' : ''}">
        <img class="hero-photo-img" src="${escapeHtml(src)}" alt="${escapeHtml((typeof heroData !== 'undefined' && heroData.photoAlt) || '活動中の様子')}" loading="${i === 0 ? 'eager' : 'lazy'}">
      </div>
    `).join('');
    heroPhotoWrap.insertAdjacentHTML('afterbegin', slidesHtml);

    // 写真が2枚以上あるときだけ、自動で切り替わるスライドショー＋クリックできる点を表示する
    if (heroPhotoList.length > 1) {
      const slideEls = Array.from(heroPhotoWrap.querySelectorAll('.hero-slide'));

      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'hero-dots';
      dotsWrap.setAttribute('role', 'tablist');
      dotsWrap.setAttribute('aria-label', 'トップ写真の切り替え');
      dotsWrap.innerHTML = heroPhotoList.map((_, i) => `
        <button type="button" class="hero-dot${i === 0 ? ' is-active' : ''}" aria-label="${i + 1}枚目の写真を表示" role="tab" aria-selected="${i === 0}"></button>
      `).join('');
      heroPhotoWrap.appendChild(dotsWrap);
      const dotEls = Array.from(dotsWrap.querySelectorAll('.hero-dot'));

      let activeIndex = 0;
      const showSlide = (nextIndex) => {
        slideEls[activeIndex]?.classList.remove('is-active');
        dotEls[activeIndex]?.classList.remove('is-active');
        dotEls[activeIndex]?.setAttribute('aria-selected', 'false');
        activeIndex = nextIndex;
        slideEls[activeIndex]?.classList.add('is-active');
        dotEls[activeIndex]?.classList.add('is-active');
        dotEls[activeIndex]?.setAttribute('aria-selected', 'true');
      };

      const AUTO_ADVANCE_MS = 5500;
      let timer = setInterval(() => {
        showSlide((activeIndex + 1) % heroPhotoList.length);
      }, AUTO_ADVANCE_MS);

      // 点をクリックしたら、そこで自動切り替えのタイマーをリセットして手動の切り替えを優先する
      dotEls.forEach((dot, i) => {
        dot.addEventListener('click', () => {
          if (i === activeIndex) return;
          clearInterval(timer);
          showSlide(i);
          timer = setInterval(() => {
            showSlide((activeIndex + 1) % heroPhotoList.length);
          }, AUTO_ADVANCE_MS);
        });
      });

      // タブが非表示の間（別タブを見ている間）は切り替えを止めて、無駄な負荷をかけない
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          clearInterval(timer);
        } else {
          timer = setInterval(() => {
            showSlide((activeIndex + 1) % heroPhotoList.length);
          }, AUTO_ADVANCE_MS);
        }
      });
    }
  }

  if (typeof aboutData !== 'undefined') {
    const sloganEl = document.getElementById('aboutSlogan');
    if (sloganEl) sloganEl.textContent = settings.slogan || aboutData.slogan;

    const textEl = document.getElementById('aboutText');
    if (textEl) textEl.textContent = settings.aboutText || aboutData.text;

    const factsEl = document.getElementById('aboutFacts');
    if (factsEl && aboutData.facts) {
      const aboutFactsOverrides = settings.aboutFacts || {};
      // 既存のカードは該当する上書きがあれば差し替え、
      // 「その他」シートにしかない新しいラベルはカードとして追加する
      // （＝ Aboutの「◯◯」という行を1つ足すだけで、新しいカードが自動で増える）
      const usedLabels = new Set();
      const mergedFacts = aboutData.facts.map((f) => {
        usedLabels.add(f.label);
        const override = aboutFactsOverrides[f.label];
        return override ? { ...f, value: override.value, note: override.note || '' } : f;
      });
      Object.keys(aboutFactsOverrides).forEach((label) => {
        if (!usedLabels.has(label)) {
          mergedFacts.push({ label, value: aboutFactsOverrides[label].value, note: aboutFactsOverrides[label].note || '' });
        }
      });
      factsEl.innerHTML = mergedFacts.map((f) => `
        <div class="fact-card">
          <dt>${escapeHtml(f.label)}</dt>
          <dd>${escapeHtml(f.value)}${f.note ? `<br><span class="fact-note">${renderNoteContent(f.note)}</span>` : ''}</dd>
        </div>
      `).join('');
    }

    const yearEl = document.getElementById('yearScheduleGrid');
    const effectiveYearSchedule = (settings.yearSchedule && settings.yearSchedule.length) ? settings.yearSchedule : aboutData.yearSchedule;
    if (yearEl && effectiveYearSchedule) {
      yearEl.innerHTML = effectiveYearSchedule.map((y) => `
        <div class="ys-card"><span class="ys-month">${escapeHtml(y.month)}</span><span class="ys-body">${escapeHtml(y.body)}</span></div>
      `).join('');
    }
  }

  // 企業様・スポンサー様向けメールアドレス（「その他」シートで上書き可能）
  const effectiveSponsorEmail = settings.sponsorEmail || (typeof siteData !== 'undefined' ? siteData.sponsorEmail : '');
  document.querySelectorAll('.js-sponsor-email').forEach((el) => {
    el.href = `mailto:${effectiveSponsorEmail}`;
    el.textContent = effectiveSponsorEmail;
  });
  if (typeof siteData !== 'undefined' && settings.adviserEmail) {
    siteData.adviserEmail = settings.adviserEmail; // {adviserName}等のトークンで今後使う場合に備えて反映
  }

  // 企業様向けお問い合わせフォームのURL（「その他」シートで上書き可能）
  const gformButton = document.getElementById('gformButton');
  if (gformButton) gformButton.href = settings.sponsorFormUrl || (typeof siteData !== 'undefined' ? siteData.sponsorFormUrl : '#');

  // 公式Instagram・Xのリンク（「その他」シートで上書き可能。未設定ならdata.jsのsiteDataのまま）
  const effectiveInstagramUrl = settings.instagramUrl || (typeof siteData !== 'undefined' ? siteData.instagramUrl : '#');
  const effectiveXUrl = settings.xUrl || (typeof siteData !== 'undefined' ? siteData.xUrl : '#');
  document.querySelectorAll('.js-instagram-link').forEach((el) => { el.href = effectiveInstagramUrl; });
  document.querySelectorAll('.js-x-link').forEach((el) => { el.href = effectiveXUrl; });

  // ヘッダーメニューの文字（「その他」シートで「ヘッダーの「News」」のように上書き可能）。
  // かぎカッコの中身は完全一致（大文字小文字は問わない）で探す
  const navKeyMap = {
    navNews: 'News', navAbout: 'About', navSchedule: 'Schedule',
    navMembers: 'Members', navFaq: 'Q&A', navSponsors: 'Sponsors'
  };
  if (settings.navLabels) {
    Object.keys(navKeyMap).forEach((elId) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const defaultLabel = navKeyMap[elId];
      const overrideKey = Object.keys(settings.navLabels).find(
        (k) => k.trim().toLowerCase() === defaultLabel.toLowerCase()
      );
      if (overrideKey) el.textContent = settings.navLabels[overrideKey];
    });
  }

  const settingsSyncWarning = document.getElementById('settingsSyncWarning');
  if (settingsSyncWarning) settingsSyncWarning.hidden = !(window.__settingsSyncFailed && cfg.settingsCsvUrl);

  // extractYMD / parseDateValue / deriveSeason は common.js を使う

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
        ${(item.detail || item.image) ? `<a href="news.html#news-item-${newsItemSlug(item)}" class="news-more">詳しく見る</a>` : ''}
      </article>
    `).join('');
  }

  // 固定を除いた件数が上限を超えている時だけ、「最新の◯件を表示しています」を出す
  // （ちょうど収まっている時は、リンクを押しても同じ内容にしかならず紛らわしいので出さない）
  const newsTotalNonPinned = rawNewsData.filter((n) => !n.pinned).length;
  const newsTruncated = newsTotalNonPinned > newsMaxItems;
  const newsMoreNote = document.getElementById('newsMoreNote');
  if (newsMoreNote) {
    newsMoreNote.hidden = !newsTruncated;
    if (newsTruncated) newsMoreNote.textContent = `最新の${effectiveNewsData.length}件を表示しています。`;
  }

  const scheduleBody = document.getElementById('scheduleBody');
  if (scheduleBody) {
    // renderResult / renderOpponent は common.js を使う

    // 今日以降で最初に来る試合の行を探す（そこの上の罫線だけ目立たせて、
    // 「ここから上が消化済み、ここから下がこれから」を視覚的に分かるようにする）
    const now = new Date();
    const todayValue = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    let dividerIndex = -1;
    for (let i = 0; i < effectiveScheduleData.length; i++) {
      const v = parseDateValue(effectiveScheduleData[i].date);
      if (v !== null && v >= todayValue) { dividerIndex = i; break; }
    }

    // トップページでは全件を出さず、「今日」の前後だけを表示する。
    // 溢れた分は「全日程を見る →」（schedule.html）に誘導する。
    // 試合数が少ないうち（件数が窓の大きさに収まる間）は今まで通り全件表示になる
    const scheduleMaxPast = (isMobileViewport && cfg.scheduleMaxPastMobile) || cfg.scheduleMaxPastDesktop || 6;
    const scheduleMaxUpcoming = (isMobileViewport && cfg.scheduleMaxUpcomingMobile) || cfg.scheduleMaxUpcomingDesktop || 6;

    let windowStart, windowEnd;
    if (dividerIndex === -1) {
      // 今後の試合が無い（シーズン終了、または日付未定の試合のみ）→ 直近の試合をまとめて表示
      windowEnd = effectiveScheduleData.length;
      windowStart = Math.max(0, windowEnd - (scheduleMaxPast + scheduleMaxUpcoming));
    } else {
      windowStart = Math.max(0, dividerIndex - scheduleMaxPast);
      windowEnd = Math.min(effectiveScheduleData.length, dividerIndex + scheduleMaxUpcoming);
    }
    const windowedScheduleData = effectiveScheduleData.slice(windowStart, windowEnd);
    const scheduleTruncated = windowedScheduleData.length < effectiveScheduleData.length;

    scheduleBody.innerHTML = windowedScheduleData.map((row, i) => `
      <div class="scoreboard-row${(windowStart + i) === dividerIndex && dividerIndex > 0 ? ' scoreboard-row--today' : ''}" role="row">
        <span role="cell" data-label="日付">${escapeHtml(row.date)}</span>
        <span role="cell" data-label="大会">${escapeHtml(row.competition)}</span>
        <span role="cell" data-label="対戦相手" class="opponent-cell">${renderOpponent(row)}</span>
        <span role="cell" data-label="結果">${renderResult(row.result)}</span>
      </div>
    `).join('');

    const scheduleMoreNote = document.getElementById('scheduleMoreNote');
    if (scheduleMoreNote) {
      scheduleMoreNote.hidden = !scheduleTruncated;
      if (scheduleTruncated) scheduleMoreNote.textContent = `直近の試合${windowedScheduleData.length}件を表示しています。`;
    }

    const scheduleMoreLink = document.getElementById('scheduleMoreLink');
    if (scheduleMoreLink) {
      scheduleMoreLink.hidden = !scheduleTruncated;
      if (scheduleTruncated) {
        const linkEl = scheduleMoreLink.querySelector('a');
        if (linkEl) linkEl.textContent = `全日程を見る（${effectiveScheduleData.length}試合）→`;
      }
    }
  }

  /* =========================================================
     5. 監督・コーチのコメント
  ========================================================= */
  const staffComments = document.getElementById('staffComments');
  const effectiveStaffData = window.__syncedStaffData || (typeof staffData !== 'undefined' ? staffData : []);
  if (staffComments) {
    staffComments.innerHTML = effectiveStaffData.map((s) => `
      <blockquote class="comment-card">
        ${s.photo ? `<img src="${escapeHtml(s.photo)}" alt="${escapeHtml(s.name)}" class="comment-avatar" loading="lazy" data-fallback="" onerror="window.handleImgFallback(this)">` : ''}
        <p class="comment-role">${escapeHtml(s.role)}</p>
        <p class="comment-name">${escapeHtml(s.name)}</p>
        <p class="comment-text">${escapeHtml(s.comment)}</p>
      </blockquote>
    `).join('');
  }
  const staffSyncWarning = document.getElementById('staffSyncWarning');
  if (staffSyncWarning) staffSyncWarning.hidden = !(window.__staffSyncFailed && cfg.staffCsvUrl);

  /* =========================================================
     6. 選手・スタッフ
  ========================================================= */
  const playerGrid = document.getElementById('playerGrid');
  const filterEmpty = document.getElementById('filterEmpty');
  const memberMoreLink = document.getElementById('memberMoreLink');
  const rawPlayersData = window.__syncedPlayersData || (typeof playersData !== 'undefined' ? playersData : []);
  // 入力された順番がバラバラでも、学年順（4年→3年→2年→1年→スタッフ）に並べる。
  // 同じ学年の中の並び順は、スプレッドシート（またはdata.js）に入力された順番が
  // そのまま使われる（あいうえお順にしたい場合は、シート側で行を並び替えてください）
  const sortedPlayersData = sortByGrade(rawPlayersData); // common.js

  // 部員数が多くなった時、PCトップページでは表示件数に上限を設ける。
  // ただし単純に「上から◯人」だと、人数の多い学年（4年など）だけで
  // 上限に達してしまい、1年生が1人も表示されない…という不公平が起きるため、
  // 学年ごとに均等に振り分けてから、上限に収まるよう1人ずつ配分する
  const playersMaxDesktop = cfg.playersMaxDesktop || 30;
  let effectivePlayersData = sortedPlayersData;
  let membersTruncated = false;

  if (sortedPlayersData.length > playersMaxDesktop) {
    membersTruncated = true;
    const groupOrder = ['4年', '3年', '2年', '1年', 'スタッフ'];
    const groups = groupOrder.map((g) => sortedPlayersData.filter((p) => p.grade === g));
    const others = sortedPlayersData.filter((p) => !groupOrder.includes(p.grade));
    const allGroups = others.length ? [...groups, others] : groups;

    // 1人ずつ、各グループを順番に回しながら割り当てる（人数が尽きたグループは飛ばす）
    const quotas = allGroups.map(() => 0);
    let remaining = playersMaxDesktop;
    let progress = true;
    while (remaining > 0 && progress) {
      progress = false;
      for (let i = 0; i < allGroups.length; i++) {
        if (remaining <= 0) break;
        if (quotas[i] < allGroups[i].length) {
          quotas[i] += 1;
          remaining -= 1;
          progress = true;
        }
      }
    }
    effectivePlayersData = allGroups.flatMap((g, i) => g.slice(0, quotas[i]));
  }

  if (playerGrid) {
    playerGrid.innerHTML = effectivePlayersData.map((p) => `
      <article class="player-card${p.isStaff ? ' player-card--staff' : ''}" data-filter-key="${escapeHtml(p.isStaff ? p.role : p.grade)}">
        <div class="player-photo">
          ${p.photo
            ? `<img src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name)}" class="player-photo-img" loading="lazy" data-fallback="${escapeHtml(`<span class="player-initial">${p.initial}</span>`)}" onerror="window.handleImgFallback(this)">`
            : `<span class="player-initial">${escapeHtml(p.initial)}</span>`}
        </div>
        <h3 class="player-name">${escapeHtml(p.name)}</h3>
        <p class="player-meta">${escapeHtml(p.role)}</p>
        ${p.sub ? `<p class="player-quote">${escapeHtml(p.sub)}</p>` : ''}
      </article>
    `.trim()).join('');
  }
  if (memberMoreLink) {
    memberMoreLink.hidden = !membersTruncated;
    if (membersTruncated) {
      const linkEl = memberMoreLink.querySelector('a');
      if (linkEl) linkEl.textContent = `部員全員を見る（${sortedPlayersData.length}名）→`;
    }
  }
  const playersSyncWarning = document.getElementById('playersSyncWarning');
  if (playersSyncWarning) playersSyncWarning.hidden = !(window.__playersSyncFailed && cfg.playersCsvUrl);

  /* =========================================================
     7. よくある質問（アコーディオン本体もここで組み立てます）
  ========================================================= */
  const faqAccordion = document.getElementById('faqAccordion');
  const rawFaqData = window.__syncedFaqData || (typeof faqData !== 'undefined' ? faqData : []);
  if (faqAccordion) {
    const tokens = {
      '{instagramUrl}': (typeof siteData !== 'undefined' && siteData.instagramUrl) || '',
      '{instagramHandle}': (typeof siteData !== 'undefined' && siteData.instagramHandle) || '',
      '{adviserName}': (typeof siteData !== 'undefined' && siteData.adviserName) || ''
    };
    const applyTokens = (str) => Object.keys(tokens).reduce((acc, key) => acc.split(key).join(tokens[key]), str);

    faqAccordion.innerHTML = rawFaqData.map((item, i) => {
      const n = i + 1;
      const answer = item.aHtml ? applyTokens(item.aHtml) : applyTokens(escapeHtml(item.a || ''));
      return `
        <div class="accordion-item">
          <h3>
            <button class="accordion-trigger" aria-expanded="false" aria-controls="faq-a${n}" id="faq-q${n}">
              <span class="q-mark">Q</span>${escapeHtml(item.q)}
            </button>
          </h3>
          <div class="accordion-panel" id="faq-a${n}" role="region" aria-labelledby="faq-q${n}" hidden>
            <p>${answer}</p>
            ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="faq-more">詳しく見る</a>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  const faqSyncWarning = document.getElementById('faqSyncWarning');
  if (faqSyncWarning) faqSyncWarning.hidden = !(window.__faqSyncFailed && cfg.faqCsvUrl);

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
  const effectiveSponsorsData = window.__syncedSponsorsData || (typeof sponsorsData !== 'undefined' ? sponsorsData : []);
  if (sponsorGrid) {
    sponsorGrid.innerHTML = effectiveSponsorsData.map((s) => `
      <li class="sponsor-card">
        <a class="sponsor-logo" href="${escapeHtml(s.url)}" target="_blank" rel="noopener sponsored">
          ${s.imageUrl
            ? `<img src="${escapeHtml(s.imageUrl)}" alt="${escapeHtml(s.name)}" loading="lazy" data-fallback="${escapeHtml(`<span>${s.shortName || s.name}</span>`)}" onerror="window.handleImgFallback(this)">`
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
  const sponsorsSyncWarning = document.getElementById('sponsorsSyncWarning');
  if (sponsorsSyncWarning) sponsorsSyncWarning.hidden = !(window.__sponsorsSyncFailed && cfg.sponsorsCsvUrl);

  /* =========================================================
     9. 企業様向けご支援案内
  ========================================================= */
  const supportGrid = document.getElementById('supportGrid');
  const rawSupportData = window.__syncedSupportData || (typeof supportData !== 'undefined' ? supportData : []);
  if (supportGrid) {
    supportGrid.innerHTML = rawSupportData.map((s) => `
      <article class="support-card">
        ${s.image ? `<a href="${escapeHtml(s.image)}" target="_blank" rel="noopener" class="support-image-link" aria-label="画像を拡大表示"><img src="${escapeHtml(s.image)}" alt="${escapeHtml(s.title)}" class="support-image" loading="lazy"></a>` : ''}
        <h4 class="support-title">${escapeHtml(s.title)}</h4>
        <p class="support-lead">${escapeHtml(s.lead)}</p>
        <ul class="support-list">
          ${(s.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </article>
    `).join('');
  }
  const supportSyncWarning = document.getElementById('supportSyncWarning');
  if (supportSyncWarning) supportSyncWarning.hidden = !(window.__supportSyncFailed && cfg.supportCsvUrl);

  /* =========================================================
     選手・指導者紹介：フィルター機能
     （data.js のレンダリングより後に実行する必要があるためここに配置）
  ========================================================= */
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

  // ボタンは動的に増えるため、フィルターバー全体へのイベント委譲で処理する
  if (filterBar) {
    filterBar.addEventListener('click', (event) => {
      const btn = event.target.closest('.filter-btn');
      if (!btn) return;

      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const target = btn.dataset.filter;
      let visibleCount = 0;
      const cards = document.querySelectorAll('.player-card');

      cards.forEach((card) => {
        const matches = target === 'all' || card.dataset.filterKey === target;
        card.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount += 1;
      });

      if (filterEmpty) filterEmpty.hidden = visibleCount !== 0;
    });
  }

});
