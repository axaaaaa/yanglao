const assert=require('node:assert/strict');const fs=require('node:fs');const {normalizeData,computeStats,monthIndex}=require('../pension-core');let n=0;function test(name,f){f();n++;console.log('PASS: '+name);}
const base={startDate:'2008-01',endDate:'2025-12',items:[{count:58}]};
test('legacy sample = 158 months',()=>assert.equal(computeStats(normalizeData(base)).paid,158));
test('provided my.json migration',()=>assert.equal(computeStats(normalizeData(JSON.parse(fs.readFileSync('my.json')))).paid,173));
test('deductMonths migration',()=>assert.equal(normalizeData({deductMonths:4}).items[0].count,4));
test('same month inclusive',()=>assert.equal(computeStats(normalizeData({startDate:'2025-01',endDate:'2025-01'})).paid,1));
test('annual assigned totals',()=>{const s=computeStats(normalizeData({startDate:'2024-11',endDate:'2025-03',items:[{count:2,year:2025}]}));assert.equal(s.paid,3);assert.equal(s.years.reduce((n,y)=>n+y.paid,0),3);});
test('unassigned deduction separated',()=>{const s=computeStats(normalizeData(base));assert.equal(s.unassigned,58);assert.equal(s.years.reduce((n,y)=>n+y.paid,0),216);});
test('custom target and cap',()=>{const s=computeStats(normalizeData({...base,targetYears:10}));assert.equal(s.pct,100);assert.equal(s.remaining,0);});
test('reversed dates rejected',()=>assert.throws(()=>computeStats(normalizeData({startDate:'2025-02',endDate:'2025-01'}))));
test('invalid months rejected',()=>assert.throws(()=>monthIndex('2025-13')));
test('negative / fractional counts rejected',()=>{[-1,1.2,0,'bad'].forEach(count=>assert.throws(()=>normalizeData({items:[{count}]})));});
test('invalid backup shapes rejected',()=>{[null,[],{items:{}},{targetYears:0}].forEach(v=>assert.throws(()=>normalizeData(v)));});
test('excess total deduction rejected',()=>assert.throws(()=>computeStats(normalizeData({startDate:'2025-01',endDate:'2025-02',items:[{count:3}]}))));
test('excess annual deduction rejected',()=>assert.throws(()=>computeStats(normalizeData({startDate:'2025-11',endDate:'2025-12',items:[{count:3,year:2025}]}))));
test('out-of-range year rejected',()=>assert.throws(()=>computeStats(normalizeData({startDate:'2025-01',endDate:'2025-12',items:[{count:1,year:2024}]}))));
test('empty dates return empty stats',()=>assert.equal(computeStats(normalizeData({})),null));
test('normalization leaves source untouched',()=>{const raw=JSON.parse(JSON.stringify(base));normalizeData(raw);assert.deepEqual(raw,base);});
console.log(`RESULT: ${n}/${n} tests passed`);

