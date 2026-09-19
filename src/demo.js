// 演示适配层：既可通过扩展打开，也可以用本地浏览器独立预览。
(() => {
  if(new URLSearchParams(location.search).get('surface') === 'x') {
    document.querySelector('h1').textContent = '如果你刚刷完一页推文。';
    document.querySelector('#simulate').textContent = '模拟读完 5 条推文 / 开始复盘';
  }
  const modes = document.createElement('div'); modes.className = 'actions';
  modes.innerHTML = '<a class="button" href="demo.html">抖音 · 视频结束</a><a class="button" href="demo.html?surface=x">推特 · 一页结束</a>';
  document.querySelector('h1').after(modes);
  const listeners = [];
  let tasks = [];
  const presets = {purpose:['寻找灵感','了解一件事','学会一个小技巧'],business:['学习摄影'],next:[],hiddenDefaults:[]};
  const api = {runtime:{async sendMessage(message) {
    if(message.type === 'INIT') return {settings:{enabled:true,intervalMinutes:5,videoCheck:true,business:'学习摄影',work:'出去拍一张照片'},session:null};
    if(message.type === 'TASKS') return {tasks};
    if(message.type === 'TASK_EDIT') {
      let id;
      if(message.action==='remove')tasks=tasks.filter(card=>card.id!==message.id);
      else {id=message.card.id || crypto.randomUUID();tasks=tasks.filter(card=>card.id!==id);tasks.push({...message.card,id});}
      listeners.forEach(fn=>fn({tasks:{newValue:tasks}},'local'));
      return {tasks,id};
    }
    if(message.type === 'PRESETS') return {presets};
    if(message.type === 'PRESET_EDIT') {
      const value=message.value.trim(); const kind=message.kind;
      if(message.action==='add' && !presets[kind].includes(value)) presets[kind].push(value);
      if(message.action==='remove') presets[kind]=presets[kind].filter(item=>item!==value);
      listeners.forEach(fn=>fn({presets:{newValue:presets}},'local'));
      return {presets};
    }
    if(message.type === 'SAVE') document.querySelector('#demo-result').textContent = JSON.stringify(message.entry,null,2);
    if(message.type === 'WORK') {
      document.querySelector('#mindful-feed-root')?.remove();
      document.documentElement.style.overflow='';
      document.querySelector('#demo-work').textContent = `已离开信息流。下一步：${message.action || '出去拍一张照片'}。正式插件会进入专注计时页。`;
    }
    return {ok:true};
  }},storage:{onChanged:{addListener(fn){listeners.push(fn);},removeListener(fn){const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);}}}};
  // content.js 在隔离脚本上下文之外也能用于此显式演示。
  globalThis.chrome = api;
  document.querySelector('#simulate').onclick = () => {
    const pill = document.querySelector('#mindful-feed-root');
    if(pill) {
      // 模拟按钮触发固定入口；生产环境不接收页面发来的消息。
      document.dispatchEvent(new Event('mindful-demo-review'));
    }
  };
  document.querySelector('#again').onclick = () => location.reload();
})();
