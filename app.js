'use strict';
const STORAGE_KEY='pension_data_v2';
const $=id=>document.getElementById(id);
let state,editing=null,noticeTimer,confirmAction=null;
// Use the same Shanghai calendar for the visible date and calculation month.
const todayDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const currentMonth=()=>todayDate().slice(0,7);
const followToday=data=>({...data,endDate:currentMonth()});
const fresh=()=>({version:3,startDate:'',endDate:currentMonth(),targetYears:20,items:[]});
function notify(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,4500);}
function persist(candidate){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(candidate));$('storageStatus').textContent='已保存到本机 · 建议定期备份';return true;}catch(e){notify('本机存储写入失败，请导出备份',true);return false;}}
function accept(candidate){candidate=normalizeData(followToday(candidate));computeStats(candidate);if(!persist(candidate))return false;state=candidate;render();return true;}
function readSettings(){return {...state,startDate:$('startDate').value,endDate:currentMonth(),targetYears:$('targetYears').value};}
function saveSettings(e){e?.preventDefault();try{if(accept(readSettings())&&e?.type==='submit')notify('缴纳计划已保存');}catch(err){notify(err.message,true);}}
function text(id,value){$(id).textContent=value;}
function render(){
 $('startDate').value=state.startDate;$('endDate').value=currentMonth();text('todayDate',`自动计算至 ${todayDate()}（北京时间）`);$('targetYears').value=state.targetYears;
 const list=$('recordList');list.replaceChildren();text('recordCount',`${state.items.length} 条`);
 state.items.forEach((item,index)=>{const li=document.createElement('li');li.className='record-item';const info=document.createElement('div');info.className='record-info';const title=document.createElement('span');title.className='record-desc';title.textContent=item.desc;const meta=document.createElement('span');meta.className='record-meta';meta.textContent=`${item.startMonth?item.startMonth+' 至 '+item.endMonth:item.year??'未分配年份'} · 扣除 ${item.count} 个月`;info.append(title,meta);const actions=document.createElement('div');actions.className='record-actions';[['编辑','edit'],['删除','delete']].forEach(([label,action])=>{const b=document.createElement('button');b.className=`text-button ${action}`;b.textContent=label;b.dataset.action=action;b.dataset.index=index;b.setAttribute('aria-label',`${label}：${item.desc}`);actions.append(b);});li.append(info,actions);list.append(li);});
 let stats;try{stats=computeStats(state);}catch(err){notify(err.message,true);}
 text('metricDeduct',state.items.reduce((n,i)=>n+i.count,0));text('targetText',`${state.targetYears} 年`);$('yearList').replaceChildren();
 if(!stats){['metricPaid','metricYears','metricPct','spanText','forecastMonth'].forEach(id=>text(id,'—'));text('metricRemaining','设置日期后开始统计');text('ringPct','0%');$('progressRing').style.setProperty('--progress','0%');text('progressText','选择有效的起止年月，开启你的记录。');text('annualNote','设置时间范围后查看年度统计。');text('forecastAssumption','设置开始年月后，将自动预测目标达成月份。');return;}
 const pct=stats.pct.toFixed(1).replace(/\.0$/,'');text('metricPaid',stats.paid);text('metricYears',`${Math.floor(stats.paid/12)}年 ${stats.paid%12}月`);text('metricPct',`${pct}%`);text('ringPct',`${pct}%`);$('progressRing').style.setProperty('--progress',`${stats.pct}%`);text('metricRemaining',stats.remaining?`距离目标还差 ${stats.remaining} 个月`:'已达到个人参考目标');text('progressText',stats.remaining?`再积累 ${Math.floor(stats.remaining/12)} 年 ${stats.remaining%12} 个月，即达目标。`:'已达到目标，继续积累每一段时光。');text('spanText',`${stats.span} 个月`);text('forecastMonth',stats.forecastMonth?`${Number(stats.forecastMonth.slice(0,4))}年${Number(stats.forecastMonth.slice(5))}月`:'已达到目标');text('forecastAssumption',stats.remaining?'预测假设：本月已计入，之后每月连续缴纳；新增中断会顺延。':'累计实缴已达到当前目标，无需预测未来达成月份。');
 text('annualNote',stats.unassigned?`有 ${stats.unassigned} 个月扣除尚未分配年份。下方年度合计为 ${stats.paid+stats.unassigned} 个月；总实缴已扣除这些月份。`:'已按所属年份扣除中断月份，年度合计与累计实缴一致。');
 stats.years.slice().reverse().forEach(year=>{const row=document.createElement('div');row.className='year-row';const label=document.createElement('span');label.className='year-title';label.textContent=year.year;const blocks=document.createElement('div');blocks.className='year-blocks';blocks.setAttribute('aria-label',`${year.year}年：统计${year.span}个月，已缴${year.paid}个月，中断${year.deduction}个月`);for(let i=0;i<12;i++){const cell=document.createElement('span');cell.className=`month-cell ${year.cells[i]==='outside'?'':year.cells[i]}`;cell.title=`${year.year}年${i+1}月：${year.cells[i]==='outside'?'统计范围外':year.cells[i]==='deducted'?'中断':'已缴'}${year.estimated?'（月份位置为数量示意）':''}`;cell.setAttribute('aria-label',cell.title);cell.textContent=i+1;blocks.append(cell);}const total=document.createElement('span');total.className='year-total';const paidText=document.createElement('span');paidText.textContent=`已缴 ${year.paid} / ${year.span} 个月`;const deductionText=document.createElement('span');deductionText.className='year-deduction';deductionText.textContent=`中断 ${year.deduction} 个月`;total.append(paidText,deductionText);row.append(label,blocks,total);$('yearList').append(row);});
}
function resetEditor(){editing=null;$('recordForm').reset();$('cancelEdit').hidden=true;text('recordSubmit','＋ 添加记录');}
function submitRecord(e){e.preventDefault();try{const candidate=readSettings(),item={id:editing===null?String(Date.now())+'-'+Math.random().toString(36).slice(2):state.items[editing].id,desc:$('newDesc').value.trim()||'未命名中断',count:$('newCount').value,year:$('newYear').value};if(editing!==null){const original=state.items[editing];if(original.startMonth&&Number(item.count)===original.count&&Number(item.year)===original.year){item.startMonth=original.startMonth;item.endMonth=original.endMonth;}}candidate.items=state.items.slice();if(editing===null)candidate.items.push(item);else candidate.items[editing]=item;if(accept(candidate)){resetEditor();notify('中断记录已保存');}}catch(err){notify(err.message,true);}}
function ask(message,action){confirmAction=action;text('confirmMessage',message);$('confirmDialog').showModal();}
$('settingsForm').addEventListener('submit',saveSettings);['startDate','targetYears'].forEach(id=>$(id).addEventListener('change',saveSettings));$('recordForm').addEventListener('submit',submitRecord);$('cancelEdit').addEventListener('click',resetEditor);
$('recordList').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const index=Number(b.dataset.index),item=state.items[index];if(!item)return;if(b.dataset.action==='edit'){editing=index;$('newDesc').value=item.desc;$('newCount').value=item.count;$('newYear').value=item.year??'';$('cancelEdit').hidden=false;text('recordSubmit','保存修改');$('newDesc').focus();}else ask(`删除“${item.desc}”这条记录？`,()=>{try{if(accept({...state,items:state.items.filter((_,i)=>i!==index)})){resetEditor();notify('记录已删除');}}catch(err){notify(err.message,true);}});});
$('confirmCancel').addEventListener('click',()=>{$('confirmDialog').close();confirmAction=null;});$('confirmDialog').addEventListener('cancel',()=>{confirmAction=null;});$('confirmYes').addEventListener('click',()=>{const action=confirmAction;confirmAction=null;$('confirmDialog').close();action?.();});
$('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pension_backup_${currentMonth()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('备份已导出');});
$('fileInput').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2*1024*1024)throw Error('备份文件请小于 2 MB');const candidate=normalizeData(followToday(JSON.parse(await file.text())));computeStats(candidate);ask(`恢复备份将替换当前 ${state.items.length} 条记录，是否继续？`,()=>{try{if(accept(candidate)){resetEditor();notify('备份已恢复');}}catch(err){notify(err.message,true);}});}catch(err){notify(`导入失败：${err.message}`,true);}});
$('clearBtn').addEventListener('click',()=>ask('清空本机记录前，建议先导出备份。确认清空？',()=>{if(accept(fresh())){resetEditor();notify('本机记录已清空');}}));
try{const saved=localStorage.getItem(STORAGE_KEY);state=saved?normalizeData(followToday(JSON.parse(saved))):fresh();}catch(err){state=fresh();notify('历史数据格式异常，原存储未覆盖；可检查备份后重新导入',true);}
// One-time upgrade: existing default 15-year plans become 20-year plans.
try { if (!localStorage.getItem('pension_target20_migrated')) {
 if (state.targetYears === 15) state.targetYears = 20;
 if (persist(state)) localStorage.setItem('pension_target20_migrated', '1');
} } catch (err) { notify('目标更新未保存，请导出备份', true); }
// Reconcile only the old aggregate or an empty initial record; preserve custom entries.
const confirmed = globalThis.CONFIRMED_PENSION_RECORDS;
if (confirmed && !localStorage.getItem('pension_confirmed_ranges_v1')) {
 const legacy = state.items.length === 1 && state.items[0].desc === '旧数据迁移' && [53,58].includes(state.items[0].count) && !state.items[0].startMonth;
 const empty = !state.startDate && state.items.length === 0;
 if (legacy || empty) {
  try {
   const candidate = normalizeData(followToday({...state,startDate:state.startDate || confirmed.startDate,items:confirmed.items}));
   computeStats(candidate);
   if (persist(candidate)) { state = candidate; localStorage.setItem('pension_confirmed_ranges_v1','1'); }
  } catch (err) { notify(err.message,true); }
 }
}
render();

let lastCalculationDay = todayDate();
function refreshToday() {
 const day = todayDate();
 if (day === lastCalculationDay) return;
 lastCalculationDay = day;
 state = followToday(state);
 persist(state);
 render();
}
// Check every minute; background tabs catch up immediately when focused.
setInterval(refreshToday, 60000);
window.addEventListener('focus', refreshToday);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshToday(); });
