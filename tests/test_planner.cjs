const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
function setup(stored,options={}){
 const nodes={},store={'fe-next.planner.v1':stored};
 const node=id=>nodes[id]??={value:'',innerHTML:'',textContent:'',dataset:{},checked:false,classList:{add(){},remove(){}},focus(){},select(){},scrollIntoView(){},showModal(){this.open=true}};
 const copied=[],ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:node,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{if(options.blockStorage)throw new Error('Storage denied');store[k]=v;}},history:{replaceState(){}},CSS:{escape:String},location:{href:'https://fe-guide.pages.dev/#planner'},navigator:{clipboard:{writeText:t=>{if(options.blockClipboard)return Promise.reject(new Error('Clipboard denied'));copied.push(t);return Promise.resolve();}}},TextEncoder,TextDecoder,btoa,atob,setTimeout,clearTimeout});
 for(const f of ['dietrich.js','campaign.js','reference.js','planner.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
 return {run:code=>vm.runInContext(code,ctx),node,store,copied,click:dataset=>vm.runInContext(`plannerAction({dataset:${JSON.stringify(dataset)},closest:()=>null})`,ctx)};
}
async function main(){
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
assert.deepEqual(JSON.parse(JSON.stringify(bad.run('plannerData()'))),{route:'kai',filter:'all',renown:{kai:1,dietrich:1,theodora:1,leda:3},marks:{kai:{},dietrich:{},theodora:{},leda:{}},savedAt:null,backupAt:null,backupCode:null});
assert(t.run('plannerHomeCard()').includes('#planner/leda')&&t.run('plannerHomeCard()').includes('已招 1'),'home card lists routes with marks');
assert(bad.run('plannerHomeCard()').includes('开始规划'),'home card invites planning when empty');
// Long playthroughs: marks persist with a timestamp, and a backup link moves them to another device or domain.
assert(saved.savedAt&&!saved.backupAt,'marking records when the plan last changed');
const savedAt=saved.savedAt;t.click({planFilter:'all'});assert.equal(JSON.parse(t.store['fe-next.planner.v1']).savedAt,savedAt,'view changes do not count as plan changes');
assert(t.node('#planner-summary').innerHTML.includes('还没有备份'));
t.click({planMark:'target',planId:id('西洛可')});
const code=t.run('plannerCode()');assert.match(code,/^FW1[A-Za-z0-9_-]+$/);
const back=t.run(`plannerDecode(${JSON.stringify('https://x.pages.dev/#planner?restore='+code)})`);
assert.deepEqual(JSON.parse(JSON.stringify(back.marks)),JSON.parse(JSON.stringify(t.run('plannerData().marks'))),'backup round-trips every mark');
assert.equal(back.renown.leda,t.run('plannerData().renown.leda'));
for(const bad of ['','FW1','FW1@@@','hello',code.slice(0,12)])assert.equal(t.run(`plannerDecode(${JSON.stringify(bad)})`),null,'rejects '+bad);
t.click({planMark:'target',planId:id('莉利安')});

const before=t.copied.length;t.run(`plannerAction({id:'plan-backup',dataset:{},closest:()=>null})`);
assert.equal(t.run('plannerData().backupAt'),null,'copying has not completed yet');
await new Promise(resolve=>setImmediate(resolve));
assert(t.node('#planner-summary').innerHTML.includes('备份链接已是最新'),'backup status after copying');
assert.equal(t.copied.length,before+1);assert(t.copied.at(-1).startsWith('https://fe-guide.pages.dev/#planner?restore=FW1'));
// another device: open the link, preview the plan, then import or merge
const other=setup(null);
other.run(`$('#main').innerHTML=plannerPage('kai',${JSON.stringify(t.copied.at(-1).split('restore=')[1])});renderPlanner()`);
const banner=other.node('#planner-restore').innerHTML;
assert(banner.includes('导入这份计划')&&!banner.includes('合并到本机')&&banner.includes('蕾达篇：计划'),'empty device offers a plain import');
other.click({planRestore:'replace'});
assert.deepEqual(JSON.parse(JSON.stringify(other.run('plannerData().marks'))),JSON.parse(JSON.stringify(t.run('plannerData().marks'))));
assert.equal(other.node('#planner-restore').innerHTML,'','banner closes after import');
assert.equal(other.run('plannerData().route'),t.run('Object.keys(plannerData().marks).find(id=>Object.keys(plannerData().marks[id]).length)'),'jumps to a route that has marks');
const mixed=setup(null);mixed.click({planMark:'done',planId:id('希蒙')});mixed.click({planMark:'target',planId:id('哪吒')});
mixed.run(`plannerPending=plannerDecode(${JSON.stringify(code)});renderPlanner()`);
assert(mixed.node('#planner-restore').innerHTML.includes('合并到本机'),'device with marks is offered a merge');
mixed.click({planRestore:'merge'});
const merged=mixed.run('plannerData().marks.kai');assert.equal(merged[id('希蒙')],'done');assert.equal(merged[id('哪吒')],'target');assert.equal(merged[id('洛蕾塔')],'done');
const broken=setup(null);broken.run(`$('#main').innerHTML=plannerPage('kai','FW1@@');renderPlanner()`);assert(broken.node('#planner-restore').innerHTML.includes('无法识别'));
const flags=t.run(`characterFlags(D.characters.find(c=>c.name==='蒂亚拉'))`);assert(flags.includes('凯伊篇同伴')&&flags.includes('3 线可挖 · 最低 8R'),flags);
assert(t.run(`characterFlags(D.characters.find(c=>c.name==='凯伊'))`).includes('凯伊篇主角'));
// Home page: newcomers get three starting steps; returning readers get their place, plan and week.
const fresh=setup(null);assert(fresh.run('home()').includes('第一次来？三步上手'));
const routesHtml=fresh.run("homeRoutes(['凯伊','迪托利希','赛奥朵拉','蕾达'].map(n=>D.characters.find(c=>c.aliases.includes(n))))");
const pos=['凯伊篇','赛奥朵拉篇','迪托利希篇','蕾达篇'].map(n=>routesHtml.indexOf(n));assert.deepEqual([...pos].sort((a,b)=>a-b),pos,'existing route card positions are preserved');
fresh.run("rememberReading('#route/kai/paralogues','凯伊篇 · 外传与漏接提醒')");
const resumed=fresh.run('home()');assert(resumed.includes('继续你的旅程')&&resumed.includes('#route/kai/paralogues')&&resumed.includes('凯伊篇 · 外传与漏接提醒'));
assert(t.run('homeResume()').includes('蕾达篇<small> 计划'),'plan summary per route');
// Paralogue reminders on the home page follow the saved in-game date of each route.
const dated=setup(null);dated.store['fe-next.gamedate.v1']=JSON.stringify({kai:'10/19',leda:'2/30'});
const alerts=dated.run('homeResume()');assert(alerts.includes('继续你的旅程')&&alerts.includes('外传提醒')&&alerts.includes('今天是最后一天可接'),'closing window is surfaced first');
assert(alerts.indexOf('今天是最后一天可接')<alerts.indexOf('</div>',alerts.indexOf('外传提醒')),'alert sits in the reminder block');
assert(!alerts.includes('蕾达篇 · '),'invalid saved dates are ignored');
dated.store['fe-next.gamedate.v1']=JSON.stringify({kai:'10/11'});
const deadlines=dated.run('homeResume()');
assert(deadlines.includes('已接者须在 10/12 前完成'),'known completion deadline is a home alert');
assert(deadlines.indexOf('已接者须在 10/12 前完成')<deadlines.indexOf('7 天后开放'),'completion deadline comes before the next opening');
// Failed persistence and rejected clipboard must not claim the plan is saved or backed up.
const faults={blockStorage:true,blockClipboard:true},denied=setup(null,faults);
denied.run(`$('#main').innerHTML=plannerPage('kai');renderPlanner()`);
denied.click({planMark:'target',planId:id('西洛可')});
assert.equal(denied.run('plannerData().savedAt'),null);
assert(denied.node('#planner-summary').innerHTML.includes('浏览器未允许保存'));
assert(!denied.node('#planner-summary').innerHTML.includes('已自动保存'));
assert.equal(denied.node('#planner-save-status').hidden,false);
denied.run(`plannerAction({id:'plan-backup',dataset:{},closest:()=>null})`);await new Promise(resolve=>setImmediate(resolve));
assert.equal(denied.run('plannerData().backupAt'),null);
assert(denied.node('#planner-summary').innerHTML.includes('备份尚未完成'));
assert(!denied.node('#planner-summary').innerHTML.includes('备份链接已是最新'));
const manualCode=denied.run('plannerManualBackup.code');
denied.click({planMark:'target',planId:id('莉利安')});
denied.run(`plannerAction({id:'plan-backup-confirm',dataset:{},closest:()=>null})`);
assert.equal(denied.run('plannerData().backupCode'),manualCode,'manual confirmation records the copied snapshot');
assert(!denied.node('#planner-summary').innerHTML.includes('备份链接已是最新'),'later edits cannot be called backed up');
faults.blockStorage=false;
denied.run(`plannerAction({id:'plan-save-retry',dataset:{},closest:()=>null})`);
assert.equal(denied.node('#planner-save-status').hidden,true);
assert.equal(JSON.parse(denied.store['fe-next.planner.v1']).marks.kai[id('西洛可')],'target');
const legacy=setup(JSON.stringify({marks:{kai:{[id('西洛可')]:'target'}},savedAt:'2026-09-30T12:00:00Z',backupAt:'2026-09-30T12:01:00Z'}));
assert(legacy.run('plannerBackupBlock()').includes('备份链接已是最新'),'old timestamp-only plans still work');
// Shopping list: checked sources and known prices only; unchecked items point to their guide pages.
const shop=setup(JSON.stringify({route:'kai',renown:{kai:10},marks:{kai:{'59':'target','19':'target','50':'target'}}}));
const sum=shop.run(`plannerSummary('kai')`);
assert(sum.includes('约 19,000G'),'圣水 8×500 + グルマオサ 3×5000');assert(sum.includes('取得：商店基础标价每个 500G'));
assert(sum.includes('凯伊篇可在海都アレクトー')&&sum.includes('https://gamewith.jp/fefw/577828'));
assert(sum.includes('不保证本线当前进度可到达或有足够库存'));
const weapons=setup(JSON.stringify({route:'kai',marks:{kai:{[id('洛蕾塔')]:'target',[id('努佐')]:'target'}}}));
assert(weapons.run(`plannerSummary('kai')`).includes('估算约 9,000G'),'town-qualified 3 iron swords + 3 iron bows at 1500G');
assert(shop.run(`plannerText('kai')`).includes('圣水 ×8（取得：商店基础标价每个 500G'));
assert(shop.run(`tradeSources(D.characters.find(c=>c.name==='歌利亚'))`).includes('物品去哪里找'));
const mu=shop.run(`tradeSources(D.characters.find(c=>c.name==='穆'))`);assert(mu.includes('取得方式见上方交涉说明')&&!mu.includes('本站尚未核对'),'a finding shown in the trade note is not called unchecked');
assert.equal(shop.run(`tradeSources(D.characters.find(c=>c.aliases.includes('法比奥')))`),'','no repeat of the trade note');
console.log('Planner: route lists, paralogue windows, totals, marks, persistence and matrix passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
