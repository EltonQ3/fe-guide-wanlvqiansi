const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
const ui={innerHTML:'',open:false,showModal(){this.open=true}};
const ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:()=>ui,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:()=>null}});
for(const f of ['dietrich.js','campaign.js','reference.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
function modal(route,name){const id=data.characters.find(c=>c.name===name).id;vm.runInContext(`currentView='route/${route}';showCharacter('${id}')`,ctx);return ui.innerHTML;}
for(const r of ['kai','dietrich','theodora','leda']){
 const m=modal(r,'杰斯特');
 if(r==='dietrich')for(const t of ['セドー砦','屍獄のデュナンゾ','chucco.com/fefw-jester-scout/'])assert(m.includes(t));
 else for(const t of ['セドー砦','屍獄のデュナンゾ','chucco.com/fefw-jester-scout/'])assert(!m.includes(t));
 const b=modal(r,'班迪兹');assert(b.includes('不能回避'));assert(b.includes('不是每回合追加两次行动'));
}
console.log('Oct15: Dietrich-only Jester destination/citations and conditional chariot training passed.');
