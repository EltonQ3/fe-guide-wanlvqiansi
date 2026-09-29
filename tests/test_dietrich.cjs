const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
const ui={innerHTML:'',open:false,showModal(){this.open=true}};
const context=vm.createContext({window:{FE_DATA:data},document:{querySelector:()=>ui,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:()=>null}});
vm.runInContext(fs.readFileSync(path.join(root,'web/dietrich.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],context);
const html=vm.runInContext('routePortal(D.story[1])',context);
const fame=[...html.matchAll(/data-recruit-fame="(\d+)"/g)].map(m=>Number(m[1]));
assert.equal(fame.length,39);assert.deepEqual(fame,[...fame].sort((a,b)=>a-b));
assert(!html.includes('这条线，为什么值得玩'));
const pilot=data.story[1].profile.pilot;
assert.equal(pilot.native.length,5);assert.equal(pilot.scouts.length,9);
const chars=Object.fromEntries(data.characters.map(c=>[c.name,c]));
for(const p of pilot.scouts){
 const row=chars[p.name].recruit['迪托利希线'];
 assert(row.includes(p.fame+'R')&&row.includes(p.support+'S'),p.name+' route mismatch');
 assert(!/[\u3040-\u30ff]/.test(p.path.join('')),p.name+' untranslated class');
 assert(p.sources.length&&p.train&&p.caution);
}
assert(pilot.scouts.find(p=>p.name==='基罗伊卡').arrival.includes('第 6 章'));
assert(pilot.scouts.find(p=>p.name==='歌利亚').condition.includes('巨人肉 ×3'));
vm.runInContext("currentView='route/dietrich';showCharacter('33')",context);
assert(ui.innerHTML.includes('支付 800G')&&ui.innerHTML.includes('奥利哈铁骑'));
assert(!/[\u3040-\u30ff]/.test(ui.innerHTML));
for(const name of ['blade-sense.webp','combat-art.webp'])assert(fs.statSync(path.join(root,'docs/assets/dietrich',name)).size>1000);
console.log('Dietrich: fame order, route-specific requirements, Chinese classes, modal and media checks passed.');
if(process.env.DI_BASELINE){
 const old=vm.createContext({window:{FE_DATA:data},document:{querySelectorAll:()=>[]},localStorage:{getItem:()=>null}});
 vm.runInContext(fs.readFileSync(process.env.DI_BASELINE,'utf8').split('function navigate()')[0],old);
 for(const i of [0,2,3])assert.equal(vm.runInContext(`routePortal(D.story[${i}])`,context),vm.runInContext(`routePortal(D.story[${i}])`,old));
 console.log('Other three route pages: rendered HTML unchanged.');
}
