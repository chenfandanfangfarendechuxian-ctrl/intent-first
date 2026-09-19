const status = document.querySelector('#status');
chrome.storage.local.get('settings').then(({settings}) => { document.querySelector('#enabled').checked = settings?.enabled !== false; });
document.querySelector('#enabled').onchange = async event => {
  try {
    const {settings = {}} = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({settings:{...settings, enabled:event.target.checked}});
    status.textContent = event.target.checked ? '提醒已开启' : '提醒已暂停';
  } catch (error) { status.textContent = error.message; }
};
document.querySelector('#open').onclick = () => chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')});
document.querySelector('#demo').onclick = () => chrome.tabs.create({url:chrome.runtime.getURL('demo.html')});
const reloadButton = document.querySelector('#reload');
let currentTab;
chrome.tabs.query({active:true,currentWindow:true}).then(async tabs => {
  currentTab = tabs[0];
  try {
    const state = await chrome.tabs.sendMessage(currentTab.id, {type:'STATUS'});
    status.textContent = !state.ready ? '插件正在初始化。' : !state.enabled ? '当前提醒已关闭。' : state.paused ? '当前处于休息或暂缓状态，点击页面左下角可恢复。' : state.feed === 'twitter' ? `已连接推特 · 本页 ${state.count} / ${state.pageSize} 条 · v${state.version}` : `已连接当前网页 · 检测到 ${state.videoCount} 个视频`;
  } catch {
    status.textContent = '当前网页未连接插件。如果是抖音或 X，请刷新网页。';
  }
}).catch(() => {status.textContent = '无法检查当前网页，请手动刷新抖音或 X。';});
reloadButton.onclick = async () => {
  try { if(currentTab) await chrome.tabs.reload(currentTab.id); window.close(); }
  catch(error) {status.textContent = error.message;}
};
