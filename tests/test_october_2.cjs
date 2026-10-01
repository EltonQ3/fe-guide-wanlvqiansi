// Exercise the actual renderers: new facts must not leak across route dossiers.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'docs/data.js'),'utf8').replace(/^window.FE_DATA = /,'').replace(/;\s*$/,''));
const ui={innerHTML:'',open:false,showModal(){this.open=true}};
const ctx=vm.createContext({window:{FE_DATA:data},document:{querySelector:()=>ui,querySelectorAll:()=>[],activeElement:null},localStorage:{getItem:()=>null}});
for(const f of ['dietrich.js','campaign.js','reference.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'web/app.js'),'utf8').split('function navigate()')[0],ctx);
function modal(route,name){const id=data.characters.find(c=>c.name===name).id;vm.runInContext(`currentView='route/${route}';showCharacter('${id}')`,ctx);return ui.innerHTML.replace(/<[^>]+>/g, "");}
assert(modal('dietrich','穆').includes('裏山道'));
assert(!modal('kai','穆').includes('裏山道'));
assert(!modal('theodora','穆').includes('裏山道'));
assert(modal('kai','哪吒').includes('已核对的凯伊线购买画面'));
assert(modal('kai','哪吒').includes('リガネット×10'));
assert(modal('kai','哪吒').includes('高級肉箱'));
for(const route of ['dietrich','theodora','leda'])assert(!modal(route,'哪吒').includes('已核对的凯伊线购买画面'));
const loretta=modal('dietrich','洛蕾塔');
assert(loretta.includes('编辑培养建议')&&loretta.includes('至少一半')&&loretta.includes('武器屋'));
assert(!loretta.includes('第三区分')&&!loretta.includes('全难度'));
for(const id of ['kai','dietrich','theodora','leda']){
 const html=vm.runInContext(`routePortal(D.story.find(s=>s.id==='${id}'))`,ctx);
 assert(!html.includes('id="battles"'));
 if(['theodora','leda'].includes(id))assert(html.includes('守住后方蓝色目标区域10回合'));
 if(id!=='kai')assert(html.includes('破坏香炉'));
 if(id!=='leda')assert(html.includes('或击败全部敌人'));
}
console.log('Oct2: route-isolated item guidance, conditional Loretta build, three paralogue renderers, and hidden battle drafts passed.');
