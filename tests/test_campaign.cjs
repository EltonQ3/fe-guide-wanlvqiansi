const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
const ui={innerHTML:'',open:false,showModal(){this.open=true}};
const ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:()=>ui,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:()=>null}});
for(const f of ['dietrich.js','campaign.js','reference.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
for(const id of ['kai','theodora','leda']){
 const s=data.story.find(x=>x.id===id),p=s.profile.pilot,route=s.title.replace('路线','线');
 const html=vm.runInContext(`routePortal(D.story.find(s=>s.id==='${id}'))`,ctx);
 assert(!html.includes('这条线，为什么值得玩')&&!html.includes('id="battles"')&&!html.includes('${'));
 const expected=data.characters.filter(c=>c.recruit[route]&&c.recruit[route]!=='—'&&!p.native.some(n=>n.name===c.name)).map(c=>c.id).sort();
 const people=[...html.matchAll(/data-pyramid-character="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual([...people].sort(),expected);assert.equal(new Set(people).size,people.length);
 const levels=[...new Set(data.characters.filter(c=>expected.includes(c.id)).map(c=>Number(c.recruit[route].match(/(\d+)R/)[1])))].sort((a,b)=>a-b);
 assert.deepEqual([...html.matchAll(/data-pyramid-level="(\d+)"/g)].map(m=>+m[1]),levels);
 assert(!html.includes('无新增'));
 for(const n of [...p.native,...p.scouts]){
  assert(n.path.every(x=>!/[\u3040-\u30ff]/.test(x)),`${id}: ${n.name} untranslated class`);
  assert(!/[\u3040-\u30ff]/.test(n.late),`${id}: ${n.name} untranslated late plan`);
  if(n.fame){const c=data.characters.find(c=>c.name===n.name);assert(c.recruit[route].includes(n.fame+'R')&&c.recruit[route].includes(n.support+'S'));}
 }
 for(const match of html.matchAll(/src="(assets\/campaign\/[^\"]+)"/g))assert(fs.statSync(path.join(root,'docs',match[1])).size>1000);
 assert(s.battles.length>0,'Hidden source drafts are preserved');
 console.log(id+': '+people.length+' unique recruits, native/scout separation, conditions and media passed.');
}
function modal(route,name){const id=data.characters.find(c=>c.name===name).id;vm.runInContext(`currentView='route/${route}';showCharacter('${id}')`,ctx);return ui.innerHTML;}
assert(modal('theodora','努蒂奴').includes('铁斧 ×3'));
assert(modal('leda','伊欧').includes('1500G'));
assert(!modal('leda','奥林匹亚').includes('三个请求'));
assert(!modal('theodora','莱桑达').includes('铁枪需要 5 把'));
assert(modal('kai','杨界').includes('满月'));
const war=vm.runInContext("storyDetail('war')",ctx),salvation=vm.runInContext("storyDetail('salvation')",ctx);
for(const phrase of ['war-portraits','军行动，每章三选一','补到5个','把装备带在身上','不能逛商店'])assert(war.includes(phrase));
assert(salvation.includes('salvation-opening.webp')&&salvation.includes('不等于已经完成永久入队'));
assert.equal(data.story.find(s=>s.id==='dietrich').profile.pilot.version,2,'Dietrich content retained');
console.log('Route-specific modals, later-part introductions and Dietrich preservation passed.');
// New route-scoped details must never leak into another protagonist's dossier.
assert(modal('dietrich','奥林匹亚').includes('碧晶洞穴'));
assert(!modal('kai','奥林匹亚').includes('碧晶洞穴'));
assert(!modal('leda','奥林匹亚').includes('碧晶洞穴'));
assert(modal('theodora','努佐').includes('铁弓 ×3'));
assert(modal('dietrich','努佐').includes('交涉提示'));
const newEvidence=vm.runInContext("evidence([{url:'https://example.com/new',label:'New',checkedAt:'2026-10-01',evidenceLocation:'section \"one\"'}])",ctx);
assert(!newEvidence.includes('2026.10.01')&&!newEvidence.includes('2026.09.29'));
assert(newEvidence.includes('未作游戏内实测'));
assert(newEvidence.includes('section &quot;one&quot;'));
const oldEvidence=vm.runInContext("evidence([{url:'https://example.com/old',label:'Old'}])",ctx);
assert(!oldEvidence.includes('2026.09.29'));
const mixedEvidence=vm.runInContext("evidence([{url:'https://example.com/old',label:'Old'},{url:'https://example.com/new',label:'New',checkedAt:'2026-10-01'}])",ctx);
assert(!mixedEvidence.includes('2026.09.29')&&!mixedEvidence.includes('2026.10.01'));
console.log('Oct1 route-scoped negotiation, player-facing evidence limits, and hidden editorial dates passed.');

// Oct5: disputed Leda arrival must not survive in a hard-coded pyramid badge.
const ledaPyramid=vm.runInContext("routePortal(D.story.find(s=>s.id==='leda'))",ctx);
assert(!ledaPyramid.includes('第 7 章出现'));
assert(ledaPyramid.includes('按本线进度确认'));
const dietrichPyramidHtml=vm.runInContext("routePortal(D.story.find(s=>s.id==='dietrich'))",ctx);
assert(dietrichPyramidHtml.includes('第 6 章出现'));
const visibleModal=(route,name)=>modal(route,name).replace(/<[^>]*>/g,'');
assert(visibleModal('theodora','西提司').includes('オーガス山道'));
assert(!visibleModal('leda','西提司').includes('オーガス山道'));
assert(visibleModal('kai','鲁鲁迪娅').includes('東アマルテア駅→フェロニア駅'));
assert(!visibleModal('leda','鲁鲁迪娅').includes('東アマルテア駅→フェロニア駅'));
console.log('Oct5: corrected Leda arrival badge and route-isolated recruitment errands passed.');

// Oct6: Kai's mine-to-lake itinerary must not leak into other route dossiers.
assert(visibleModal('kai','妮涅').includes('ワルハラ鉱山'));
for(const r of ['dietrich','theodora','leda']) assert(!visibleModal(r,'妮涅').includes('ワルハラ鉱山'));
for(const r of ['kai','dietrich','theodora','leda']) assert(visibleModal(r,'妮涅').includes('可能需要多次探索'));
console.log('Oct6: route-isolated lake access and shared rare-fish caution passed.');
