const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
const ui={innerHTML:'',open:false,showModal(){this.open=true}};
const ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:()=>ui,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:()=>null}});
for(const f of ['dietrich.js','campaign.js','reference.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
function modal(route,name){const id=data.characters.find(c=>c.name===name).id;vm.runInContext(`currentView='route/${route}';showCharacter('${id}')`,ctx);return ui.innerHTML;}
const kai=modal('kai','奥林匹亚'),di=modal('dietrich','奥林匹亚');
for(const t of ['クリュテイオス平原','ワルハラ鉱山','地面发光点'])assert(kai.includes(t));
for(const t of ['碧晶洞穴','lushgreengame.com'])assert(!kai.includes(t));
assert(di.includes('碧晶洞穴'));assert(!di.includes('ワルハラ鉱山'));assert(!di.includes('chucco.com/fefw-olympia-scout/'));
for(const r of ['theodora','leda'])assert(!modal(r,'奥林匹亚').includes('ワルハラ鉱山'));
for(const r of ['kai','dietrich','theodora','leda']){
 const m=modal(r,'但丁');assert(m.includes('个人技能触发时')&&m.includes('不能用白魔')&&m.includes('不能用黑魔'));
}
for(const r of ['kai','dietrich','theodora']){
 const m=modal(r,'乌修拉').replace(/<[^>]+>/g,'');assert(m.includes('全部回答')&&m.includes('不会自动产生追击'));assert(!m.includes('四问'));
}
assert(!modal('leda','乌修拉').includes('交涉参考'));
console.log('Oct9: conditional support builds, conservative dialogue condition, and route-isolated Olimpia text/citations passed.');
