const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let now='2026-10-07T04:00:00Z';class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}}
const elements={};function element(){return {value:'',textContent:'',hidden:false,classList:{toggle(){}},style:{setProperty(){}},addEventListener(){},replaceChildren(){},append(){},setAttribute(){},dataset:{}};}
const saved={startDate:'2008-01',endDate:'2025-12',targetYears:20,items:[{count:58}]};const store={pension_data_v2:JSON.stringify(saved),pension_target20_migrated:'1'};const callbacks={};
const ctx={console,Date:Clock,Intl,Math,JSON,Number,String,Error,setTimeout:()=>0,clearTimeout(){},setInterval:f=>{callbacks.tick=f;},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v},document:{getElementById:id=>elements[id]??=(element()),createElement:element,addEventListener:(k,f)=>callbacks[k]=f,hidden:false},window:{addEventListener:(k,f)=>callbacks[k]=f}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('pension-core.js','utf8'),ctx);vm.runInContext(fs.readFileSync('confirmed-records.js','utf8'),ctx);vm.runInContext(fs.readFileSync(process.argv[2]||'app.js','utf8'),ctx);
console.log('LOAD: endDate='+elements.endDate.textContent+'; paid='+elements.metricPaid.textContent);
if(process.argv.includes('--baseline')){assert.equal(elements.endDate.textContent,'2025-12');process.exit(0);}
assert.equal(elements.endDate.textContent,'2026-10');assert.equal(elements.metricPaid.textContent,169);
now='2026-10-31T16:01:00Z';callbacks.tick();assert.equal(elements.endDate.textContent,'2026-11');assert.equal(elements.metricPaid.textContent,170);console.log('MONTH: endDate=2026-11; paid=170');
now='2026-12-01T00:01:00Z';callbacks.focus();assert.equal(elements.endDate.textContent,'2026-12');console.log('FOCUS: endDate=2026-12');
now='2027-01-01T00:01:00Z';callbacks.visibilitychange();assert.equal(elements.endDate.textContent,'2027-01');console.log('VISIBLE: endDate=2027-01');assert.equal(JSON.parse(store.pension_data_v2).endDate,'2025-12');assert.equal(elements.startDate.textContent,'2008-05');assert.equal(/localStorage|data-action/.test(fs.readFileSync('app.js','utf8')),false);assert.equal(/<input|<button|<form|<dialog/.test(fs.readFileSync('index.html','utf8')),false);console.log('PASS: live today calculation and read-only rollover; local storage unchanged');
