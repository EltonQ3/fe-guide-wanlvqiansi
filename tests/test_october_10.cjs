const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
const ui={innerHTML:'',open:false,showModal(){this.open=true}};
const ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:()=>ui,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:()=>null}});
for(const f of ['dietrich.js','campaign.js','reference.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
function modal(route,name){const id=data.characters.find(c=>c.name===name).id;vm.runInContext(`currentView='route/${route}';showCharacter('${id}')`,ctx);return ui.innerHTML;}
for(const r of ['kai','dietrich','theodora','leda']){
 const n=modal(r,'哪吒').replace(/<[^>]+>/g,'');
 if(['kai','theodora'].includes(r))assert(n.includes('先触发个人技能')&&n.includes('按不触发计算'));
 else assert(n.includes('先手必胜')&&n.includes('50%')&&n.includes('不能计入保底击杀'));
 const b=modal(r,'贝特朗');assert(b.includes('第三部')&&b.includes('外传'));
 assert(!b.includes('3S /')&&!b.includes('名声Lv'));
}
for(const route of data.story.slice(0,4)){
 assert.equal(route.profile.pilot.publishBattles,false);
 const cards=route.profile.pilot.scouts.filter(c=>c.name==='哪吒');
 if(['kai','theodora'].includes(route.id)){
  assert.equal(cards.length,1);assert(cards[0].caution.includes('先触发个人技能'));
  assert.equal(cards[0].fame,6);
 }else assert.equal(cards.length,0);
}
console.log('Oct10: conditional Naja builds, later-part Bertrand availability, and unchanged route gates passed.');

for(const route of ['kai','dietrich','theodora','leda']){
 const html=vm.runInContext(`paralogueSection('${route}')`,ctx);
 for(const term of ['ドラグデン峠','ヤーマン村','fefw-secret-of-missing-carriage/'])assert.equal(html.includes(term),route==='kai');
}
console.log('Oct10: Kai-only Talimoon itinerary and source links stay out of other route calendars.');
