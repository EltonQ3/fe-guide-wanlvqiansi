const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
const ui={innerHTML:'',open:false,showModal(){this.open=true}};
const ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:()=>ui,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:()=>null}});
for(const f of ['dietrich.js','campaign.js','reference.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
function modal(route,name){const id=data.characters.find(c=>c.name===name).id;vm.runInContext(`currentView='route/${route}';showCharacter('${id}')`,ctx);return ui.innerHTML.replace(/<[^>]+>/g,'');}
assert(modal('dietrich','乌尔坦德').includes('发光拾取点'));
for(const r of ['kai','theodora','leda'])assert(!modal(r,'乌尔坦德').includes('发光拾取点'));
assert(modal('leda','法比奥').includes('清めの剣'));
assert(modal('leda','法比奥').includes('主动拾取'));
for(const r of ['kai','dietrich','theodora','leda']){
 const text=modal(r,'伊尼奥尼');assert(text.includes('普通射击不享有'));assert(text.includes('本线3000–6000G'));
}
const j=modal('leda','贾斯敏');assert(j.includes('不能装备武器')&&j.includes('专用票证与象坐骑'));
assert(modal('kai','贾斯敏').includes('专用战象兵考试票证'));
const leda=vm.runInContext("routePortal(D.story.find(s=>s.id==='leda'))",ctx);
assert(!leda.includes('本线第7章才出现'));assert(!leda.includes('第 7 章 · 5月出现'));
assert(leda.includes('按本线进度确认'));assert(!leda.includes('id="battles"'));
console.log('Oct7: conditional builds, stable IDs, corrected arrival and route-isolated gift pickup passed.');
