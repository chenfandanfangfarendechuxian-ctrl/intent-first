const MindfulConnection = (() => {
  async function request(message) {
    try {
      if(!globalThis.chrome?.runtime?.sendMessage) throw new Error('Extension context invalidated');
      const result=await chrome.runtime.sendMessage(message);
      if(result?.error) throw new Error(result.error);
      return result;
    } catch(error) {
      if(/context invalidated|receiving end does not exist|message port closed|reading ['"]sendMessage/i.test(error.message)) {
        const disconnected=new Error('扩展已更新或连接已断开，请先复制已填内容，再刷新此网页。');
        disconnected.code='DISCONNECTED';throw disconnected;
      }
      throw error;
    }
  }
  return {request};
})();
