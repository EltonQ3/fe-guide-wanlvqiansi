const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
function setup(stored){
 const nodes={},store={'fe-next.planner.v1':stored};
 const node=id=>nodes[id]??={value:'',innerHTML:'',textContent:'',checked:false,classList:{add(){},remove(){}},focus(){},scrollIntoView(){},showModal(){this.open=true}};
 const ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:node,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}},history:{replaceState(){}},CSS:{escape:String},setTimeout,clearTimeout});
 for(const f of ['dietrich.js','campaign.js','reference.js','planner.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
 return {run:code=>vm.runInContext(code,ctx),node,store,click:dataset=>vm.runInContext(`plannerAction({dataset:${JSON.stringify(dataset)},closest:()=>null})`,ctx)};
}
const routes={kai:'凯伊线',dietrich:'迪托利希线',theodora:'赛奥朵拉线',leda:'蕾达线'};
const t=setup(null);
for(const [id,name] of Object.entries(routes)){
 const rows=t.run(`plannerScouts('${id}')`).map(c=>c.name);
 assert.deepEqual([...rows].sort(),data.characters.filter(c=>/^\dS \/ \d+R/.test(c.recruit[name]||'')).map(c=>c.name).sort(),id+' scouts');
 const fame=t.run(`plannerScouts('${id}').map(c=>c.plan['${id}'].renown)`);assert.deepEqual(fame,[...fame].sort((a,b)=>a-b));
 assert(t.run(`plannerOwn('${id}')`).some(c=>c.recruit[name]==='本路线主角'));
}
t.run(`$('#main').innerHTML=plannerPage('leda');renderPlanner()`);
assert.equal(t.run('plannerData().route'),'leda');
const list=t.node('#planner-list').innerHTML;
assert.equal([...list.matchAll(/data-plan-row=/g)].length,t.run(`plannerScouts('leda').length`));
assert(list.includes('凯伊外传 · 第11章 10/16—10/22')&&list.includes('#route/leda/paralogues'),'paralogue window on this route');
const id=name=>data.characters.find(c=>c.name===name).id;
for(const name of ['蒂亚拉','希蒙','努佐','法比奥'])t.click({planMark:'target',planId:id(name)});
t.click({planMark:'done',planId:id('洛蕾塔')});
const totals=t.run(`plannerTotals('leda')`);
assert.equal(totals.people.length,4);assert.equal(totals.gold,3500);assert.equal(totals.renown,9);
assert.equal(totals.items['铁弓'].qty,3);assert(totals.items['合适武器'].unknown);
const summary=t.node('#planner-summary').innerHTML;
assert(summary.includes('3,500G')&&summary.includes('合适武器 · 数量待确认')&&summary.includes('支付 500G'));
assert(!summary.includes('铁剑'),'recruited people leave the shopping list');
assert(t.run(`plannerText('leda')`).startsWith('【蕾达篇 · 招募计划】'));
t.click({planMark:'target',planId:id('希蒙')});assert.equal(t.run(`plannerTotals('leda')`).gold,3000,'toggling a mark off');
t.click({renown:'1'});t.click({renown:'-1'});t.click({renown:'-1'});assert.equal(t.run(`plannerData().renown.leda`),1,'renown floor');
t.click({planFilter:'ready'});assert(t.node('#planner-list').innerHTML.includes('当前名声还没有达标'));
t.click({plannerRoute:'kai'});t.click({planMark:'done',planId:id('洛蕾塔')});
assert(t.run('plannerMatrix(true)').includes('2 线'),'duplicate recruits flagged for Part III merge');
const saved=JSON.parse(t.store['fe-next.planner.v1']);assert.equal(saved.route,'kai');assert.equal(saved.marks.leda[id('洛蕾塔')],'done');
const matrix=t.run('plannerMatrix(false)');
assert.equal([...matrix.matchAll(/class="is-lowest"/g)].length,data.characters.reduce((n,c)=>n+Object.values(c.plan||{}).filter(p=>p.lowest).length,0));
const bad=setup('{"route":"x","filter":"y","renown":{"kai":99,"leda":"3"},"marks":{"kai":{"1":"maybe"}}}');
assert.deepEqual(JSON.parse(JSON.stringify(bad.run('plannerData()'))),{route:'kai',filter:'all',renown:{kai:1,dietrich:1,theodora:1,leda:3},marks:{kai:{},dietrich:{},theodora:{},leda:{}}});
assert(t.run('plannerHomeCard()').includes('#planner/leda')&&t.run('plannerHomeCard()').includes('已招 1'),'home card lists routes with marks');
assert(bad.run('plannerHomeCard()').includes('开始规划'),'home card invites planning when empty');
console.log('Planner: route lists, paralogue windows, totals, marks, persistence and matrix passed.');
