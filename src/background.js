const defaults = {enabled: true, intervalMinutes: 5, tweetsPerPage: 5, videoCheck: true, videoSwitch:true, business: '', work: ''};
let presetQueue = Promise.resolve();
let taskQueue = Promise.resolve();
// Built-in purpose suggestions. Labels are localised at call time, so the list
// must never be written to storage; only the codes of dismissed ones are.
const defaultPurposePresets = () => [
  {code:'inspiration', label:'寻找灵感'},
  {code:'understand', label:'了解一件事'},
  {code:'skill', label:'学会一个小技巧'},
];
async function storedPresets() {
  const {presets,settings} = await chrome.storage.local.get(['presets','settings']);
  return {
    purpose: presets?.purpose ?? [],
    business: presets?.business ?? (settings?.business ? [settings.business] : []),
    next: presets?.next ?? [],
    hiddenDefaults: presets?.hiddenDefaults ?? [],
  };
}
async function readPresets() {
  const saved = await storedPresets();
  const suggestions = defaultPurposePresets()
    .filter(item => !saved.hiddenDefaults.includes(item.code))
    .map(item => item.label)
    .filter(label => !saved.purpose.includes(label));
  return {...saved, purpose:[...saved.purpose, ...suggestions]};
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  (async () => {
    const tabKey = `session:${sender.tab?.id}`;
    if (message.type === 'LANGUAGE') {
      if(!['en','zh'].includes(message.language)) throw new Error('Invalid language');
      await chrome.storage.local.set({language:message.language}); return {ok:true};
    }
    if (message.type === 'TASKS') return {tasks:(await chrome.storage.local.get('tasks')).tasks || []};
    if (message.type === 'TASK_EDIT') {
      const operation = taskQueue.then(async () => {
        let tasks = (await chrome.storage.local.get('tasks')).tasks || [];
        let id;
        if (message.action === 'remove') tasks = tasks.filter(card=>card.id!==message.id);
        else if (message.action === 'save') {
          const input = message.card || {}, card = {};
          for(const [key,limit] of Object.entries({purpose:200,stopCondition:300,exitAction:500})) {
            if(typeof input[key] !== 'string' || !input[key].trim() || input[key].trim().length > limit) throw new Error('请填写完整的目的、结束条件和退出后行动');
            card[key]=input[key].trim();
          }
          if(![5,10,20].includes(input.budget)) throw new Error('请选择 5、10 或 20 分钟');
          card.budget=input.budget;
          if(input.id && !tasks.some(task=>task.id===input.id)) throw new Error('这张卡已被删除，请保存为新任务卡');
          if(!input.id && tasks.length>=30) throw new Error('最多保存 30 张任务卡');
          id=card.id=input.id || crypto.randomUUID();
          const index=tasks.findIndex(task=>task.id===id);
          if(index>=0)tasks[index]=card;else tasks.push(card);
        } else throw new Error('任务卡操作无效');
        await chrome.storage.local.set({tasks});
        return {tasks,id};
      });
      taskQueue=operation.catch(()=>{});
      return operation;
    }
    if (message.type === 'PRESETS') return {presets:await readPresets()};
    if (message.type === 'PRESET_EDIT') {
      const operation = presetQueue.then(async () => {
        const limit = {purpose:200,business:200,next:500}[message.kind];
        const value = typeof message.value === 'string' ? message.value.trim() : '';
        if (!limit || !value || value.length > limit || !['add','remove'].includes(message.action)) throw new Error('快捷选项内容无效');
        const presets = await storedPresets();
        const visible = (await readPresets())[message.kind];
        if(message.action === 'add') {
          if(!visible.includes(value)) {
            if(visible.length >= 30) throw new Error('每类最多保存 30 个快捷选项');
            presets[message.kind].push(value);
          }
        } else {
          presets[message.kind]=presets[message.kind].filter(item=>item!==value);
          // A built-in suggestion is not in storage, so record that it was dismissed.
          if(message.kind === 'purpose') for(const item of defaultPurposePresets())
            if(item.label === value && !presets.hiddenDefaults.includes(item.code)) presets.hiddenDefaults.push(item.code);
        }
        await chrome.storage.local.set({presets});
        return {presets: await readPresets()};
      });
      presetQueue = operation.catch(()=>{});
      return operation;
    }
    if (message.type === 'INIT') {
      const saved = await chrome.storage.local.get('settings');
      const current = (await chrome.storage.session.get(tabKey))[tabKey];
      return {settings: {...defaults, ...saved.settings}, session: current && Date.now() - current.updated < 30 * 60 * 1000 ? current : null};
    }
    if (message.type === 'SESSION' && sender.tab) {
      await chrome.storage.session.set({[tabKey]: {...message.session, updated: Date.now()}});
      return {ok: true};
    }
    if (message.type === 'SAVE') {
      const entry = {...message.entry, id: /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(message.entry?.clientId || '') ? message.entry.clientId : crypto.randomUUID(), created: new Date().toISOString(), done: false};
      await chrome.storage.local.set({[`entry:${entry.id}`]: entry});
      return {ok: true};
    }
    if (message.type === 'WORK' && sender.tab) {
      await chrome.storage.session.remove(tabKey);
      const action = typeof message.action === 'string' ? message.action.trim().slice(0,500) : '';
      const handoff = crypto.randomUUID();
      await chrome.storage.session.set({[`work:${handoff}`]:{action,created:Date.now()}});
      await chrome.tabs.update(sender.tab.id, {url: chrome.runtime.getURL(`dashboard.html?handoff=${handoff}#work`)});
      return {ok: true};
    }
    if (message.type === 'DASHBOARD') {
      await chrome.tabs.create({url: chrome.runtime.getURL('dashboard.html')});
      return {ok: true};
    }
    throw new Error('不支持的操作');
  })().then(respond, error => respond({error: error.message}));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove(`session:${tabId}`));
