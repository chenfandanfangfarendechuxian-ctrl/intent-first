(() => {
  if (document.getElementById('mindful-feed-root')) return;
  const host = document.createElement('div');
  host.id = 'mindful-feed-root';
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const root = host.attachShadow({mode: 'closed'});
  root.innerHTML = `<style>
    :host{font-family:system-ui,-apple-system,"PingFang SC",sans-serif;color:#182a27;font-size:15px;line-height:1.6}
    *{box-sizing:border-box} [hidden]{display:none!important}
    .shade{pointer-events:auto;position:absolute;inset:0;background:#101c22b8;display:grid;place-items:center;padding:20px;backdrop-filter:blur(7px)}
    .panel{width:min(510px,100%);max-height:90vh;overflow:auto;overscroll-behavior:contain;background:#fcfbf7;border-radius:24px;padding:30px;box-shadow:0 24px 100px #0005}
    .brand{font-size:12px;letter-spacing:2px;color:#55736b} h2{font-size:26px;line-height:1.3;margin:14px 0} p{margin:10px 0;color:#586963}
    label{display:block;font-weight:600;margin-top:16px} input,textarea,select,button{font:inherit} input,textarea,select{width:100%;padding:10px 12px;border:1px solid #b7c8be;border-radius:10px;background:white;color:#182a27;margin-top:6px} textarea{resize:vertical;min-height:80px}
    button{cursor:pointer;border:1px solid #b7c8be;border-radius:12px;padding:11px 14px;color:#183c32;background:#fff;min-height:44px} button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #dc9659;outline-offset:2px}
    .primary{background:#234f41;color:#fff;border-color:#234f41} .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px} .choices{display:grid;gap:8px;margin:20px 0} .choices button{text-align:left}
    .muted{font-size:13px;color:#687b73}.error{color:#a13429;min-height:22px;font-size:13px}
    .pill{pointer-events:auto;position:absolute;left:18px;bottom:18px;background:#fcfbf7;border:1px solid #d4ddd6;border-radius:30px;box-shadow:0 3px 18px #0002;font-size:13px}
  </style>
  <button class="pill" hidden>醒一下</button>
  <div class="shade" hidden><section class="panel" role="dialog" aria-modal="true" aria-labelledby="mf-heading"></section></div>`;
  document.documentElement.append(host);
  const panel = root.querySelector('.panel');
  const shade = root.querySelector('.shade');
  const pill = root.querySelector('.pill');
  let settings, session, opened = false, activeSeconds = 0, sinceCheck = 0, snoozeUntil = 0;
  let previousFocus, currentContext, pendingCategory, lastTick = performance.now(), persistenceSeconds = 0;
  let activeVideo = null;
  let activeVideoState = null;
  let activeVideoSince = 0;
  const isDemo = (['file:', 'chrome-extension:'].includes(location.protocol) || location.hostname === '127.0.0.1') && location.pathname.endsWith('/demo.html');
  const isTwitter = /(^|\.)(x|twitter)\.com$/.test(location.hostname) || (isDemo && new URLSearchParams(location.search).get('surface') === 'x');
  const seenTweets = new Set();
  const tweetSelector = 'article[data-testid="tweet"], article, [data-testid="tweet"]';
  let tweetScanQueued = false;
  let tweetBatch = [], pageReady = false, previousOverflow = '';
  let presetCleanup = [];
  const videoState = new WeakMap();
  const observedVideos = new WeakSet();
  const ask = MindfulConnection.request;
  const sourceLabel = code => ({douyin:'抖音', x:'X / 推特', demo:'演示'})[code] || code;
  const purposeLabel = state => state?.purpose || (state?.entertainment ? '有意识地休息' : '');
  const text = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const visible = element => {
    const r = element.getBoundingClientRect();
    return r.width > 80 && r.height > 60 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
  };
  function context(video) {
    let article = video?.closest('article');
    if (!article) article = [...document.querySelectorAll('article')].filter(visible).sort((a,b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top))[0];
    const link = article?.querySelector('a[href*="/status/"]');
    return {url: link?.href || location.href, title: document.title, excerpt: (article?.querySelector('[data-testid="tweetText"]')?.innerText || '').slice(0, 2000), source: /douyin/.test(location.hostname) ? 'douyin' : /x\.com|twitter\.com/.test(location.hostname) ? 'x' : 'demo'};
  }
  function pause() { document.querySelectorAll('video').forEach(v => { if (!v.paused) v.pause(); }); }
  function modal(html) {
    presetCleanup.forEach(dispose=>dispose()); presetCleanup=[];
    if (!opened) {
      previousFocus = document.activeElement;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }
    opened = true;
    shade.hidden = false;
    pill.hidden = true;
    panel.innerHTML = `<div class="brand" style="display:flex;justify-content:space-between;align-items:center">醒一下 / INTENT FIRST<button id="ui-language" aria-label="切换语言" style="min-height:30px;padding:3px 8px;font-size:12px;letter-spacing:0">EN / ZH</button></div>${html}<div class="error" role="status"></div>`;
    bind('ui-language', async () => {
      if(!confirm('切换语言将刷新页面，请先保存或复制已填内容。继续？')) return;
      const language=typeof __mfLanguage==='string' && __mfLanguage==='en' ? 'zh' : 'en';
      await ask({type:'LANGUAGE',language});
      if(isDemo) {const url=new URL(location.href);url.searchParams.set('lang',language);location.href=url.href;}
      else location.reload();
    });
    pause();
    panel.querySelector('input,textarea,button')?.focus();
  }
  function error(err) {
    const out = panel.querySelector('.error');
    if(!out)return;
    out.textContent = err.code==='DISCONNECTED' ? err.message : `没有保存成功：${err.message}。请重试。`;
    if(err.code!=='DISCONNECTED')return;
    const draft = [currentContext ? `来源：${currentContext.url}\n分类：${pendingCategory || ''}` : '',...['purpose','stop-condition','exit-action','note','project','next'].map(id=>{
      const field=panel.querySelector(`#${id}`);return field?.value ? `${field.closest('label')?.firstChild?.textContent || id}：${field.value}` : '';
    })].filter(Boolean).join('\n');
    const actions=document.createElement('div');actions.className='actions';
    const copy=document.createElement('button');copy.textContent='复制已填内容';copy.type='button';
    copy.onclick=async()=>{
      try {await navigator.clipboard.writeText(draft || '本次选择：'+(pendingCategory || '未分类'));copy.textContent='已复制，可以刷新';}
      catch {const fallback=document.createElement('textarea');fallback.value=draft;fallback.readOnly=true;fallback.setAttribute('aria-label','待复制的草稿');out.append(fallback);fallback.focus();fallback.select();copy.textContent='请手动复制下方草稿';}
    };
    const refresh=document.createElement('button');refresh.textContent='刷新页面（未保存内容会清空）';refresh.type='button';refresh.onclick=()=>location.reload();
    actions.append(copy,refresh);out.append(actions);
  }
  function bind(id, callback) { panel.querySelector(`#${id}`).onclick = () => Promise.resolve().then(callback).catch(error); }
  function persist() { return ask({type:'SESSION', session:{...session, activeSeconds, sinceCheck, snoozeUntil}}); }
  function close() {
    opened = false; shade.hidden = true; pill.hidden = !settings.enabled; sinceCheck = 0;
    document.documentElement.style.overflow = previousOverflow;
    if (pageReady) { tweetBatch = []; pageReady = false; }
    previousFocus?.focus?.();
    updatePill();
    // 用户主动点击页面恢复播放，不自动启动任何视频。
  }
  function work() { return ask({type:'WORK',action:session?.exitAction || settings.work || ''}); }
  function begin() {
    modal(`<h2 id="mf-heading">这次打开，是为了什么？</h2><p>先给这一段时间一个用途。</p>
      <label>这次的目的<input id="purpose" maxlength="200" placeholder="例如：找到一个能练习的摄影技巧"></label><div id="purpose-presets"></div>
      <label>找到什么就结束？（选填）<input id="stop-condition" maxlength="300" placeholder="例如：看懂一种构图方法，选好一个练习"></label><label>退出后先做什么？<input id="exit-action" maxlength="500" value="${text(settings.work)}" placeholder="例如：放下手机，出去拍一张照片"></label>
      <label>本次时间预算<select id="budget"><option value="10">10 分钟</option><option value="5">5 分钟</option><option value="20">20 分钟</option></select></label>
      <div id="task-cards"></div><p class="muted">填好上面三项后可点“＋”保存任务卡；下次点卡片整套填入。</p>
      <p class="muted">原本想做的下一步：${text(settings.work || '在记录页设置你想做的下一步')}</p>
      <div class="actions"><button id="start" class="primary">带着目的开始</button><button id="rest">我就是休息一下</button><button id="work">去做下一步</button></div>`);
    presetCleanup.push(MindfulPresets.mount(panel.querySelector('#purpose-presets'),panel.querySelector('#purpose'),'purpose'));
    presetCleanup.push(MindfulTasks.mount(panel.querySelector('#task-cards'),{purpose:panel.querySelector('#purpose'),stopCondition:panel.querySelector('#stop-condition'),exitAction:panel.querySelector('#exit-action'),budget:panel.querySelector('#budget')}));
    async function start(rest) {
      const purpose = panel.querySelector('#purpose').value.trim();
      if (!rest && !purpose) { panel.querySelector('.error').textContent = '用一句话说清楚这次想找什么。'; return; }
      session = {purpose: rest ? '' : purpose, budget: Number(panel.querySelector('#budget').value), entertainment: rest, stopCondition:rest ? '' : panel.querySelector('#stop-condition').value.trim(),exitAction:panel.querySelector('#exit-action').value.trim()};
      activeSeconds = 0; sinceCheck = 0; snoozeUntil = 0;
      await persist(); close();
    }
    bind('start', () => start(false)); bind('rest', () => start(true)); bind('work', work);
  }
  function review(reason, video, retainedContext) {
    if (opened || !settings.enabled || document.hidden || (!isTwitter && !document.hasFocus()) || Date.now() < snoozeUntil) return false;
    if (snoozeUntil > 0) snoozeUntil = 0; // 内容事件先于定时器恢复时，不重复补弹。
    currentContext = retainedContext || {...context(video), reason, tweets:tweetBatch.slice()};
    modal(`<h2 id="mf-heading">${isTwitter ? '这一页推文，留下了什么？' : '刚才这段，给了你什么？'}</h2><p>${text(reason)} · 本次已用 ${Math.floor(activeSeconds / 60)} 分钟</p>
      <p class="muted">你原本想：${text(purposeLabel(session))}${session.stopCondition ? `<br>找到这些就结束：${text(session.stopCondition)}` : ''}${session.exitAction ? `<br>退出后：${text(session.exitAction)}` : ''}</p>${session.stopCondition ? '<button id="goal-done" class="primary">目标已达到，去做下一步</button><p class="muted">这段内容是否帮助了本次任务？有趣，也可以与这次目的无关。</p>' : ''}
      <div class="choices"><button id="business">与我的目标相关 · 能说出帮助在哪里</button><button id="learn">探索学习 · 暂时不需要落地</button><button id="fun">娱乐休息 · 这次不追求收获</button><button id="unclear">暂时没想清楚 · 先如实记下</button></div>
      <div class="actions"><button id="work">现在去做下一步</button><button id="skip">${isTwitter ? '只跳过这页，下页仍提醒' : '只跳过这次，下条仍提醒'}</button><button id="later">暂停所有提醒 5 分钟</button></div>`);
    if(session.stopCondition) bind('goal-done', work);
    bind('business', () => detail('business')); bind('learn', () => detail('learn')); bind('fun', () => detail('fun'));
    bind('unclear', () => detail('unclear'));
    bind('work', work);
    bind('skip', async () => { sinceCheck = 0; await persist(); close(); });
    bind('later', async () => { snoozeUntil = Date.now() + 300000; sinceCheck = 0; await persist(); close(); });
    return true;
  }
  function detail(category) {
    pendingCategory = category;
    const isBusiness = category === 'business', isFun = category === 'fun', unclear = category === 'unclear';
    modal(`<h2 id="mf-heading">${isBusiness ? '它怎样帮助了你的目标？' : isFun ? '娱乐也可以是主动选择。' : '留下你自己的理解。'}</h2>
      <p>${isBusiness ? '先说你的判断，再让 AI 帮忙整理。' : isFun ? '你可以现在停下，也可以有意识地再休息一会儿。' : '好奇和休息都有自己的价值，不必每次都产出成果。'}</p>
      ${isFun ? '' : `<label>${unclear ? '哪里还没想清楚？（选填）' : '不重看，你记住了什么？'}<textarea id="note" maxlength="2000" placeholder="用自己的话说。${isTwitter ? '这一页只选一个最值得留下的想法。' : '不必写成一篇总结。'}"></textarea></label>`}
      ${isBusiness ? `<label>对应的目标 / 想做的事<input id="project" maxlength="200" value="${text(settings.business)}" placeholder="例如：学摄影、准备考试、规划旅行"></label><div id="business-presets"></div><label>接下来能试的一小步<input id="next" maxlength="500" placeholder="例如：用刚学的方法练习一次"></label><div id="next-presets"></div>` : ''}
      <p class="muted">${text(sourceLabel(currentContext.source))} · ${text(currentContext.title.slice(0, 100))}<br>记录来源链接和你的判断；不会自动获取完整视频。</p>
      <div class="actions"><button id="save-work" class="primary">记录并去做下一步</button><button id="save">${isFun ? '记录，再休息 5 分钟' : '记录，继续看'}</button><button id="back">重新选择</button></div>`);
    if(isBusiness) {
      presetCleanup.push(MindfulPresets.mount(panel.querySelector('#business-presets'),panel.querySelector('#project'),'business'));
      presetCleanup.push(MindfulPresets.mount(panel.querySelector('#next-presets'),panel.querySelector('#next'),'next'));
    }
    let saving = false;
    const entryId = crypto.randomUUID();
    async function save(goWork) {
      if (saving) return;
      const note = panel.querySelector('#note')?.value.trim() || '';
      const project = panel.querySelector('#project')?.value.trim() || '';
      const next = panel.querySelector('#next')?.value.trim() || '';
      if ((!isFun && !unclear && !note) || (isBusiness && (!project || !next))) {
        panel.querySelector('.error').textContent = '补充自己的收获；目标相关还需要说明目标和下一步。'; return;
      }
      saving = true;
      try {
        await ask({type:'SAVE', entry:{...currentContext, clientId:entryId, category:pendingCategory, entertainment:!!session.entertainment, note, project, next, purpose:session.purpose, stopCondition:session.stopCondition || '',exitAction:session.exitAction || '', activeSeconds:Math.round(activeSeconds)}});
        if (isTwitter && currentContext.tweets?.length) { tweetBatch = []; pageReady = false; }
        if (isFun) snoozeUntil = Date.now() + 300000;
        sinceCheck = 0;
        if (activeSeconds >= session.budget * 60) session.budget = Math.ceil(activeSeconds / 60) + 5;
        await persist();
        if (goWork) await work(); else close();
      } finally { saving = false; }
    }
    bind('save-work', () => save(true)); bind('save', () => save(false));
    bind('back', () => { const saved = currentContext; close(); review(saved.reason, null, saved); });
  }
  function tweetInfo(article) {
    // 外层帖子优先取自己的时间链接；广告没有时间时，允许从统计链接取原帖 ID。
    const links = [...article.querySelectorAll('a[href*="/status/"]')];
    const ownLinks = links.filter(a => a.closest(tweetSelector) === article);
    const anchor = ownLinks.find(a => a.querySelector('time')) || ownLinks.find(a => /\/status\/\d+\/?$/.test(a.getAttribute('href') || '')) || ownLinks[0];
    const match = anchor?.getAttribute('href')?.match(/\/status\/(\d+)/);
    if (!match) return null;
    const url = new URL(anchor.getAttribute('href'), location.origin);
    url.pathname = url.pathname.slice(0, url.pathname.indexOf('/status/') + 8) + match[1];
    url.search = ''; url.hash = '';
    return {id:match[1], url:url.href, excerpt:(article.querySelector('[data-testid="tweetText"]')?.innerText || article.innerText).slice(0,2000)};
  }
  function inspectTweets() {
    if (!isTwitter || !settings?.enabled || !session || session.entertainment || opened || document.hidden || Date.now() < snoozeUntil) return;
    const pageSize = Math.max(1, Number(settings.tweetsPerPage) || 5);
    if (pageReady || tweetBatch.length >= pageSize) { pageReady = true; review(`这一页已浏览 ${tweetBatch.length} 条推文`); return; }
    // X 是虚拟列表；每次看当前节点与帖子 ID，不按节点身份或渲染总数计数。
    for (const article of document.querySelectorAll(tweetSelector)) {
      if (article.parentElement?.closest(tweetSelector)) continue;
      const r = article.getBoundingClientRect();
      const visibleHeight = Math.min(innerHeight * .85, r.bottom) - Math.max(64, r.top);
      const visibleWidth = Math.min(innerWidth, r.right) - Math.max(0, r.left);
      if (visibleWidth < 80 || r.width < 80 || r.height < 30 || visibleHeight < Math.min(80, r.height * .5)) continue;
      const info = tweetInfo(article);
      if (!info || seenTweets.has(info.id)) continue;
      seenTweets.add(info.id); tweetBatch.push({url:info.url, excerpt:info.excerpt});
      updatePill();
      if (tweetBatch.length >= pageSize) {
        pageReady = true;
        review(`这一页已浏览 ${pageSize} 条推文`);
        break;
      }
    }
  }
  function scheduleTweetScan() {
    if (!isTwitter || tweetScanQueued) return;
    tweetScanQueued = true;
    requestAnimationFrame(() => { tweetScanQueued = false; inspectTweets(); });
  }
  function stateFor(video) {
    const src = video.currentSrc || video.src;
    let state = videoState.get(video);
    if (!state || state.src !== src) {
      // 同一播放器经常换源，不能把上一条的状态当成下一条。
      state = {src, watched:0, last:video.currentTime, finished:false, snapshot:context(video)};
      videoState.set(video, state);
    }
    return state;
  }
  function canCheckVideo() {
    return !isTwitter && session && settings?.enabled && settings.videoCheck && !session.entertainment && !opened && !document.hidden && document.hasFocus() && Date.now() >= snoozeUntil;
  }
  function finishVideo(state, reason) {
    if (state.finished || !canCheckVideo()) return;
    // 先确认成功弹出，再消耗这次事件，避免因失焦把提醒丢掉。
    if (review(reason, null, {...state.snapshot, reason, tweets:[]})) state.finished = true;
  }
  function inspectVideo(video) {
    const state = stateFor(video);
    const delta = video.currentTime - state.last;
    state.last = video.currentTime;
    if (delta > 0 && delta < 2 && !opened && !document.hidden && document.hasFocus() && visible(video)) state.watched += delta;
    const duration = video.duration;
    if (!canCheckVideo() || state.finished || !Number.isFinite(duration) || duration < .5 || !visible(video)) return;
    const nearEnd = video.ended || video.currentTime >= duration - .35 || (video.loop && delta < -duration / 2);
    if (nearEnd && state.watched >= Math.min(1, duration / 2)) {
      finishVideo(state, '刚看完一条视频');
    }
  }
  function trackActiveVideo() {
    if (isTwitter || !settings?.enabled || !session || opened || document.hidden || !document.hasFocus()) return;
    const candidates = [...document.querySelectorAll('video')].filter(visible).map(video => {
      const r = video.getBoundingClientRect();
      const area = (Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const fraction = area / Math.max(1, r.width * r.height);
      return {video, area, fraction};
    }).filter(item => item.fraction >= .5).sort((a,b) => b.area - a.area);
    const next = candidates[0]?.video;
    if (!next) return; // 切换动画的中间帧不算离开视频。
    const nextState = stateFor(next);
    if (activeVideo !== next || activeVideoState !== nextState) {
      const previous = activeVideoState;
      const dwell = performance.now() - activeVideoSince;
      activeVideo = next; activeVideoState = nextState; activeVideoSince = performance.now();
      if (previous && dwell >= 800 && settings.videoSwitch !== false) finishVideo(previous, '已切换到下一条，先回想上一条');
    }
    if (!opened) inspectVideo(next); // 定时补查，兼容播放器遗漏 timeupdate / ended。
  }
  function updatePill() {
    if (!settings || !session) return;
    const remaining = Math.ceil((snoozeUntil - Date.now()) / 60000);
    if (remaining > 0) pill.textContent = `醒一下 · 所有提醒暂停 ${remaining} 分钟 · 点击立即恢复`;
    else if (session.entertainment) pill.textContent = '醒一下 · 休息中 · 点击恢复逐条提醒';
    else if (!isTwitter && !settings.videoCheck) pill.textContent = '醒一下 · 仅定时提醒';
    else pill.textContent = isTwitter ? `醒一下 · 本页 ${tweetBatch.length} / ${settings.tweetsPerPage || 5} 条` : `醒一下 · 逐条提醒中 · ${Math.floor(activeSeconds / 60)} / ${session.budget} 分钟`;
    host.dataset.version = typeof __mfVersion === 'string' ? __mfVersion : 'dev';
    host.dataset.feed = isTwitter ? 'twitter' : 'video';
    host.dataset.count = String(tweetBatch.length);
  }
  function scanVideos() {
    document.querySelectorAll('video').forEach(video => {
      if (observedVideos.has(video)) return;
      observedVideos.add(video);
      video.addEventListener('timeupdate', () => inspectVideo(video));
      video.addEventListener('ended', () => inspectVideo(video));
      video.addEventListener('play', () => { if(opened) video.pause(); });
    });
  }
  window.addEventListener('keydown', event => {
    if (!opened) return;
    event.stopImmediatePropagation();
    if (event.key === 'Tab') {
      const controls = [...panel.querySelectorAll('button,input,select,textarea')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && root.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && root.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  pill.onclick = async () => {
    if (!session) { begin(); return; }
    snoozeUntil = 0; session.entertainment = false;
    review('你主动停了一下');
    await persist().catch(error);
  };
  chrome.runtime.onMessage?.addListener((message, sender, respond) => {
    if (message.type === 'STATUS') respond({version: typeof __mfVersion === 'string' ? __mfVersion : 'dev', feed:isTwitter?'twitter':'video', count:tweetBatch.length, pageSize:settings?.tweetsPerPage || 5, enabled:settings?.enabled, ready:!!settings, paused:session?.entertainment || Date.now() < snoozeUntil, videoCount:document.querySelectorAll('video').length});
  });
  if (isDemo) document.addEventListener('mindful-demo-review', () => { if(session) review(isTwitter ? '模拟：这一页已浏览 5 条推文' : '模拟：刚看完一条视频'); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.settings) return;
    settings = {...settings, ...changes.settings.newValue};
    if (!settings.enabled) close();
    else if (!session) begin();
    else pill.hidden = opened;
    updatePill();
  });
  ask({type:'INIT'}).then(result => {
    settings = result.settings; session = result.session;
    activeSeconds = session?.activeSeconds || 0; sinceCheck = session?.sinceCheck || 0; snoozeUntil = session?.snoozeUntil || 0;
    if (settings.enabled) { if(!session) begin(); else pill.hidden = false; }
    scanVideos();
    updatePill();
    if (isTwitter) {
      document.addEventListener('scroll', scheduleTweetScan, {capture:true, passive:true});
      document.addEventListener('visibilitychange', scheduleTweetScan);
      window.addEventListener('focus', scheduleTweetScan);
      const observer = new MutationObserver(records => {
        if (records.some(record => record.target !== host && !host.contains(record.target))) scheduleTweetScan();
      });
      observer.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['href']});
    }
    setInterval(() => { scanVideos(); trackActiveVideo(); inspectTweets(); }, 250);
    setInterval(() => {
      const now = performance.now(), delta = Math.min(2, (now - lastTick) / 1000); lastTick = now;
      scanVideos();
      if (!settings.enabled || opened || document.hidden || (!isTwitter && !document.hasFocus()) || !session) return;
      // 暂停按实际时间到期；即使后台计时被冻结，回到页面也先明确恢复。
      if (snoozeUntil > 0 && Date.now() >= snoozeUntil) {
        const resumeReason = session.entertainment ? '暂停时间已结束，请决定接下来做什么' : '5 分钟暂停已结束，已恢复内容提醒';
        if (review(resumeReason)) { snoozeUntil = 0; persist().catch(() => {}); }
        return;
      }
      activeSeconds += delta; sinceCheck += delta; persistenceSeconds += delta;
      updatePill();
      if (persistenceSeconds >= 15) { persistenceSeconds = 0; persist().catch(() => {}); }
      if(Date.now() >= snoozeUntil) {
        if(pageReady) review(`这一页已浏览 ${tweetBatch.length} 条推文`);
        else inspectTweets();
      }
      if(opened) return;
      if (activeSeconds >= session.budget * 60) review('到了你给自己的时间预算');
      else if (sinceCheck >= settings.intervalMinutes * 60 && !session.entertainment) review('停一下，看看有没有偏离目的');
    }, 1000);
  }).catch(() => {
    pill.hidden = false; pill.textContent = '醒一下连接失败 · 点击刷新页面';
    pill.onclick = () => location.reload();
  });
})();
