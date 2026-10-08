'use strict';
const $=id=>document.getElementById(id);
const todayDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const currentMonth=()=>todayDate().slice(0,7);
const followToday=data=>({...data,endDate:currentMonth()});
function notify(message){$('notice').textContent=message;$('notice').hidden=false;}
let state=normalizeData(followToday({...globalThis.CONFIRMED_PENSION_RECORDS,version:3,targetYears:20}));
function text(id,value){$(id).textContent=value;}
function render(){
 text('startDate',state.startDate);text('endDate',currentMonth());text('todayDate',`自动计算至 ${todayDate()}（北京时间）`);text('targetYears',`${state.targetYears} 年`);
 const list=$('recordList');list.replaceChildren();text('recordCount',`${state.items.length} 条`);
 state.items.forEach((item,index)=>{const li=document.createElement('li');li.className='record-item';const info=document.createElement('div');info.className='record-info';const title=document.createElement('span');title.className='record-desc';title.textContent=item.desc;const meta=document.createElement('span');meta.className='record-meta';meta.textContent=`${item.startMonth?item.startMonth+' 至 '+item.endMonth:item.year??'未分配年份'} · 扣除 ${item.count} 个月`;info.append(title,meta);li.append(info);list.append(li);});
 let stats;try{stats=computeStats(state);}catch(err){notify(err.message,true);}
 text('metricDeduct',state.items.reduce((n,i)=>n+i.count,0));text('targetText',`${state.targetYears} 年`);$('yearList').replaceChildren();
 if(!stats){['metricPaid','metricYears','metricPct','spanText','forecastMonth'].forEach(id=>text(id,'—'));text('metricRemaining','设置日期后开始统计');text('ringPct','0%');$('progressRing').style.setProperty('--progress','0%');text('progressText','选择有效的起止年月，开启你的记录。');text('annualNote','设置时间范围后查看年度统计。');text('forecastAssumption','设置开始年月后，将自动预测目标达成月份。');return;}
 const pct=stats.pct.toFixed(1).replace(/\.0$/,'');text('metricPaid',stats.paid);text('metricYears',`${Math.floor(stats.paid/12)}年 ${stats.paid%12}月`);text('metricPct',`${pct}%`);text('ringPct',`${pct}%`);$('progressRing').style.setProperty('--progress',`${stats.pct}%`);text('metricRemaining',stats.remaining?`距离目标还差 ${stats.remaining} 个月`:'已达到个人参考目标');text('progressText',stats.remaining?`再积累 ${Math.floor(stats.remaining/12)} 年 ${stats.remaining%12} 个月，即达目标。`:'已达到目标，继续积累每一段时光。');text('spanText',`${stats.span} 个月`);text('forecastMonth',stats.forecastMonth?`${Number(stats.forecastMonth.slice(0,4))}年${Number(stats.forecastMonth.slice(5))}月`:'已达到目标');text('forecastAssumption',stats.remaining?'预测假设：本月已计入，之后每月连续缴纳；新增中断会顺延。':'累计实缴已达到当前目标，无需预测未来达成月份。');
 text('annualNote',stats.unassigned?`有 ${stats.unassigned} 个月扣除尚未分配年份。下方年度合计为 ${stats.paid+stats.unassigned} 个月；总实缴已扣除这些月份。`:'已按所属年份扣除中断月份，年度合计与累计实缴一致。');
 stats.years.slice().reverse().forEach(year=>{const row=document.createElement('div');row.className='year-row';const label=document.createElement('span');label.className='year-title';label.textContent=year.year;const blocks=document.createElement('div');blocks.className='year-blocks';blocks.setAttribute('aria-label',`${year.year}年：统计${year.span}个月，已缴${year.paid}个月，中断${year.deduction}个月`);for(let i=0;i<12;i++){const cell=document.createElement('span');cell.className=`month-cell ${year.cells[i]==='outside'?'':year.cells[i]}`;cell.title=`${year.year}年${i+1}月：${year.cells[i]==='outside'?'统计范围外':year.cells[i]==='deducted'?'中断':'已缴'}${year.estimated?'（月份位置为数量示意）':''}`;cell.setAttribute('aria-label',cell.title);cell.textContent=i+1;blocks.append(cell);}const total=document.createElement('span');total.className='year-total';const paidText=document.createElement('span');paidText.textContent=`已缴 ${year.paid} / ${year.span} 个月`;const deductionText=document.createElement('span');deductionText.className='year-deduction';deductionText.textContent=`中断 ${year.deduction} 个月`;total.append(paidText,deductionText);row.append(label,blocks,total);$('yearList').append(row);});
}
render();
let lastCalculationDay=todayDate();
function refreshToday(){const day=todayDate();if(day===lastCalculationDay)return;lastCalculationDay=day;state=followToday(state);render();}
setInterval(refreshToday,60000);
window.addEventListener('focus',refreshToday);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshToday();});
