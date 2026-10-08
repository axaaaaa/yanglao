const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/;
function monthIndex(value){if(!MONTH.test(value))throw Error('请选择有效年月');return Number(value.slice(0,4))*12+Number(value.slice(5))-1;}
function normalizeData(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('备份应为记录对象');
 const date=k=>{const v=raw[k]??'';if(typeof v!=='string'||(v&&!MONTH.test(v)))throw Error('备份年月格式错误');return v;};
 const targetYears=Number(raw.targetYears??20);if(!Number.isInteger(targetYears)||targetYears<1||targetYears>60)throw Error('目标年限应为 1–60 的整数');
 let items=raw.items??(raw.deductMonths?[{desc:'旧数据迁移',count:raw.deductMonths}]:[]);
 if(!Array.isArray(items)||items.length>10000)throw Error('记录列表格式错误');
 items=items.map((item,i)=>{if(!item||typeof item!=='object')throw Error('记录格式错误');const count=Number(item.count);if(!Number.isSafeInteger(count)||count<1||count>12000)throw Error('扣除月数应为正整数');const year=item.year==null||item.year===''?null:Number(item.year);if(year!==null&&(!Number.isInteger(year)||year<1900||year>9999))throw Error('记录年份格式错误');let range={};if(item.startMonth||item.endMonth){const a=monthIndex(item.startMonth),b=monthIndex(item.endMonth);if(b<a||b-a+1!==count||Math.floor(a/12)!==year||Math.floor(b/12)!==year)throw Error('中断区间与年份或月数不一致');range={startMonth:item.startMonth,endMonth:item.endMonth};}return{...range,id:String(item.id??`import-${i}`),desc:String(item.desc??'未命名中断').slice(0,120),count,year};});
 return{version:3,startDate:date('startDate'),endDate:date('endDate'),targetYears,items};
}
function computeStats(data){
 if(!data.startDate||!data.endDate)return null;
 const start=monthIndex(data.startDate),end=monthIndex(data.endDate);if(end<start)throw Error('截止年月需晚于或等于开始年月');if(end-start>1200)throw Error('计算跨度请控制在 100 年以内');
 const years=[];for(let y=Math.floor(start/12);y<=Math.floor(end/12);y++){const span=Math.min(end,y*12+11)-Math.max(start,y*12)+1;const deduction=data.items.filter(i=>i.year===y).reduce((n,i)=>n+i.count,0);if(deduction>span)throw Error(`${y} 年扣除月份超过该年统计月份`);const cells=Array.from({length:12},(_,m)=>y*12+m<start||y*12+m>end?'outside':'paid');let unknown=0;for(const item of data.items.filter(i=>i.year===y)){if(item.startMonth){for(let k=monthIndex(item.startMonth);k<=monthIndex(item.endMonth);k++){if(k<start||k>end)throw Error('中断区间需位于缴纳时间范围内');const m=k%12;if(cells[m]==='deducted')throw Error('中断区间存在重叠');cells[m]='deducted';}}else unknown+=item.count;}for(let m=11;m>=0&&unknown;m--)if(cells[m]==='paid'){cells[m]='deducted';unknown--;}years.push({year:y,span,deduction,paid:span-deduction,cells,estimated:data.items.some(i=>i.year===y&&!i.startMonth)});}
 const outside=data.items.some(i=>i.year!==null&&(i.year<Math.floor(start/12)||i.year>Math.floor(end/12)));if(outside)throw Error('中断记录年份需位于缴纳时间范围内');
 const span=end-start+1,deduction=data.items.reduce((n,i)=>n+i.count,0);if(deduction>span)throw Error('累计扣除月份超过缴纳时间跨度');
 const paid=span-deduction,unassigned=data.items.filter(i=>i.year===null).reduce((n,i)=>n+i.count,0),target=data.targetYears*12;
 const remaining=Math.max(0,target-paid);
 const forecastIndex=end+remaining;
 const forecastMonth=remaining?`${String(Math.floor(forecastIndex/12)).padStart(4,'0')}-${String(forecastIndex%12+1).padStart(2,'0')}`:null;
 return{span,deduction,paid,years,unassigned,target,remaining,forecastMonth,pct:Math.min(100,paid/target*100)};
}
if(typeof module!=='undefined')module.exports={monthIndex,normalizeData,computeStats};
