// Task cards keep the goal, stopping rule and next action together.
const MindfulTasks = (() => {
  function mount(container, fields) {
    let cards = [], selected = null, busy = false, disposed = false, revision = 0;
    const style = document.createElement('style');
    style.textContent = `.mf-tasks{margin:14px 0}.mf-tasks .task-list{display:grid;gap:8px;margin:10px 0}.mf-tasks .task-item{display:flex;align-items:stretch;border:1px solid #bacbbf;border-radius:12px;background:#fff;overflow:hidden}.mf-tasks button{font:inherit;cursor:pointer;color:#234f41;background:#fff;border:1px solid #bacbbf;border-radius:10px;padding:9px 12px;min-height:40px}.mf-tasks .task-pick{flex:1;min-width:0;text-align:left;border:0;border-radius:0;overflow-wrap:anywhere}.mf-tasks .task-pick strong,.mf-tasks .task-pick small{display:block}.mf-tasks .task-pick small{font-size:12px;color:#62766b;margin-top:3px}.mf-tasks .task-pick[aria-pressed=true]{background:#e5efe7}.mf-tasks .task-remove{border:0;border-left:1px solid #e4e9e4;border-radius:0;flex-shrink:0}.mf-tasks .task-actions{display:flex;gap:8px;flex-wrap:wrap}.mf-tasks .task-status{font-size:13px;color:#52695e;margin:6px 0;overflow-wrap:anywhere}.mf-tasks button:disabled{opacity:.5;cursor:default}.mf-tasks [hidden]{display:none!important}`;
    container.classList.add('mf-tasks');
    const list = document.createElement('div'); list.className = 'task-list';
    const actions = document.createElement('div'); actions.className = 'task-actions';
    const add = document.createElement('button'); add.type='button'; add.textContent='＋ 保存为新任务卡';
    const update = document.createElement('button'); update.type='button'; update.textContent='更新这张任务卡'; update.hidden=true;
    const status = document.createElement('div'); status.className='task-status'; status.setAttribute('role','status');
    actions.append(add,update);container.append(style,list,actions,status);
    const read = () => ({purpose:fields.purpose.value.trim(),stopCondition:fields.stopCondition.value.trim(),exitAction:fields.exitAction.value.trim(),budget:Number(fields.budget.value)});
    const call = MindfulConnection.request;
    function render() {
      if(disposed)return;
      if(selected && !cards.some(card=>card.id===selected)) selected=null;
      list.replaceChildren(); update.hidden=!selected;
      for(const card of cards) {
        const row=document.createElement('div');row.className='task-item';
        const pick=document.createElement('button');pick.type='button';pick.className='task-pick';pick.setAttribute('aria-label',`选择任务卡：${card.purpose}`);pick.setAttribute('aria-pressed',String(selected===card.id));
        const title=document.createElement('strong');title.textContent=card.purpose;
        const description=document.createElement('small');description.textContent=`${card.budget} 分钟内 · 结束：${card.stopCondition} · 然后：${card.exitAction}`;
        pick.append(title,description);
        pick.onclick=()=>{selected=card.id;for(const [key,input] of Object.entries(fields)){input.value=String(card[key]);input.dispatchEvent(new Event('input',{bubbles:true}));}render();status.textContent='已填入整张任务卡，可按本次需要调整。';};
        const remove=document.createElement('button');remove.type='button';remove.className='task-remove';remove.textContent='×';remove.setAttribute('aria-label',`删除任务卡：${card.purpose}`);
        remove.onclick=()=>mutate({type:'TASK_EDIT',action:'remove',id:card.id},'已移除任务卡，当前填写内容保留。');
        row.append(pick,remove);list.append(row);
      }
    }
    async function mutate(message,success) {
      if(busy)return;busy=true;add.disabled=update.disabled=true;
      try {const result=await call(message);cards=result.tasks || [];if(result.id)selected=result.id;render();status.textContent=success;}
      catch(error){status.textContent=`未保存：${error.message}`;}
      finally{busy=false;add.disabled=update.disabled=false;}
    }
    function save(edit) {
      const card=read();
      for(const key of ['purpose','stopCondition','exitAction'])if(!card[key]){status.textContent='保存任务卡前，请填好目的、结束条件和退出后行动。';fields[key].focus();return;}
      return mutate({type:'TASK_EDIT',action:'save',card:{...card,...(edit?{id:selected}:{})}},'任务卡已保存，下次可一键选择。');
    }
    add.onclick=()=>save(false);update.onclick=()=>save(true);
    const onStorage=(changes,area)=>{if(area==='local' && changes.tasks){revision++;cards=changes.tasks.newValue || [];render();}};
    chrome.storage.onChanged.addListener(onStorage);
    const current=++revision;
    call({type:'TASKS'}).then(result=>{if(!disposed && current===revision){cards=result.tasks || [];render();}}).catch(error=>{if(!disposed)status.textContent=`读取任务卡失败：${error.message}`;});
    return ()=>{disposed=true;chrome.storage.onChanged.removeListener?.(onStorage);};
  }
  return {mount};
})();
