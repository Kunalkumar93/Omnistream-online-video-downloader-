/**
 * OmniStream — Professional UI/UX Desktop-Grade Frontend Controller
 * Complete implementation for Router, Downloader, Downloads Manager, History,
 * Supported Platforms, Settings, Command Palette, and Engine Diagnostics.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // STATE MANAGEMENT & PERSISTENCE
  // ==========================================
  const State = {
    currentView: 'downloader',
    currentMedia: null,
    activeTab: 'video', // 'video' | 'audio'
    selectedQuality: null,
    isExpandedFormats: false,
    activeTasks: {}, // { [taskId]: taskData }
    activePollers: {}, // { [taskId]: intervalId }
    inlineTaskId: null,
    history: [],
    settings: {
      defaultQuality: '1080p',
      audioBitrate: '320',
      strictH264: true,
      autoReveal: false
    }
  };

  // Load Settings from LocalStorage
  try {
    const savedSettings = JSON.parse(localStorage.getItem('omnistream_settings'));
    if (savedSettings) State.settings = { ...State.settings, ...savedSettings };
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }

  // Load History from LocalStorage
  try {
    State.history = JSON.parse(localStorage.getItem('omnistream_history') || '[]');
  } catch (e) {
    State.history = [];
  }

  function saveHistory() {
    try {
      localStorage.setItem('omnistream_history', JSON.stringify(State.history.slice(0, 50)));
    } catch (e) {}
    updateHistoryBadges();
  }

  function saveSettings() {
    try {
      localStorage.setItem('omnistream_settings', JSON.stringify(State.settings));
      showToast('Settings saved successfully', 'success');
    } catch (e) {
      showToast('Could not save settings', 'error');
    }
  }

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  // Views
  const views = {
    downloader: document.getElementById('view-downloader'),
    downloads: document.getElementById('view-downloads'),
    history: document.getElementById('view-history'),
    platforms: document.getElementById('view-platforms'),
    settings: document.getElementById('view-settings'),
    help: document.getElementById('view-help')
  };

  const topbarTitle = document.getElementById('topbar-active-view-title');
  const sidebarNavBtns = document.querySelectorAll('.nav-item-btn[data-view]');
  const sidebarQueueBadge = document.getElementById('sidebar-queue-badge');
  const sidebarHistoryBadge = document.getElementById('sidebar-history-badge');
  const sidebarEngineStatus = document.getElementById('sidebar-engine-status');

  // Downloader Components
  const timeGreeting = document.getElementById('time-greeting');
  const urlCardDropzone = document.getElementById('url-input-card');
  const mainUrlInput = document.getElementById('main-url-input');
  const btnPasteUrl = document.getElementById('btn-paste-url');
  const btnClearUrl = document.getElementById('btn-clear-url');
  const btnAnalyze = document.getElementById('btn-analyze');
  const urlPlatformIcon = document.getElementById('url-platform-icon');
  const platformPills = document.querySelectorAll('.platform-pill[data-platform]');
  const btnViewAllPlatforms = document.getElementById('btn-view-all-platforms');

  // Skeleton / Analysis states
  const analysisProgressCard = document.getElementById('analysis-progress-card');
  const analysisStatusText = document.getElementById('analysis-status-text');
  const stepResolve = document.getElementById('step-resolve');
  const stepStreams = document.getElementById('step-streams');
  const stepH264 = document.getElementById('step-h264');
  const analysisErrorCard = document.getElementById('analysis-error-card');
  const errorCardTitle = document.getElementById('error-card-title');
  const errorCardMsg = document.getElementById('error-card-msg');
  const btnRetryAnalysis = document.getElementById('btn-retry-analysis');

  // Inspector card
  const inspectorCard = document.getElementById('inspector-card');
  const btnDismissInspector = document.getElementById('btn-dismiss-inspector');
  const inspectorThumb = document.getElementById('inspector-thumb');
  const inspectorDuration = document.getElementById('inspector-duration');
  const inspectorTitle = document.getElementById('inspector-title');
  const inspectorChannel = document.getElementById('inspector-channel');
  const inspectorViews = document.getElementById('inspector-views');
  const inspectorPlatformBadge = document.getElementById('inspector-platform-badge');
  const segmentBtnVideo = document.getElementById('segment-btn-video');
  const segmentBtnAudio = document.getElementById('segment-btn-audio');
  const recommendedBox = document.getElementById('recommended-box');
  const recTitleText = document.getElementById('rec-title-text');
  const recDescText = document.getElementById('rec-desc-text');
  const recSizeText = document.getElementById('rec-size-text');
  const btnToggleDisclosure = document.getElementById('btn-toggle-disclosure');
  const toggleDisclosureText = document.getElementById('toggle-disclosure-text');
  const toggleDisclosureArrow = document.getElementById('toggle-disclosure-arrow');
  const qualitySelectionGrid = document.getElementById('quality-selection-grid');
  const btnStartDownload = document.getElementById('btn-start-download');
  const btnStartDownloadLabel = document.getElementById('btn-start-download-label');
  const btnInstantDirect = document.getElementById('btn-instant-direct');
  const btnInstantDirectLabel = document.getElementById('btn-instant-direct-label');

  // Inline Download Card
  const inlineDownloadCard = document.getElementById('inline-download-card');
  const inlineDlTitle = document.getElementById('inline-dl-title');
  const inlineDlStatus = document.getElementById('inline-dl-status');
  const inlineDlStatusLabel = document.getElementById('inline-dl-status-label');
  const inlineDlProgressFill = document.getElementById('inline-dl-progress-fill');
  const inlineDlPct = document.getElementById('inline-dl-pct');
  const inlineDlSpeed = document.getElementById('inline-dl-speed');
  const inlineDlDownloaded = document.getElementById('inline-dl-downloaded');
  const inlineDlTotal = document.getElementById('inline-dl-total');
  const inlineDlEta = document.getElementById('inline-dl-eta');
  const inlineDlCompletedActions = document.getElementById('inline-dl-completed-actions');
  const inlineDlErrorBox = document.getElementById('inline-dl-error-box');
  const inlineDlErrorMsg = document.getElementById('inline-dl-error-msg');
  const btnInlineFallbackDirect = document.getElementById('btn-inline-fallback-direct');
  const btnInlineDirectDownload = document.getElementById('btn-inline-direct-download');
  const btnInlineOpenFolder = document.getElementById('btn-inline-open-folder');
  const btnInlineCancel = document.getElementById('btn-inline-cancel');

  // Downloads Queue Manager
  const downloadsListContainer = document.getElementById('downloads-list-container');
  const downloadsEmptyState = document.getElementById('downloads-empty-state');
  const downloadsSearchInput = document.getElementById('downloads-search-input');
  const btnRefreshDownloads = document.getElementById('btn-refresh-downloads');
  const filterPillBtns = document.querySelectorAll('.filter-pill-btn[data-filter]');

  // History View & Drawer
  const historyListContainer = document.getElementById('history-list-container');
  const historyEmptyState = document.getElementById('history-empty-state');
  const historySearchInput = document.getElementById('history-search-input');
  const btnClearHistoryAll = document.getElementById('btn-clear-history-all');
  const historyDrawer = document.getElementById('history-drawer');
  const drawerHistoryList = document.getElementById('drawer-history-list');
  const btnOpenHistoryDrawer = document.getElementById('btn-open-history-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');

  // Supported Platforms View
  const platformsGridContainer = document.getElementById('platforms-grid-container');
  const platformsSearchInput = document.getElementById('platforms-search-input');
  const platformCategoryFilters = document.querySelectorAll('#platform-category-filters .filter-pill-btn');

  // Settings View
  const settingDefaultQuality = document.getElementById('setting-default-quality');
  const settingAudioBitrate = document.getElementById('setting-audio-bitrate');
  const settingStrictH264 = document.getElementById('setting-strict-h264');
  const settingAutoReveal = document.getElementById('setting-auto-reveal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnSettingsOpenDir = document.getElementById('btn-settings-open-dir');
  const btnPurgeCache = document.getElementById('btn-purge-cache');

  // Modals
  const paletteModal = document.getElementById('palette-modal');
  const btnTriggerPalette = document.getElementById('btn-trigger-palette');
  const paletteSearchInput = document.getElementById('palette-search-input');
  const paletteResultsContainer = document.getElementById('palette-results-container');

  const diagnosticsModal = document.getElementById('diagnostics-modal');
  const btnDiagnosticsBadge = document.getElementById('btn-diagnostics-badge');
  const btnCloseDiagnostics = document.getElementById('btn-close-diagnostics');
  const btnDismissDiagBtn = document.getElementById('btn-dismiss-diag-btn');
  const btnRefreshDiag = document.getElementById('btn-refresh-diag');

  const toastContainer = document.getElementById('toast-container');
  const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
  const appSidebar = document.getElementById('app-sidebar');

  // ==========================================
  // VIEW ROUTER
  // ==========================================
  const viewTitles = {
    downloader: 'Downloader',
    downloads: 'Downloads Queue',
    history: 'Download History',
    platforms: 'Supported Platforms',
    settings: 'Settings',
    help: 'Help & Responsible Use'
  };

  function switchView(viewName) {
    if (!views[viewName]) return;
    State.currentView = viewName;

    // Toggle active classes on pages
    Object.keys(views).forEach(key => {
      if (views[key]) {
        if (key === viewName) {
          views[key].classList.add('active');
        } else {
          views[key].classList.remove('active');
        }
      }
    });

    // Update Sidebar active state
    sidebarNavBtns.forEach(btn => {
      if (btn.getAttribute('data-view') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Topbar Title
    if (topbarTitle) {
      topbarTitle.textContent = viewTitles[viewName] || 'Downloader';
    }

    // Scroll viewport to top
    const viewport = document.getElementById('main-viewport');
    if (viewport) viewport.scrollTop = 0;

    // Close mobile sidebar if open
    if (appSidebar) appSidebar.classList.remove('mobile-open');

    // Trigger view-specific loads
    if (viewName === 'downloads') {
      fetchDownloadsQueue();
    } else if (viewName === 'history') {
      renderHistoryView();
    } else if (viewName === 'platforms') {
      renderPlatformsDirectory();
    } else if (viewName === 'settings') {
      populateSettingsForm();
    }
  }

  sidebarNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      switchView(view);
    });
  });

  // Delegated switch view buttons in HTML
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-switch-view]');
    if (target) {
      e.preventDefault();
      const v = target.getAttribute('data-switch-view');
      switchView(v);
    }
  });

  if (mobileSidebarToggle) {
    mobileSidebarToggle.addEventListener('click', () => {
      appSidebar.classList.toggle('mobile-open');
    });
  }

  // ==========================================
  // TIME GREETING
  // ==========================================
  function updateTimeGreeting() {
    if (!timeGreeting) return;
    const hour = new Date().getHours();
    let text = 'Good morning';
    if (hour >= 12 && hour < 17) text = 'Good afternoon';
    else if (hour >= 17) text = 'Good evening';
    timeGreeting.textContent = `${text} • OmniStream Media Workspace`;
  }
  updateTimeGreeting();

  // ==========================================
  // PLATFORM DETECTION & ICONS
  // ==========================================
  const platformSvgs = {
    generic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    youtube: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    tiktok: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
    reddit: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z"/></svg>`
  };

  function detectPlatform(url) {
    const u = (url || '').toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('instagram.com')) return 'instagram';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('reddit.com')) return 'reddit';
    return 'generic';
  }

  function handleUrlInputChange() {
    const val = mainUrlInput.value.trim();
    if (btnClearUrl) btnClearUrl.style.display = val ? 'flex' : 'none';

    const platform = detectPlatform(val);
    if (urlPlatformIcon) {
      urlPlatformIcon.className = `url-platform-icon ${platform !== 'generic' ? `platform-${platform}` : ''}`;
      urlPlatformIcon.innerHTML = platformSvgs[platform] || platformSvgs.generic;
    }

    platformPills.forEach(pill => {
      if (pill.getAttribute('data-platform') === platform) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  mainUrlInput.addEventListener('input', handleUrlInputChange);

  // Paste Tool Button
  if (btnPasteUrl) {
    btnPasteUrl.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          mainUrlInput.value = text.trim();
          handleUrlInputChange();
          showToast('URL pasted from clipboard', 'info');
          triggerMediaAnalysis();
        }
      } catch (err) {
        showToast('Clipboard access denied. Please paste manually.', 'error');
      }
    });
  }

  // Clear Input Button
  if (btnClearUrl) {
    btnClearUrl.addEventListener('click', () => {
      mainUrlInput.value = '';
      handleUrlInputChange();
      mainUrlInput.focus();
    });
  }

  // Drag & Drop on URL Card
  if (urlCardDropzone) {
    urlCardDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      urlCardDropzone.classList.add('drag-active');
    });

    urlCardDropzone.addEventListener('dragleave', () => {
      urlCardDropzone.classList.remove('drag-active');
    });

    urlCardDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      urlCardDropzone.classList.remove('drag-active');
      const text = e.dataTransfer.getData('text/plain');
      if (text) {
        mainUrlInput.value = text.trim();
        handleUrlInputChange();
        showToast('URL detected from drop', 'info');
        triggerMediaAnalysis();
      }
    });
  }

  // "1000 More Sites" button
  if (btnViewAllPlatforms) {
    btnViewAllPlatforms.addEventListener('click', () => switchView('platforms'));
  }

  // ==========================================
  // MEDIA STREAM ANALYSIS WITH SKELETON
  // ==========================================
  async function triggerMediaAnalysis() {
    const url = mainUrlInput.value.trim();
    if (!url) {
      showToast('Please enter a video URL first', 'error');
      mainUrlInput.focus();
      return;
    }

    // Hide results & errors, show skeleton
    if (analysisErrorCard) analysisErrorCard.style.display = 'none';
    if (inspectorCard) inspectorCard.style.display = 'none';
    if (analysisProgressCard) analysisProgressCard.style.display = 'block';

    // Reset skeleton steps
    resetSkeletonSteps();

    btnAnalyze.disabled = true;

    // Visual step sequence
    const stepTimer1 = setTimeout(() => {
      setStepActive(stepStreams);
    }, 450);

    const stepTimer2 = setTimeout(() => {
      setStepActive(stepH264);
    }, 900);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect stream. The link may be private or invalid.');
      }

      State.currentMedia = data.media;
      renderInspectorCard(data.media);

    } catch (err) {
      showAnalysisError(err.message);
    } finally {
      if (analysisProgressCard) analysisProgressCard.style.display = 'none';
      btnAnalyze.disabled = false;
    }
  }

  function resetSkeletonSteps() {
    if (!stepResolve || !stepStreams || !stepH264) return;
    stepResolve.className = 'step-item active';
    stepStreams.className = 'step-item pending';
    stepH264.className = 'step-item pending';
  }

  function setStepActive(stepEl) {
    if (!stepEl) return;
    // Mark previous done
    if (stepEl === stepStreams && stepResolve) stepResolve.className = 'step-item done';
    if (stepEl === stepH264 && stepStreams) stepStreams.className = 'step-item done';
    stepEl.className = 'step-item active';
  }

  function showAnalysisError(msg) {
    if (analysisErrorCard) {
      errorCardMsg.textContent = msg;
      analysisErrorCard.style.display = 'flex';
      analysisErrorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(msg, 'error');
  }

  if (btnAnalyze) btnAnalyze.addEventListener('click', triggerMediaAnalysis);
  mainUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerMediaAnalysis();
  });
  if (btnRetryAnalysis) btnRetryAnalysis.addEventListener('click', triggerMediaAnalysis);

  // ==========================================
  // STREAM INSPECTOR & PROGRESSIVE DISCLOSURE
  // ==========================================
  function renderInspectorCard(media) {
    if (!inspectorCard) return;

    inspectorThumb.src = media.thumbnail || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" fill="%230E182B"><rect width="100%" height="100%" fill="%230E182B"/></svg>';
    inspectorDuration.textContent = media.duration || 'Video';
    inspectorTitle.textContent = media.title || 'Untitled Media Stream';
    inspectorChannel.textContent = media.uploader || 'Creator';
    inspectorViews.textContent = media.views ? `${media.views} views` : 'Stream Ready';
    inspectorPlatformBadge.textContent = media.platform || 'Online Media';

    // Reset formats disclosure
    State.isExpandedFormats = false;
    if (qualitySelectionGrid) qualitySelectionGrid.style.display = 'none';
    if (toggleDisclosureArrow) toggleDisclosureArrow.style.transform = 'rotate(0deg)';

    // Switch to default format (from settings or Video)
    if (State.settings.defaultQuality === 'audio') {
      setFormatType('audio');
    } else {
      setFormatType('video');
    }

    inspectorCard.style.display = 'block';
    inspectorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (btnDismissInspector) {
    btnDismissInspector.addEventListener('click', () => {
      inspectorCard.style.display = 'none';
      State.currentMedia = null;
    });
  }

  function setFormatType(type) {
    State.activeTab = type;
    if (type === 'video') {
      segmentBtnVideo.classList.add('active');
      segmentBtnAudio.classList.remove('active');
      renderVideoFormats();
    } else {
      segmentBtnAudio.classList.add('active');
      segmentBtnVideo.classList.remove('active');
      renderAudioFormats();
    }
  }

  if (segmentBtnVideo) segmentBtnVideo.addEventListener('click', () => setFormatType('video'));
  if (segmentBtnAudio) segmentBtnAudio.addEventListener('click', () => setFormatType('audio'));

  // Direct Stream Browser Downloader
  function triggerDirectDownload(directUrl, title) {
    if (!directUrl) {
      showToast('No direct stream link available for this source', 'error');
      return;
    }
    showToast('Starting instant stream download...', 'info');
    const safeTitle = (title || 'video').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().substring(0, 50) || 'video';
    const proxyUrl = `/api/stream?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(safeTitle + '.mp4')}`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.setAttribute('download', `${safeTitle}.mp4`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (btnInstantDirect) {
    btnInstantDirect.addEventListener('click', () => {
      const targetUrl = State.selectedQuality?.direct_url || State.currentMedia?.direct_download_url;
      triggerDirectDownload(targetUrl, State.currentMedia?.title);
    });
  }

  // Render Video Quality Options
  function renderVideoFormats() {
    const formats = State.currentMedia?.video_formats || [];
    qualitySelectionGrid.innerHTML = '';

    if (formats.length === 0) {
      // Fallback format
      State.selectedQuality = { height: 1080, label: '1080p FHD', ext: 'mp4' };
      recTitleText.textContent = 'Best Available MP4';
      recDescText.textContent = 'Universal H.264 profile + AAC stereo audio';
      recSizeText.textContent = 'Direct Stream';
      btnStartDownloadLabel.textContent = 'Download Best Quality MP4';
      if (btnInstantDirect) btnInstantDirect.style.display = 'none';
      return;
    }

    // Recommended is highest available resolution (e.g. 1080p)
    const recommended = formats[0];
    State.selectedQuality = recommended;

    recTitleText.textContent = `${recommended.label || `${recommended.height}p`} MP4`;
    recDescText.textContent = 'Enforced H.264 (avc1) + AAC 192k • Universal Windows & Mobile';
    recSizeText.textContent = recommended.size_formatted || 'Auto Bitrate';
    btnStartDownloadLabel.textContent = `Download ${recommended.label || `${recommended.height}p`} MP4`;

    // Direct save button visibility
    const directStreamUrl = recommended.direct_url || State.currentMedia?.direct_download_url;
    if (btnInstantDirect) {
      if (directStreamUrl) {
        btnInstantDirect.style.display = 'inline-flex';
        btnInstantDirectLabel.textContent = `Direct Save (${recommended.label || 'MP4'})`;
      } else {
        btnInstantDirect.style.display = 'none';
      }
    }

    // Populate expandable grid
    formats.forEach((fmt, idx) => {
      const cell = document.createElement('div');
      cell.className = `quality-cell ${idx === 0 ? 'selected' : ''}`;
      cell.innerHTML = `
        <span class="quality-res-text">${fmt.label || `${fmt.height}p`}</span>
        <span class="quality-size-text">${fmt.size_formatted || 'Standard'}</span>
      `;
      cell.addEventListener('click', () => {
        document.querySelectorAll('.quality-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        State.selectedQuality = fmt;
        btnStartDownloadLabel.textContent = `Download ${fmt.label || `${fmt.height}p`} MP4`;
        if (btnInstantDirect) {
          const cellDirect = fmt.direct_url || State.currentMedia?.direct_download_url;
          if (cellDirect) {
            btnInstantDirect.style.display = 'inline-flex';
            btnInstantDirectLabel.textContent = `Direct Save (${fmt.label || 'MP4'})`;
          }
        }
      });
      qualitySelectionGrid.appendChild(cell);
    });

    if (toggleDisclosureText) {
      toggleDisclosureText.textContent = `Show all available resolutions (${formats.length})`;
    }
  }

  // Render Audio Format Options
  function renderAudioFormats() {
    qualitySelectionGrid.innerHTML = '';
    const audioFmt = {
      type: 'audio',
      label: 'MP3 Audio (Lossless Extract)',
      ext: 'mp3',
      bitrate: `${State.settings.audioBitrate || '320'} kbps`
    };
    State.selectedQuality = audioFmt;

    recTitleText.textContent = `Standalone MP3 Audio (${audioFmt.bitrate})`;
    recDescText.textContent = 'High-bitrate VBR MP3 with ID3 track & artist metadata';
    recSizeText.textContent = '~5 - 15 MB';
    btnStartDownloadLabel.textContent = `Download ${audioFmt.bitrate} MP3`;

    if (btnInstantDirect) {
      btnInstantDirect.style.display = 'none';
    }

    // Audio bitrates grid
    const bitrates = ['320 kbps (Studio)', '256 kbps (HQ)', '192 kbps (Standard)', '128 kbps (Compact)'];
    bitrates.forEach((br, i) => {
      const cell = document.createElement('div');
      cell.className = `quality-cell ${i === 0 ? 'selected' : ''}`;
      cell.innerHTML = `
        <span class="quality-res-text">${br.split(' ')[0]}</span>
        <span class="quality-size-text">${br.split(' ')[1] || 'MP3'}</span>
      `;
      cell.addEventListener('click', () => {
        document.querySelectorAll('.quality-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        State.selectedQuality.bitrate = br.split(' ')[0];
        btnStartDownloadLabel.textContent = `Download ${br.split(' ')[0]} MP3`;
      });
      qualitySelectionGrid.appendChild(cell);
    });

    if (toggleDisclosureText) {
      toggleDisclosureText.textContent = 'Select custom audio bitrates (4)';
    }
  }

  // Progressive Disclosure Toggle
  if (btnToggleDisclosure) {
    btnToggleDisclosure.addEventListener('click', () => {
      State.isExpandedFormats = !State.isExpandedFormats;
      if (State.isExpandedFormats) {
        qualitySelectionGrid.style.display = 'grid';
        toggleDisclosureArrow.style.transform = 'rotate(180deg)';
      } else {
        qualitySelectionGrid.style.display = 'none';
        toggleDisclosureArrow.style.transform = 'rotate(0deg)';
      }
    });
  }

  // ==========================================
  // DISPATCH DOWNLOAD & ACTIVE TRACKING
  // ==========================================
  if (btnStartDownload) {
    btnStartDownload.addEventListener('click', async () => {
      if (!State.currentMedia) return;

      const payload = {
        url: State.currentMedia.original_url,
        type: State.activeTab,
        height: State.activeTab === 'video' ? (State.selectedQuality?.height || 1080) : null,
        title: State.currentMedia.title
      };

      try {
        btnStartDownload.disabled = true;
        btnStartDownload.innerHTML = `<span class="spin-icon">⏳</span> Dispatching to Local Engine...`;

        const res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to start download job.');
        }

        const taskId = data.task_id;
        State.inlineTaskId = taskId;

        showToast('Download started in background', 'success');

        // Reveal inline progress card
        showInlineDownloadCard(taskId, State.currentMedia.title);

        // Start Polling for this task
        startTaskPolling(taskId, State.currentMedia);

        // Switch or update Queue badge
        updateQueueBadges();

      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnStartDownload.disabled = false;
        btnStartDownloadLabel.textContent = State.activeTab === 'video'
          ? `Download ${State.selectedQuality?.label || '1080p'} MP4`
          : `Download ${State.selectedQuality?.bitrate || '320k'} MP3`;
        btnStartDownload.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span id="btn-start-download-label">${btnStartDownloadLabel.textContent}</span>
        `;
      }
    });
  }

  function showInlineDownloadCard(taskId, title) {
    if (!inlineDownloadCard) return;
    inlineDlTitle.textContent = title;
    inlineDlStatusLabel.textContent = 'Connecting stream...';
    inlineDlStatus.className = 'dl-status-badge';
    inlineDlStatus.style.borderColor = '';
    inlineDlStatus.style.color = '';
    inlineDlProgressFill.style.width = '5%';
    inlineDlPct.textContent = '5%';
    inlineDlSpeed.textContent = 'Negotiating TCP';
    inlineDlEta.textContent = 'Estimating';
    inlineDlDownloaded.textContent = '0 MB';
    inlineDlTotal.textContent = 'Probing';
    if (inlineDlCompletedActions) inlineDlCompletedActions.style.display = 'none';
    if (inlineDlErrorBox) inlineDlErrorBox.style.display = 'none';
    inlineDownloadCard.style.display = 'block';
    inlineDownloadCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Cancel Active Job
  if (btnInlineCancel) {
    btnInlineCancel.addEventListener('click', async () => {
      if (!State.inlineTaskId) return;
      try {
        await fetch(`/api/cancel/${State.inlineTaskId}`, { method: 'POST' });
        showToast('Download cancelled', 'info');
        stopTaskPolling(State.inlineTaskId);
        inlineDownloadCard.style.display = 'none';
      } catch (e) {
        showToast('Could not cancel task', 'error');
      }
    });
  }

  // Task Polling Loop
  function startTaskPolling(taskId, mediaInfo) {
    if (State.activePollers[taskId]) clearInterval(State.activePollers[taskId]);

    State.activeTasks[taskId] = {
      taskId,
      title: mediaInfo?.title || 'Video Stream',
      thumbnail: mediaInfo?.thumbnail,
      platform: mediaInfo?.platform,
      status: 'downloading',
      progress: 5
    };

    State.activePollers[taskId] = setInterval(async () => {
      try {
        const res = await fetch(`/api/progress/${taskId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success || !data.task) return;

        const task = data.task;
        State.activeTasks[taskId] = { ...State.activeTasks[taskId], ...task };

        updateInlineProgress(task);
        updateDownloadsManagerRow(taskId, task);

        if (task.status === 'completed') {
          stopTaskPolling(taskId);
          handleTaskCompleted(taskId, task, mediaInfo);
        } else if (task.status === 'error' || task.status === 'cancelled') {
          stopTaskPolling(taskId);
          handleTaskFailed(taskId, task);
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    }, 450);
  }

  function stopTaskPolling(taskId) {
    if (State.activePollers[taskId]) {
      clearInterval(State.activePollers[taskId]);
      delete State.activePollers[taskId];
    }
  }

  function updateInlineProgress(task) {
    if (State.inlineTaskId !== task.task_id) return;

    const pct = Math.max(5, Math.min(100, task.progress || 0));
    inlineDlProgressFill.style.width = `${pct}%`;
    inlineDlPct.textContent = `${Math.round(pct)}%`;

    if (task.status === 'merging') {
      inlineDlStatusLabel.textContent = 'Muxing H.264 & AAC with FFmpeg...';
      inlineDlSpeed.textContent = 'Local Mux';
      inlineDlEta.textContent = 'Finalizing';
    } else if (task.status === 'downloading') {
      inlineDlStatusLabel.textContent = 'Downloading media payload...';
      inlineDlSpeed.textContent = task.speed || 'Downloading';
      inlineDlEta.textContent = task.eta || '--';
      inlineDlDownloaded.textContent = task.file_size || `${Math.round(pct)}%`;
      inlineDlTotal.textContent = 'Direct';
    }
  }

  function handleTaskCompleted(taskId, task, mediaInfo) {
    if (State.inlineTaskId === taskId) {
      inlineDlStatusLabel.textContent = 'Download Complete!';
      inlineDlStatus.className = 'dl-status-badge completed';
      inlineDlProgressFill.style.width = '100%';
      inlineDlPct.textContent = '100%';
      inlineDlSpeed.textContent = task.file_size || 'Saved';
      inlineDlEta.textContent = 'Done';

      const ext = task.media_type === 'audio' ? '.mp3' : '.mp4';
      let safeName = task.filename || `video_${taskId}${ext}`;
      if (!safeName.toLowerCase().endsWith('.mp4') && !safeName.toLowerCase().endsWith('.mp3')) {
        safeName += ext;
      }

      if (btnInlineDirectDownload) {
        btnInlineDirectDownload.href = `/api/file/${taskId}`;
        btnInlineDirectDownload.setAttribute('download', safeName);
      }

      if (btnInlineOpenFolder) {
        btnInlineOpenFolder.onclick = async () => {
          try {
            await fetch(`/api/open-folder/${taskId}`, { method: 'POST' });
            showToast('Opened in Windows Explorer!', 'success');
          } catch {
            showToast('Unable to open Explorer folder', 'error');
          }
        };
      }

      if (inlineDlCompletedActions) inlineDlCompletedActions.style.display = 'flex';

      // Automatically trigger browser download to save directly into Downloads folder
      const downloadUrl = `/api/file/${taskId}`;
      const dlLink = document.createElement('a');
      dlLink.href = downloadUrl;
      dlLink.setAttribute('download', safeName);
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
    }

    // Automatic reveal in Explorer if enabled in settings
    if (State.settings.autoReveal) {
      fetch(`/api/open-folder/${taskId}`, { method: 'POST' }).catch(() => {});
    }

    // Add to history
    const historyItem = {
      id: taskId,
      title: task.filename || mediaInfo?.title || `Media_${taskId}`,
      thumbnail: mediaInfo?.thumbnail,
      platform: mediaInfo?.platform || 'Direct',
      size: task.file_size || 'Saved',
      type: task.media_type || 'video',
      url: mediaInfo?.original_url,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    State.history.unshift(historyItem);
    saveHistory();
    showToast(`Successfully saved: ${historyItem.title}`, 'success');
    updateQueueBadges();
  }

  function handleTaskFailed(taskId, task) {
    if (State.inlineTaskId === taskId) {
      inlineDlStatusLabel.textContent = 'Processing Halted';
      inlineDlStatus.style.borderColor = 'var(--error)';
      inlineDlStatus.style.color = 'var(--error)';
      inlineDlSpeed.textContent = 'Error';
      inlineDlEta.textContent = 'Halted';

      const cleanMsg = task.error || 'Server processing could not complete on this environment.';
      if (inlineDlErrorBox) {
        inlineDlErrorMsg.textContent = cleanMsg;
        inlineDlErrorBox.style.display = 'flex';

        const fallbackUrl = State.selectedQuality?.direct_url || State.currentMedia?.direct_download_url;
        if (fallbackUrl && btnInlineFallbackDirect) {
          btnInlineFallbackDirect.style.display = 'inline-block';
          btnInlineFallbackDirect.onclick = () => {
            triggerDirectDownload(fallbackUrl, State.currentMedia?.title);
          };
        } else if (btnInlineFallbackDirect) {
          btnInlineFallbackDirect.style.display = 'none';
        }
      }
      showToast(cleanMsg, 'error');
    }
    updateQueueBadges();
  }

  function updateQueueBadges() {
    const activeCount = Object.values(State.activeTasks).filter(t => t.status === 'downloading' || t.status === 'merging').length;
    if (sidebarQueueBadge) {
      if (activeCount > 0) {
        sidebarQueueBadge.textContent = activeCount;
        sidebarQueueBadge.style.display = 'inline-block';
      } else {
        sidebarQueueBadge.style.display = 'none';
      }
    }
  }

  function updateHistoryBadges() {
    if (sidebarHistoryBadge) {
      sidebarHistoryBadge.textContent = State.history.length;
    }
  }
  updateHistoryBadges();

  // ==========================================
  // VIEW: DOWNLOADS MANAGER
  // ==========================================
  let currentDownloadsFilter = 'all';

  async function fetchDownloadsQueue() {
    try {
      const res = await fetch('/api/downloads');
      const data = await res.json();
      if (data.success && data.downloads) {
        renderDownloadsQueue(data.downloads);
      }
    } catch (e) {
      console.warn('Queue fetch error:', e);
    }
  }

  if (btnRefreshDownloads) {
    btnRefreshDownloads.addEventListener('click', () => {
      fetchDownloadsQueue();
      showToast('Queue refreshed', 'info');
    });
  }

  filterPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterPillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDownloadsFilter = btn.getAttribute('data-filter');
      fetchDownloadsQueue();
    });
  });

  if (downloadsSearchInput) {
    downloadsSearchInput.addEventListener('input', () => {
      fetchDownloadsQueue();
    });
  }

  function renderDownloadsQueue(downloads) {
    if (!downloadsListContainer) return;
    downloadsListContainer.innerHTML = '';

    const searchTerm = (downloadsSearchInput?.value || '').toLowerCase();

    // Filter tasks
    const filtered = downloads.filter(task => {
      const matchesSearch = !searchTerm || (task.title && task.title.toLowerCase().includes(searchTerm)) || (task.filename && task.filename.toLowerCase().includes(searchTerm));
      if (!matchesSearch) return false;

      if (currentDownloadsFilter === 'active') {
        return task.status === 'downloading' || task.status === 'merging';
      }
      if (currentDownloadsFilter === 'completed') {
        return task.status === 'completed';
      }
      if (currentDownloadsFilter === 'failed') {
        return task.status === 'error' || task.status === 'cancelled';
      }
      return true;
    });

    if (filtered.length === 0) {
      if (downloadsEmptyState) downloadsEmptyState.style.display = 'flex';
      return;
    }

    if (downloadsEmptyState) downloadsEmptyState.style.display = 'none';

    filtered.forEach(task => {
      const row = createDownloadRow(task);
      downloadsListContainer.appendChild(row);
    });
  }

  function createDownloadRow(task) {
    const card = document.createElement('div');
    card.className = 'download-row-card';
    card.id = `dl-row-${task.task_id}`;

    const isDone = task.status === 'completed';
    const isError = task.status === 'error' || task.status === 'cancelled';
    const isAudio = task.media_type === 'audio';

    const iconSvg = isAudio
      ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;

    const statusPillHtml = isDone
      ? `<span class="platform-status-badge">Completed</span>`
      : (isError
        ? `<span class="platform-status-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--error);">Failed</span>`
        : `<span class="platform-status-badge" style="background: var(--accent-cyan-dim); color: var(--accent-cyan);">${Math.round(task.progress || 0)}%</span>`);

    card.innerHTML = `
      <div class="row-file-icon">${iconSvg}</div>
      <div class="row-file-info">
        <div class="row-title" title="${task.title || task.filename}">${task.title || task.filename}</div>
        <div class="row-meta">
          <span>${statusPillHtml}</span>
          <span>•</span>
          <span>${task.file_size || (isDone ? 'Saved' : 'Processing')}</span>
          <span>•</span>
          <span>${task.speed || task.eta || ''}</span>
        </div>
      </div>
      <div class="row-actions">
        ${isDone ? `
          <button class="btn-row-action" data-action="reveal" data-id="${task.task_id}">
            Reveal in Explorer
          </button>
          <a href="/api/file/${task.task_id}" class="btn-row-action" style="text-decoration: none;" download>
            Save
          </a>
        ` : (isError ? `
          <button class="btn-row-action" data-action="retry" data-id="${task.task_id}">
            Retry
          </button>
        ` : `
          <button class="btn-row-action" data-action="cancel" data-id="${task.task_id}" style="color: var(--error);">
            Cancel
          </button>
        `)}
      </div>
    `;

    // Action clicks
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        if (action === 'reveal') {
          try {
            await fetch(`/api/open-folder/${id}`, { method: 'POST' });
            showToast('Opened folder in Windows Explorer', 'success');
          } catch {
            showToast('Could not open folder', 'error');
          }
        } else if (action === 'cancel') {
          await fetch(`/api/cancel/${id}`, { method: 'POST' });
          fetchDownloadsQueue();
        } else if (action === 'retry') {
          switchView('downloader');
        }
      });
    });

    return card;
  }

  function updateDownloadsManagerRow(taskId, task) {
    const row = document.getElementById(`dl-row-${taskId}`);
    if (row) {
      const isDone = task.status === 'completed';
      const isError = task.status === 'error';
      const metaSpan = row.querySelector('.row-meta');
      if (metaSpan) {
        metaSpan.innerHTML = `
          <span>${isDone ? 'Completed' : (isError ? 'Failed' : `${Math.round(task.progress || 0)}%`)}</span>
          <span>•</span>
          <span>${task.file_size || task.speed || 'Processing'}</span>
        `;
      }
    }
  }

  // ==========================================
  // VIEW: HISTORY MANAGEMENT
  // ==========================================
  function renderHistoryView() {
    if (!historyListContainer) return;
    historyListContainer.innerHTML = '';

    const searchTerm = (historySearchInput?.value || '').toLowerCase();
    const filtered = State.history.filter(item => {
      return !searchTerm || (item.title && item.title.toLowerCase().includes(searchTerm)) || (item.platform && item.platform.toLowerCase().includes(searchTerm));
    });

    if (filtered.length === 0) {
      if (historyEmptyState) historyEmptyState.style.display = 'flex';
      return;
    }

    if (historyEmptyState) historyEmptyState.style.display = 'none';

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'download-row-card';
      card.innerHTML = `
        <div class="row-file-icon">
          ${item.thumbnail
            ? `<img src="${item.thumbnail}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`
            : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
          }
        </div>
        <div class="row-file-info">
          <div class="row-title" title="${item.title}">${item.title}</div>
          <div class="row-meta">
            <span>${item.platform || 'Online'}</span>
            <span>•</span>
            <span>${item.size || 'Completed'}</span>
            <span>•</span>
            <span>${item.timestamp || ''}</span>
          </div>
        </div>
        <div class="row-actions">
          ${item.id ? `
            <button class="btn-row-action" data-reveal-id="${item.id}">
              Reveal in Explorer
            </button>
          ` : ''}
          ${item.url ? `
            <button class="btn-row-action" data-reanalyze="${encodeURIComponent(item.url)}">
              Analyze Again
            </button>
          ` : ''}
        </div>
      `;

      card.querySelectorAll('[data-reveal-id]').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-reveal-id');
          await fetch(`/api/open-folder/${id}`, { method: 'POST' });
          showToast('Folder opened', 'success');
        });
      });

      card.querySelectorAll('[data-reanalyze]').forEach(b => {
        b.addEventListener('click', () => {
          const url = decodeURIComponent(b.getAttribute('data-reanalyze'));
          mainUrlInput.value = url;
          handleUrlInputChange();
          switchView('downloader');
          triggerMediaAnalysis();
        });
      });

      historyListContainer.appendChild(card);
    });
  }

  if (historySearchInput) {
    historySearchInput.addEventListener('input', renderHistoryView);
  }

  if (btnClearHistoryAll) {
    btnClearHistoryAll.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your local download history?')) {
        State.history = [];
        saveHistory();
        renderHistoryView();
        showToast('Download history cleared', 'success');
      }
    });
  }

  // History Drawer (Quick View from Topbar)
  function toggleHistoryDrawer(open) {
    if (!historyDrawer) return;
    if (open) {
      populateDrawerHistory();
      historyDrawer.classList.add('open');
    } else {
      historyDrawer.classList.remove('open');
    }
  }

  function populateDrawerHistory() {
    if (!drawerHistoryList) return;
    drawerHistoryList.innerHTML = '';

    if (State.history.length === 0) {
      drawerHistoryList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px 0;">No recent downloads</div>`;
      return;
    }

    State.history.slice(0, 15).forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'download-row-card';
      itemEl.style.padding = '8px 12px';
      itemEl.innerHTML = `
        <div class="row-file-info">
          <div class="row-title" style="font-size: 0.82rem;" title="${item.title}">${item.title}</div>
          <div class="row-meta" style="font-size: 0.7rem;">
            <span>${item.platform || 'Media'}</span>
            <span>•</span>
            <span>${item.size || 'Ready'}</span>
          </div>
        </div>
        ${item.id ? `
          <button class="btn-row-action" data-drawer-reveal="${item.id}" style="padding: 4px 8px; font-size: 0.72rem;">
            Reveal
          </button>
        ` : ''}
      `;

      itemEl.querySelectorAll('[data-drawer-reveal]').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-drawer-reveal');
          await fetch(`/api/open-folder/${id}`, { method: 'POST' });
          showToast('Folder opened', 'success');
        });
      });

      drawerHistoryList.appendChild(itemEl);
    });
  }

  if (btnOpenHistoryDrawer) {
    btnOpenHistoryDrawer.addEventListener('click', () => toggleHistoryDrawer(true));
  }
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => toggleHistoryDrawer(false));
  }

  // ==========================================
  // VIEW: SUPPORTED PLATFORMS DIRECTORY
  // ==========================================
  const platformsData = [
    {
      name: 'YouTube',
      category: 'video',
      domain: 'youtube.com, youtu.be',
      desc: 'Up to 4K 60fps video, Shorts, playlists, and audio.',
      color: '#FF0000',
      bg: 'rgba(255, 0, 0, 0.12)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
    },
    {
      name: 'Instagram',
      category: 'social',
      domain: 'instagram.com',
      desc: 'Reels, stories, video posts, and IGTV.',
      color: '#E1306C',
      bg: 'rgba(225, 48, 108, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
    },
    {
      name: 'X / Twitter',
      category: 'social',
      domain: 'twitter.com, x.com',
      desc: 'High-bitrate clips, video posts, and GIF streams.',
      color: '#F8FAFC',
      bg: 'rgba(248, 250, 252, 0.12)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
    },
    {
      name: 'TikTok',
      category: 'social',
      domain: 'tiktok.com',
      desc: 'Clean video downloads with watermark extraction.',
      color: '#22D3EE',
      bg: 'rgba(34, 211, 238, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`
    },
    {
      name: 'Reddit',
      category: 'social',
      domain: 'reddit.com',
      desc: 'Native video & audio demux with zero desynchronization.',
      color: '#FF4500',
      bg: 'rgba(255, 69, 0, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z"/></svg>`
    },
    {
      name: 'Vimeo',
      category: 'video',
      domain: 'vimeo.com',
      desc: 'Full HD & 4K creator portfolios and presentations.',
      color: '#1AB7EA',
      bg: 'rgba(26, 183, 234, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.525 3.01 7.525c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128 1.574-1.409 2.766-2.15 3.57-2.217 1.879-.179 3.047.986 3.506 3.498.497 2.748.847 4.453 1.047 5.125.617 2.936 1.303 4.405 2.059 4.405.58 0 1.293-.925 2.14-2.774.846-1.85 1.304-3.255 1.374-4.205.143-1.61-.433-2.417-1.729-2.417-.617 0-1.25.141-1.895.424 1.282-4.17 3.731-6.173 7.348-6.011 2.684.114 3.966 1.597 3.844 4.444z"/></svg>`
    },
    {
      name: 'SoundCloud',
      category: 'audio',
      domain: 'soundcloud.com',
      desc: 'Lossless tracks, DJ sets, and podcast streams.',
      color: '#FF5500',
      bg: 'rgba(255, 85, 0, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.051 0-.094.044-.102.103L.857 14.53l.216 2.138c.008.06.051.103.102.103.059 0 .102-.043.11-.103l.254-2.138-.254-2.202c-.008-.06-.051-.103-.11-.103zm1.185-.753c-.068 0-.118.051-.127.127l-.237 2.928.237 2.759c.009.076.059.127.127.127.068 0 .127-.051.127-.127l.288-2.759-.288-2.928c0-.076-.059-.127-.127-.127zm1.228-.626c-.076 0-.135.06-.144.144l-.22 3.554.22 3.342c.009.085.068.144.144.144.077 0 .136-.059.144-.144l.263-3.342-.263-3.554c-.008-.084-.067-.144-.144-.144zm1.253-.356c-.085 0-.152.068-.161.161l-.203 3.91.203 3.494c.009.094.076.161.161.161.085 0 .153-.067.161-.161l.246-3.494-.246-3.91c-.008-.093-.076-.161-.161-.161zm1.261-.271c-.093 0-.17.076-.178.178l-.186 4.181.186 3.571c.008.102.085.178.178.178.093 0 .178-.076.178-.178l.229-3.571-.229-4.181c0-.102-.085-.178-.178-.178zm1.27-.051c-.102 0-.187.085-.195.195l-.17 4.232.17 3.614c.008.11.093.195.195.195.101 0 .195-.085.195-.195l.211-3.614-.211-4.232c0-.11-.094-.195-.195-.195zm1.278.026c-.11 0-.203.093-.203.203l-.153 4.207.153 3.647c0 .119.093.212.203.212.11 0 .203-.093.203-.212l.187-3.647-.187-4.207c0-.11-.093-.203-.203-.203zm1.777-2.912c-.093 0-.178.068-.195.161l-.229 3.013.229 3.69c.008.118.093.211.203.211.11 0 .203-.093.203-.211l.263-3.69-.263-2.996c-.017-.102-.102-.178-.211-.178zm1.888-.931c-.042 0-.085.017-.119.051-.042.034-.067.076-.067.127l-.237 3.86.237 3.698c0 .127.102.228.229.228.118 0 .22-.101.22-.228l.271-3.698-.271-3.818c-.017-.127-.119-.22-.263-.22zm5.748 1.701c-.44 0-.855.11-1.22.313-.347-2.023-2.116-3.564-4.232-3.564-.474 0-.931.076-1.354.22-.119.043-.178.161-.144.271.034.11.144.178.262.144.381-.127.787-.195 1.202-.195 1.947 0 3.564 1.456 3.75 3.385l.042.448.449.034c1.32.093 2.361 1.21 2.361 2.556 0 1.422-1.16 2.582-2.582 2.582H13.62c-.136 0-.246.11-.246.246 0 .135.11.245.246.245h4.291c1.693 0 3.073-1.379 3.073-3.072 0-1.608-1.244-2.937-2.836-3.067z"/></svg>`
    },
    {
      name: 'Twitch',
      category: 'streaming',
      domain: 'twitch.tv',
      desc: 'Broadcast VODs, highlights, and creator clips.',
      color: '#A970FF',
      bg: 'rgba(169, 112, 255, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>`
    },
    {
      name: 'Facebook Watch',
      category: 'video',
      domain: 'facebook.com',
      desc: 'Public videos, gaming streams, and reels.',
      color: '#1877F2',
      bg: 'rgba(24, 119, 242, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
    },
    {
      name: 'Dailymotion',
      category: 'video',
      domain: 'dailymotion.com',
      desc: 'Global news clips and HD channels.',
      color: '#0066DC',
      bg: 'rgba(0, 102, 220, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.066 18.497c-.963.784-2.193 1.253-3.528 1.253-3.084 0-5.59-2.505-5.59-5.589 0-3.085 2.506-5.59 5.59-5.59 1.335 0 2.565.469 3.528 1.253V4.25h3.684v15.5h-3.684v-1.253zm-3.528-2.153c1.897 0 3.435-1.538 3.435-3.436s-1.538-3.436-3.435-3.436-3.436 1.538-3.436 3.436 1.539 3.436 3.436 3.436zM1.25 4.25h3.684v15.5H1.25V4.25z"/></svg>`
    },
    {
      name: 'Bandcamp',
      category: 'audio',
      domain: 'bandcamp.com',
      desc: 'Independent musician audio and full releases.',
      color: '#629AA9',
      bg: 'rgba(98, 154, 169, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 18.75l7.437-13.5h16.563l-7.438 13.5z"/></svg>`
    },
    {
      name: 'Pinterest',
      category: 'social',
      domain: 'pinterest.com',
      desc: 'Idea pins, instructional videos, and reels.',
      color: '#BD081C',
      bg: 'rgba(189, 8, 28, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12.004-5.367 12.004-11.987C24.015 5.367 18.641 0 12.017 0z"/></svg>`
    },
    {
      name: 'Streamable',
      category: 'streaming',
      domain: 'streamable.com',
      desc: 'Direct fast short-form video hosting.',
      color: '#0F73EE',
      bg: 'rgba(15, 115, 238, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 12l19-8.5-7.5 17-3.5-6z"/></svg>`
    },
    {
      name: 'Mixcloud',
      category: 'audio',
      domain: 'mixcloud.com',
      desc: 'Radio shows, podcast episodes, and DJ mixes.',
      color: '#5000FF',
      bg: 'rgba(80, 0, 255, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.4 17.6h2.7v-7.2L2.4 12v5.6zm4-10.4v10.4h2.7V4.8L6.4 7.2zm4 2.4v8h2.7V7.2l-2.7 2.4zm4-4v12h2.7V2.4l-2.7 3.2zm4 5.6v6.4h2.7V8.8l-2.7 2.4z"/></svg>`
    },
    {
      name: 'Rumble',
      category: 'video',
      domain: 'rumble.com',
      desc: 'Full length creator streams and independent news.',
      color: '#85C742',
      bg: 'rgba(133, 199, 66, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.778 2.25h16.444A1.528 1.528 0 0 1 21.75 3.778v16.444a1.528 1.528 0 0 1-1.528 1.528H3.778A1.528 1.528 0 0 1 2.25 20.222V3.778A1.528 1.528 0 0 1 3.778 2.25zm5.722 5.25v9l7.5-4.5-7.5-4.5z"/></svg>`
    },
    {
      name: 'Bilibili',
      category: 'video',
      domain: 'bilibili.com',
      desc: 'High-bitrate anime, gaming, and creator content.',
      color: '#00A1D6',
      bg: 'rgba(0, 161, 214, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.813 4.653h.854c1.51 0 2.769.84 3.298 2.05.53 1.21.305 2.613-.569 3.535l-.01.01-.01.01a3.02 3.02 0 0 1-.417.346c.197.63.297 1.298.297 1.996 0 4.148-4.14 7.4-9.256 7.4S2.76 16.74 2.76 12.6c0-.698.1-1.366.297-1.996-.153-.105-.297-.222-.428-.356l-.01-.01-.01-.01c-.873-.923-1.098-2.325-.568-3.535.53-1.21 1.788-2.05 3.298-2.05h.854l1.39-2.086a1.144 1.144 0 0 1 1.58-.32 1.14 1.14 0 0 1 .32 1.58L8.13 5.797h7.74l-1.353-2.03a1.14 1.14 0 0 1 .32-1.58 1.145 1.145 0 0 1 1.58.32l1.396 2.146zm-9.31 9.497c.758 0 1.372-.614 1.372-1.372s-.614-1.372-1.372-1.372-1.372.614-1.372 1.372.614 1.372 1.372 1.372zm6.994 0c.758 0 1.372-.614 1.372-1.372s-.614-1.372-1.372-1.372-1.372.614-1.372 1.372.614 1.372 1.372 1.372z"/></svg>`
    },
    {
      name: 'Threads',
      category: 'social',
      domain: 'threads.net',
      desc: 'Embedded video posts and media threads.',
      color: '#FFFFFF',
      bg: 'rgba(255, 255, 255, 0.12)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24c-3.596 0-6.425-1.125-8.406-3.344C1.862 18.5 1 15.47 1 11.594 1 7.78 1.947 4.78 3.84 2.766 5.8 0.688 8.647 0 12.375 0c3.743 0 6.64 0.703 8.687 2.109 2.047 1.39 3.094 3.422 3.094 6.094 0 2.28-0.703 4.14-2.109 5.578-1.39 1.422-3.172 2.25-5.344 2.484v-2.39c1.453-0.203 2.625-0.75 3.516-1.64.89-0.89 1.344-2.031 1.344-3.422 0-1.89-0.75-3.328-2.25-4.312-1.484-0.984-3.797-1.484-6.938-1.484-2.906 0-5.125 0.5-6.656 1.5C3.703 5.594 2.922 7.203 2.922 9.406c0 1.25.297 2.453 0.89 3.61.61 1.156 1.485 2.125 2.626 2.906 1.14.781 2.546 1.375 4.218 1.781 0.407-0.781 0.657-1.672 0.75-2.672-0.89 0.047-1.781 0.047-2.671 0-1.282-0.094-2.313-0.453-3.094-1.078-0.781-0.64-1.172-1.484-1.172-2.531 0-1.063 0.422-1.922 1.266-2.578 0.843-0.656 1.953-0.984 3.328-0.984 1.578 0 2.828 0.406 3.75 1.218 0.937 0.797 1.406 1.907 1.406 3.329 0 0.875-0.125 1.703-0.375 2.484 1.406-0.312 2.563-0.843 3.469-1.593 0.922-0.75 1.406-1.766 1.453-3.047-0.031-1.39-0.547-2.469-1.547-3.234-0.984-0.766-2.484-1.156-4.5-1.156-2.531 0-4.484 0.64-5.859 1.922-1.36 1.265-2.047 3.093-2.047 5.484 0 2.703 0.703 4.797 2.109 6.281 1.422 1.485 3.39 2.235 5.906 2.235 1.5 0 2.891-0.266 4.172-0.797 1.297-0.547 2.375-1.344 3.235-2.39v2.484c-1.094 0.781-2.329 1.36-3.704 1.734-1.359 0.375-2.796 0.563-4.312 0.563z"/></svg>`
    },
    {
      name: 'Loom',
      category: 'streaming',
      domain: 'loom.com',
      desc: 'Screen recordings and work video messages.',
      color: '#625DF5',
      bg: 'rgba(98, 93, 245, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm-5.091 2.94a2.4 2.4 0 1 1 3.394 3.395 2.4 2.4 0 0 1-3.394-3.395zm-2.109 5.86a2.4 2.4 0 1 1 4.8 0 2.4 2.4 0 0 1-4.8 0zm2.94 5.091a2.4 2.4 0 1 1 3.395-3.394 2.4 2.4 0 0 1-3.395 3.394zm5.86 2.109a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8zm5.091-2.94a2.4 2.4 0 1 1-3.394-3.395 2.4 2.4 0 0 1 3.394 3.395zm2.109-5.86a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0zm-2.94-5.091a2.4 2.4 0 1 1-3.395 3.394 2.4 2.4 0 0 1 3.395-3.394z"/></svg>`
    },
    {
      name: 'Kick',
      category: 'streaming',
      domain: 'kick.com',
      desc: 'Live stream recordings and VOD archives.',
      color: '#53FC18',
      bg: 'rgba(83, 252, 24, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2h4.5v6.5l5.5-6.5h6l-7 7.5 7.5 12.5h-6l-6-9.5V22H4V2z"/></svg>`
    },
    {
      name: 'PeerTube',
      category: 'video',
      domain: 'joinpeertube.org',
      desc: 'Federated and decentralized video instances.',
      color: '#F1680D',
      bg: 'rgba(241, 104, 13, 0.14)',
      iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.75 3v18l16.5-9L3.75 3zm3 4.25l8.72 4.75-8.72 4.75V7.25z"/></svg>`
    }
  ];

  let currentPlatformCategory = 'all';

  function renderPlatformsDirectory() {
    if (!platformsGridContainer) return;
    platformsGridContainer.innerHTML = '';

    const searchTerm = (platformsSearchInput?.value || '').toLowerCase();

    const filtered = platformsData.filter(p => {
      const matchesCategory = currentPlatformCategory === 'all' || p.category === currentPlatformCategory;
      const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm) || p.domain.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });

    filtered.forEach(plat => {
      const card = document.createElement('div');
      card.className = 'platform-directory-card';
      card.innerHTML = `
        <div class="platform-dir-icon" style="color: ${plat.color}; background: ${plat.bg};">
          ${plat.iconSvg}
        </div>
        <div class="platform-dir-info">
          <div class="platform-dir-name">
            <span>${plat.name}</span>
            <span class="platform-status-badge">Supported</span>
          </div>
          <div class="platform-dir-category">${plat.desc}</div>
          <div style="font-family: monospace; font-size: 0.68rem; color: var(--text-muted); margin-top: 4px;">${plat.domain}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        mainUrlInput.placeholder = `Paste ${plat.name} link here...`;
        switchView('downloader');
        mainUrlInput.focus();
      });

      platformsGridContainer.appendChild(card);
    });
  }

  platformCategoryFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      platformCategoryFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatformCategory = btn.getAttribute('data-category');
      renderPlatformsDirectory();
    });
  });

  if (platformsSearchInput) {
    platformsSearchInput.addEventListener('input', renderPlatformsDirectory);
  }

  // ==========================================
  // VIEW: SETTINGS
  // ==========================================
  function populateSettingsForm() {
    if (settingDefaultQuality) settingDefaultQuality.value = State.settings.defaultQuality;
    if (settingAudioBitrate) settingAudioBitrate.value = State.settings.audioBitrate;
    if (settingStrictH264) settingStrictH264.checked = State.settings.strictH264;
    if (settingAutoReveal) settingAutoReveal.checked = State.settings.autoReveal;
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      State.settings = {
        defaultQuality: settingDefaultQuality?.value || '1080p',
        audioBitrate: settingAudioBitrate?.value || '320',
        strictH264: settingStrictH264 ? settingStrictH264.checked : true,
        autoReveal: settingAutoReveal ? settingAutoReveal.checked : false
      };
      saveSettings();
    });
  }

  if (btnSettingsOpenDir) {
    btnSettingsOpenDir.addEventListener('click', async () => {
      try {
        await fetch('/api/open-folder/default', { method: 'POST' });
        showToast('Opened downloads folder', 'success');
      } catch {
        showToast('Could not open folder automatically', 'error');
      }
    });
  }

  if (btnPurgeCache) {
    btnPurgeCache.addEventListener('click', () => {
      if (confirm('Purge temporary cache and local session history?')) {
        localStorage.removeItem('omnistream_history');
        State.history = [];
        updateHistoryBadges();
        showToast('Cache purged successfully', 'success');
      }
    });
  }

  // ==========================================
  // COMMAND PALETTE (Ctrl+K)
  // ==========================================
  const paletteCommands = [
    { title: 'Go to Downloader', category: 'Navigation', shortcut: 'Alt+1', action: () => switchView('downloader') },
    { title: 'Go to Downloads Queue', category: 'Navigation', shortcut: 'Alt+2', action: () => switchView('downloads') },
    { title: 'Go to Download History', category: 'Navigation', shortcut: 'Alt+3', action: () => switchView('history') },
    { title: 'Go to Supported Sites Directory', category: 'Navigation', shortcut: 'Alt+4', action: () => switchView('platforms') },
    { title: 'Go to Settings', category: 'Navigation', shortcut: 'Alt+5', action: () => switchView('settings') },
    { title: 'Open Engine Diagnostics', category: 'System', shortcut: 'Ctrl+D', action: () => openDiagnosticsModal() },
    { title: 'Paste from Clipboard and Analyze', category: 'Action', shortcut: 'Ctrl+V', action: async () => {
      switchView('downloader');
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          mainUrlInput.value = text.trim();
          handleUrlInputChange();
          triggerMediaAnalysis();
        }
      } catch {}
    }},
    { title: 'Reveal Downloads Folder in Windows Explorer', category: 'System', shortcut: '', action: async () => {
      await fetch('/api/open-folder/default', { method: 'POST' });
      showToast('Opened downloads folder', 'success');
    }},
    { title: 'Clear Download History', category: 'Action', shortcut: '', action: () => {
      State.history = [];
      saveHistory();
      showToast('History cleared', 'info');
    }}
  ];

  function openCommandPalette() {
    if (!paletteModal) return;
    paletteModal.classList.add('open');
    if (paletteSearchInput) {
      paletteSearchInput.value = '';
      renderPaletteResults('');
      setTimeout(() => paletteSearchInput.focus(), 50);
    }
  }

  function closeCommandPalette() {
    if (paletteModal) paletteModal.classList.remove('open');
  }

  function renderPaletteResults(query) {
    if (!paletteResultsContainer) return;
    paletteResultsContainer.innerHTML = '';
    const q = (query || '').toLowerCase();

    const matches = paletteCommands.filter(cmd => {
      return !q || cmd.title.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q);
    });

    if (matches.length === 0) {
      paletteResultsContainer.innerHTML = `<div style="padding: 16px; color: var(--text-muted); text-align: center;">No matching actions</div>`;
      return;
    }

    matches.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `palette-item ${idx === 0 ? 'active' : ''}`;
      item.innerHTML = `
        <span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700; width: 80px;">${cmd.category}</span>
        <span style="flex: 1; font-weight: 600;">${cmd.title}</span>
        ${cmd.shortcut ? `<span class="cmd-badge">${cmd.shortcut}</span>` : ''}
      `;

      item.addEventListener('click', () => {
        closeCommandPalette();
        cmd.action();
      });

      paletteResultsContainer.appendChild(item);
    });
  }

  if (btnTriggerPalette) btnTriggerPalette.addEventListener('click', openCommandPalette);

  if (paletteSearchInput) {
    paletteSearchInput.addEventListener('input', (e) => {
      renderPaletteResults(e.target.value);
    });

    paletteSearchInput.addEventListener('keydown', (e) => {
      const items = paletteResultsContainer.querySelectorAll('.palette-item');
      let activeIndex = -1;
      items.forEach((it, i) => {
        if (it.classList.contains('active')) activeIndex = i;
      });

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (activeIndex + 1) % items.length;
        items.forEach(it => it.classList.remove('active'));
        if (items[next]) {
          items[next].classList.add('active');
          items[next].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (activeIndex - 1 + items.length) % items.length;
        items.forEach(it => it.classList.remove('active'));
        if (items[prev]) {
          items[prev].classList.add('active');
          items[prev].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeItem = paletteResultsContainer.querySelector('.palette-item.active');
        if (activeItem) activeItem.click();
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    });
  }

  if (paletteModal) {
    paletteModal.addEventListener('click', (e) => {
      if (e.target === paletteModal) closeCommandPalette();
    });
  }

  // ==========================================
  // ENGINE DIAGNOSTICS MODAL
  // ==========================================
  const diagServerStatus = document.getElementById('diag-server-status');
  const diagFfmpegVer = document.getElementById('diag-ffmpeg-ver');
  const diagYtdlpVer = document.getElementById('diag-ytdlp-ver');
  const diagDiskFree = document.getElementById('diag-disk-free');
  const diagStoragePath = document.getElementById('diag-storage-path');
  const diagActiveTasks = document.getElementById('diag-active-tasks');
  const diagTotalTasks = document.getElementById('diag-total-tasks');

  async function openDiagnosticsModal() {
    if (!diagnosticsModal) return;
    diagnosticsModal.classList.add('open');
    await fetchDiagnosticsMetrics();
  }

  function closeDiagnosticsModal() {
    if (diagnosticsModal) diagnosticsModal.classList.remove('open');
  }

  async function fetchDiagnosticsMetrics() {
    try {
      const res = await fetch('/api/system/health');
      const data = await res.json();
      const engine = data.engine || data || {};
      const storage = engine.storage || {};

      if (diagServerStatus) {
        diagServerStatus.textContent = 'Online (127.0.0.1:5000)';
        diagServerStatus.style.color = 'var(--success)';
      }
      if (diagFfmpegVer) diagFfmpegVer.textContent = engine.ffmpeg_version ? `Installed (${engine.ffmpeg_version})` : 'Installed (Ready)';
      if (diagYtdlpVer) diagYtdlpVer.textContent = engine.ytdlp_version || '2026.08.19';
      if (diagDiskFree) diagDiskFree.textContent = storage.free ? `${storage.free} Free (${storage.total || ''} Total)` : 'Ready';
      if (diagStoragePath) diagStoragePath.textContent = engine.local_downloads_path || engine.download_dir || 'downloads/';
      if (diagActiveTasks) diagActiveTasks.textContent = `${engine.active_tasks || 0} In Progress`;
      if (diagTotalTasks) diagTotalTasks.textContent = `${engine.completed_tasks || 0} Completed`;

      if (sidebarEngineStatus) {
        sidebarEngineStatus.textContent = engine.ffmpeg_ready ? 'FFmpeg Ready' : 'Engine Ready';
      }
    } catch (e) {
      if (diagServerStatus) {
        diagServerStatus.textContent = 'Offline / Error';
        diagServerStatus.style.color = 'var(--error)';
      }
    }
  }

  if (btnDiagnosticsBadge) btnDiagnosticsBadge.addEventListener('click', openDiagnosticsModal);
  if (btnCloseDiagnostics) btnCloseDiagnostics.addEventListener('click', closeDiagnosticsModal);
  if (btnDismissDiagBtn) btnDismissDiagBtn.addEventListener('click', closeDiagnosticsModal);
  if (btnRefreshDiag) btnRefreshDiag.addEventListener('click', () => {
    fetchDiagnosticsMetrics();
    showToast('Diagnostics refreshed', 'info');
  });

  if (diagnosticsModal) {
    diagnosticsModal.addEventListener('click', (e) => {
      if (e.target === diagnosticsModal) closeDiagnosticsModal();
    });
  }

  // Initial engine health check to populate sidebar badge
  fetchDiagnosticsMetrics();

  // ==========================================
  // GLOBAL KEYBOARD SHORTCUTS
  // ==========================================
  document.addEventListener('keydown', (e) => {
    // Ctrl+K -> Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (paletteModal && paletteModal.classList.contains('open')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
      return;
    }

    // Ctrl+H -> History Drawer
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      toggleHistoryDrawer(true);
      return;
    }

    // Escape -> Close any modal/drawer
    if (e.key === 'Escape') {
      closeCommandPalette();
      closeDiagnosticsModal();
      toggleHistoryDrawer(false);
      if (appSidebar) appSidebar.classList.remove('mobile-open');
    }
  });

  // ==========================================
  // FAQ ACCORDION HANDLERS
  // ==========================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    }
  });

  // ==========================================
  // TOAST NOTIFICATION UTILITY
  // ==========================================
  function showToast(msg, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span>${icon}</span>
      <span>${msg}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // Initial State Setup
  handleUrlInputChange();
});
