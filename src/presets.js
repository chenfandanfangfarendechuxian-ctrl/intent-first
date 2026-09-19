// Shared by the extension's isolated content scripts, settings page and local demo.
const MindfulPresets = (() => {
  const titles = {purpose:'浏览目的', business:'目标 / 想做的事', next:'下一步行动'};
  const limits = {purpose:200,business:200,next:500};
  function mount(container, input, kind) {
    let disposed = false, items = [], busy = false, request = 0;
    container.classList.add('mf-presets');
    const style = document.createElement('style');
    style.textContent = `.mf-presets{margin-top:10px;font:inherit}.mf-presets .mf-chips{display:flex;flex-wrap:wrap;gap:8px}.mf-presets button{font:inherit;font-size:13px;min-height:36px;padding:6px 10px;background:#fff;color:#234f41;border:1px solid #bacbbf;border-radius:10px;cursor:pointer;overflow-wrap:anywhere;max-width:100%}.mf-presets .mf-chip{display:inline-flex;max-width:100%;border:1px solid #bacbbf;border-radius:10px;background:#fff}.mf-presets .mf-chip button{border:0;background:transparent}.mf-presets .mf-chip button:first-child{min-width:0;text-align:left}.mf-presets .mf-chip button:last-child{flex-shrink:0;color:#6d7f74}.mf-presets .mf-chip.is-selected{background:#e5efe7;border-color:#376a50}.mf-presets .mf-add{border-style:dashed;font-size:14px}.mf-presets .mf-editor{margin-top:12px;padding:12px;border-radius:12px;background:#eef2e9;color:#234f41}.mf-presets .mf-editor label{margin:0;font-size:14px}.mf-presets .mf-editor input{display:block;width:100%;min-width:0;box-sizing:border-box;margin:8px 0;padding:9px;border:1px solid #bacbbf;border-radius:8px;background:#fff;color:#19382e;font:inherit}.mf-presets .mf-editor-actions{display:flex;gap:8px}.mf-presets .mf-save{background:#234f41;color:#fff}.mf-presets .mf-status{font-size:12px;color:#52695e;margin:5px 0;overflow-wrap:anywhere}.mf-presets .mf-status:empty{display:none}.mf-presets [hidden]{display:none!important}.mf-presets button:disabled{opacity:.5;cursor:default}`;
    const chips = document.createElement('div'); chips.className = 'mf-chips';
    const editor = document.createElement('div'); editor.className = 'mf-editor'; editor.hidden = true;
    const label = document.createElement('label'); label.textContent = `自定义${titles[kind]}`;
    const draft = document.createElement('input'); draft.maxLength = limits[kind]; draft.placeholder = `输入常用${titles[kind]}，保存后可直接选择`;
    label.append(draft);
    const actions = document.createElement('div'); actions.className = 'mf-editor-actions';
    const save = document.createElement('button'); save.type='button'; save.className='mf-save'; save.textContent='保存并选择';
    const cancel = document.createElement('button'); cancel.type='button'; cancel.textContent='取消';
    actions.append(save,cancel); editor.append(label,actions);
    const status = document.createElement('div'); status.className='mf-status'; status.setAttribute('role','status');
    container.append(style,chips,editor,status);
    const call = MindfulConnection.request;
    function select(value) { input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); input.focus(); }
    function selection() { chips.querySelectorAll('[data-value]').forEach(chip => {const chosen=chip.dataset.value===input.value.trim();chip.classList.toggle('is-selected',chosen);chip.firstElementChild.setAttribute('aria-pressed',String(chosen));}); }
    function render() {
      if(disposed) return;
      chips.replaceChildren();
      const add=document.createElement('button'); add.type='button'; add.className='mf-add'; add.textContent='＋'; add.setAttribute('aria-label',`新增${titles[kind]}预设`); add.title=`新增${titles[kind]}预设`;
      add.onclick=()=>{editor.hidden=false;draft.value=input.value.trim();save.disabled=!draft.value.trim();status.textContent='';draft.focus();}; chips.append(add);
      for(const item of items) {
        const chip=document.createElement('span');chip.className='mf-chip';chip.dataset.value=item;
        const pick=document.createElement('button');pick.type='button';pick.textContent=item;pick.setAttribute('aria-label',`选择预设：${item}`);pick.onclick=()=>select(item);
        const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`删除预设：${item}`);remove.title='只移除快捷选项，保留当前填写内容';
        remove.onclick=async()=>{
          if(busy)return;busy=true;remove.disabled=true;
          try {const result=await call({type:'PRESET_EDIT',kind,action:'remove',value:item});items=result.presets[kind] || [];render();status.textContent='已移除快捷选项，当前填写内容保留。';}
          catch(error){status.textContent=`删除失败：${error.message}`;remove.disabled=false;}finally{busy=false;}
        };
        chip.append(pick,remove);chips.append(chip);
      }
      selection();
    }
    draft.oninput=()=>{save.disabled=busy || !draft.value.trim();};
    cancel.onclick=()=>{editor.hidden=true;chips.querySelector('.mf-add')?.focus();};
    save.onclick=async()=>{
      const value=draft.value.trim();if(!value || busy)return;busy=true;save.disabled=true;cancel.disabled=true;
      try {const result=await call({type:'PRESET_EDIT',kind,action:'add',value});items=result.presets[kind] || [];editor.hidden=true;render();select(value);status.textContent='已保存，下次可以直接选择。';}
      catch(error){status.textContent=`保存失败：${error.message}`;}finally{busy=false;save.disabled=!draft.value.trim();cancel.disabled=false;}
    };
    input.addEventListener('input',selection);
    function refresh() {
      const revision=++request;
      return call({type:'PRESETS'}).then(result=>{if(!disposed && revision===request){items=result.presets?.[kind] || [];render();}}).catch(error=>{if(!disposed && revision===request)status.textContent=`读取快捷选项失败：${error.message}`;});
    }
    // Storage contains custom values only; fetch the full list including built-ins.
    const onStorage=(changes,area)=>{if(area==='local' && changes.presets)refresh();};
    chrome.storage.onChanged.addListener(onStorage);
    render();
    refresh();
    return ()=>{disposed=true;input.removeEventListener('input',selection);chrome.storage.onChanged.removeListener?.(onStorage);};
  }
  return {mount};
})();
