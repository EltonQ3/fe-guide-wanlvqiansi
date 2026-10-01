'use strict';
// Recruit planner: Part I recruit table, compared across the four routes. Marks live in this browser; a backup link carries them elsewhere.
const plannerKey='fe-next.planner.v1';
const needLabels={gold:'金币',item:'物品',quest:'任务',paralogue:'外传',option:'交涉选项',story:'剧情'};
const plannerFilters=[['all','本线可挖'],['ready','名声已达标'],['marked','我的标记'],['lowest','本线门槛最低']];
let plannerStore,plannerPending=null,plannerRestoreBad=false,plannerPersistAsked=false;
let plannerSaveFailed=false,plannerManualBackup=null,plannerCopying=false;
function plannerClean(raw){
  const ok=x=>x&&typeof x==='object'&&!Array.isArray(x),s=ok(raw)?raw:{},time=t=>typeof t==='string'&&!Number.isNaN(Date.parse(t))?t:null;
  const st={route:routeIds.includes(s.route)?s.route:'kai',filter:plannerFilters.some(f=>f[0]===s.filter)?s.filter:'all',renown:{},marks:{},savedAt:time(s.savedAt),backupAt:time(s.backupAt),backupCode:typeof s.backupCode==='string'&&/^FW1[A-Za-z0-9_-]+$/.test(s.backupCode)?s.backupCode:null};
  for(const id of routeIds){
    const r=Number(ok(s.renown)?s.renown[id]:NaN);st.renown[id]=Number.isInteger(r)&&r>=1&&r<=10?r:1;
    const m=ok(s.marks)&&ok(s.marks[id])?s.marks[id]:{};st.marks[id]=Object.fromEntries(Object.entries(m).filter(([,v])=>v==='target'||v==='done'));
  }
  return st;
}
function plannerData(){return plannerStore??=plannerClean(load(plannerKey,{}));}
// touch=false for view changes (route tab, filter), so "changed since backup" only reflects the plan itself.
function plannerSave(touch=true){
  const st=plannerData(),savedAt=touch?new Date().toISOString():st.savedAt;
  const kept=save(plannerKey,{...st,savedAt});
  plannerSaveFailed=!kept;
  if(kept)st.savedAt=savedAt;
  return kept;
}
function plannerHasData(){const st=plannerData();return routeIds.some(id=>Object.keys(st.marks[id]).length||st.renown[id]>1);}
function plannerMobile(){return Boolean(window.matchMedia?.('(max-width: 800px)').matches);}
function plannerRefresh(){if($('#planner-summary'))renderPlanner();}
function plannerFinishBackup(code){
  const st=plannerData();st.backupAt=new Date().toISOString();st.backupCode=code;
  plannerManualBackup=null;plannerSave(false);plannerRefresh();
  toast('备份链接已复制。请发给自己或存进收藏，换设备打开即可导入。');
}
function plannerCount(routeId,value,st=plannerData()){return Object.entries(st.marks[routeId]).filter(([id,v])=>v===value&&D.characters.some(c=>c.id===id)).length;}
// Backup code: the whole plan travels inside the link, so it works on another device, browser or domain without an account.
function plannerCode(st=plannerData()){
  const m={};for(const id of routeIds){const e=Object.entries(st.marks[id]);if(e.length||st.renown[id]>1)m[id]=[st.renown[id],e.filter(([,v])=>v==='target').map(([k])=>k),e.filter(([,v])=>v==='done').map(([k])=>k)];}
  let bin='';new TextEncoder().encode(JSON.stringify({v:1,m})).forEach(b=>bin+=String.fromCharCode(b));
  return 'FW1'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function plannerDecode(text){
  const code=String(text||'').match(/FW1([A-Za-z0-9_-]+)/);if(!code)return null;
  try{
    const bin=atob(code[1].replace(/-/g,'+').replace(/_/g,'/')),data=JSON.parse(new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))));
    if(data?.v!==1||!data.m||typeof data.m!=='object')return null;
    const raw={renown:{},marks:{}};
    for(const id of routeIds){const r=data.m[id];if(!Array.isArray(r))continue;raw.renown[id]=r[0];raw.marks[id]={};for(const k of r[1]||[])raw.marks[id][String(k)]='target';for(const k of r[2]||[])raw.marks[id][String(k)]='done';}
    return plannerClean(raw);
  }catch{return null;}
}
function plannerMerge(into,from){for(const id of routeIds){into.renown[id]=Math.max(into.renown[id],from.renown[id]);for(const [k,v] of Object.entries(from.marks[id]))if(v==='done'||!into.marks[id][k])into.marks[id][k]=v;}}
function plannerRestoreBanner(){
  if(plannerRestoreBad)return '<div class="plan-restore is-bad"><p><strong>这条备份链接无法识别。</strong>可能复制时被截断了，请回到原设备重新复制完整链接。</p><div class="plan-buttons"><button class="button secondary" data-plan-restore="dismiss">知道了</button></div></div>';
  if(!plannerPending)return '';
  const rows=routeIds.map(id=>({id,t:plannerCount(id,'target',plannerPending),d:plannerCount(id,'done',plannerPending),r:plannerPending.renown[id]})).filter(r=>r.t||r.d||r.r>1),local=plannerHasData();
  return `<div class="plan-restore" role="region" aria-label="导入备份"><div><span class="eyebrow">BACKUP FOUND</span><h2>这条链接带着一份招募计划</h2><p>${rows.map(r=>`${esc(plannerRouteTitle(r.id))}：计划 ${r.t} · 已招 ${r.d} · 名声 ${r.r}`).join('<br>')||'这份备份没有标记。'}</p></div><div class="plan-buttons">${local?'<button class="button" data-plan-restore="merge">合并到本机</button><button class="button secondary" data-plan-restore="replace">用备份覆盖本机</button>':'<button class="button" data-plan-restore="replace">导入这份计划</button>'}<button class="button secondary" data-plan-restore="dismiss">不导入</button></div>${local?'<p class="plan-fine">合并：两边的标记都保留，同一人以「已招募」为准，名声取较高的一边。覆盖：本机现有标记换成备份内容。</p>':''}</div>`;
}
function plannerBackupBlock(){
  const st=plannerData(),has=plannerHasData(),when=t=>new Date(t).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const latest=st.backupCode?st.backupCode===plannerCode():st.backupAt&&!plannerSaveFailed&&Date.parse(st.savedAt)<=Date.parse(st.backupAt);
  const storage=plannerSaveFailed?'<strong>浏览器未允许保存；这份计划只在当前页面有效，请立即备份。</strong>':has?`已自动保存在这台设备的浏览器${st.savedAt?`（${when(st.savedAt)} 更新）`:''}。`:'标记会保存在这台设备的浏览器；可用备份链接带到其他设备。';
  const backup=plannerCopying?'正在复制备份链接…':plannerManualBackup?'<strong>等待手动复制并保存链接，备份尚未完成。</strong>':!st.backupAt?has?'<strong>还没有备份。</strong>换设备或清理网站数据前，请保存备份链接。':'':latest?`备份链接已是最新（${when(st.backupAt)}）。`:'上次备份之后又有改动，建议重新复制备份链接。';
  const open=plannerSaveFailed||plannerManualBackup||($('#plan-backup-details')?.open??!plannerMobile());
  const manual=plannerManualBackup?`<div class="plan-manual-backup"><p>请手动复制下面的链接并保存，再确认完成。</p><input id="plan-backup-out" readonly value="${esc(plannerManualBackup.link)}" aria-label="备份链接"><button class="button secondary" id="plan-backup-confirm">已复制并保存链接</button></div>`:'';
  return `<details class="plan-backup" id="plan-backup-details" ${open?'open':''}><summary>备份与换设备</summary><p>${storage} ${backup} <span id="plan-persist"></span></p>${has?`<button class="button secondary" id="plan-backup" ${plannerCopying?'disabled':''}>复制备份链接</button>`:''}${manual}<details class="plan-import"><summary>从备份链接或备份码导入</summary><div><input id="plan-import-code" placeholder="粘贴备份链接，或以 FW1 开头的备份码" aria-label="备份链接或备份码"><button class="button secondary" id="plan-import">导入</button></div></details></details>`;
}
function plannerRouteName(id){return routeNames[routeIds.indexOf(id)];}
function plannerRouteTitle(id){return plannerRouteName(id).replace('线','篇');}
function plannerScouts(routeId){return D.characters.filter(c=>c.plan?.[routeId]?.kind==='scout').sort((a,b)=>a.plan[routeId].renown-b.plan[routeId].renown||a.plan[routeId].support-b.plan[routeId].support||Number(a.id)-Number(b.id));}
function plannerOwn(routeId){return D.characters.filter(c=>['lord','auto','tutorial'].includes(c.plan?.[routeId]?.kind));}
function plannerNote(routeId,name){const p=D.story.find(s=>s.id===routeId)?.profile?.pilot;return p&&[...p.native,...p.scouts].find(n=>n.name===name);}
function plannerWindows(n,routeId){const p=D.paralogues.find(p=>p.id===n.paralogue);return (p?.routes[routeId]||[]).map(w=>`第${w.chapter}章 ${w.start===w.end?w.start+'当天':w.start+'—'+w.end}`).join('；');}
function plannerNeed(n,routeId){
  const windows=n.type==='paralogue'?plannerWindows(n,routeId):'';
  const body=`<b>${needLabels[n.type]}</b>${esc(n.text)}${windows?` · ${esc(windows)}`:n.type==='paralogue'?' · 本线窗口未收录':''}`;
  return n.type==='paralogue'?`<a class="need need-${n.type}" href="#route/${routeId}/paralogues">${body} →</a>`:`<span class="need need-${n.type}">${body}</span>`;
}
function plannerLowest(c,routeId){
  const scouts=routeIds.filter(id=>c.plan[id].kind==='scout');
  if(scouts.length===1)return '<span class="plan-best">仅本线可挖</span>';
  if(c.plan[routeId].lowest)return `<span class="plan-best">四线名声门槛最低</span>`;
  const best=scouts.filter(id=>c.plan[id].lowest);
  return `<span class="plan-elsewhere">${best.map(id=>`${esc(plannerRouteName(id))} ${c.plan[id].renown}R`).join(' / ')} 门槛更低</span>`;
}
function plannerRow(c,routeId){
  const p=c.plan[routeId],mark=plannerData().marks[routeId][c.id],gap=p.renown-plannerData().renown[routeId],note=plannerNote(routeId,c.name);
  const neg=c.negotiations?.routes.includes(plannerRouteName(routeId)),gift=c.gifts['推荐礼物'];
  return `<article class="plan-row ${mark?'is-'+mark:''} ${gap>0?'is-locked':''}" data-plan-row="${esc(c.id)}"><button class="plan-person" data-character="${esc(c.id)}">${c.avatar?`<img src="${esc(c.avatar)}" alt="" loading="lazy">`:`<span class="plan-initial" aria-hidden="true">${esc(c.name[0])}</span>`}<span><strong>${esc(c.name)}</strong><small>${esc(c.faction.split(' / ')[0].replace(/（.*）/,''))}</small></span></button><div class="plan-detail"><p class="plan-gate"><span class="plan-sr"><b>${p.support}</b>S<i>／</i><b>${p.renown}</b>R</span>${gap>0?`<span class="plan-gap">名声还差 ${gap} 级</span>`:'<span class="plan-ready">名声已达标</span>'}${plannerLowest(c,routeId)}</p>${p.needs.length?`<div class="plan-needs">${p.needs.map(n=>plannerNeed(n,routeId)).join('')}</div>`:'<p class="plan-plain">表内无附加条件；达到门槛后对话交涉。</p>'}<p class="plan-meta">${note?.arrival?`<span>${esc(note.arrival)}</span>`:''}${note?.pyramid?`<span>${esc(note.pyramid.label)} · ${esc(note.pyramid.role)}</span>`:''}${gift&&gift!=='—'?`<span>送礼：${esc(gift)}</span>`:''}${neg?'<span class="plan-checked">交涉明细已补</span>':''}</p></div><div class="plan-actions" role="group" aria-label="${esc(c.name)}的标记">${[['target','计划'],['done','已招募']].map(([v,label])=>`<button data-plan-mark="${v}" data-plan-id="${esc(c.id)}" aria-pressed="${mark===v}">${label}</button>`).join('')}</div></article>`;
}
function plannerList(routeId){
  const st=plannerData(),mine=st.marks[routeId],have=st.renown[routeId];
  const rows=plannerScouts(routeId).filter(c=>st.filter==='ready'?c.plan[routeId].renown<=have:st.filter==='marked'?mine[c.id]:st.filter==='lowest'?c.plan[routeId].lowest:true);
  if(!rows.length)return `<p class="plan-empty">${st.filter==='marked'?'本线还没有标记。点人物右侧的「计划」，就会加入右侧清单。':st.filter==='ready'?'当前名声还没有达标的人物。调高名声，或切到「本线可挖」查看全部。':'没有符合条件的人物。'}</p>`;
  const tiers=[...new Set(rows.map(c=>c.plan[routeId].renown))];
  return tiers.map(r=>{const group=rows.filter(c=>c.plan[routeId].renown===r);return `<section class="plan-tier"><h3><span>名声 ${r}</span><small>${group.length} 位${r>have?` · 还差 ${r-have} 级`:' · 已达标'}</small></h3>${group.map(c=>plannerRow(c,routeId)).join('')}</section>`;}).join('');
}
function plannerTotals(routeId){
  const ids=Object.entries(plannerData().marks[routeId]).filter(([,v])=>v==='target').map(([id])=>id);
  const people=D.characters.filter(c=>ids.includes(c.id)&&c.plan?.[routeId]?.kind==='scout');
  const needs=people.flatMap(c=>c.plan[routeId].needs.map(n=>({...n,who:c.name})));
  const items={};for(const n of needs.filter(n=>n.type==='item')){const x=items[n.item]??={qty:0,unknown:false,who:[]};if(n.qty)x.qty+=n.qty;else x.unknown=true;const rest=n.text.replace(n.item,'').replace(/\s*×\s*\d+/,'').trim().replace(/^（|）$/g,'');x.who.push(n.who+(rest?'（'+rest+'）':''));}
  return {people,needs,items,gold:needs.reduce((sum,n)=>sum+(n.gold||0),0),renown:Math.max(0,...people.map(c=>c.plan[routeId].renown)),support:Math.max(0,...people.map(c=>c.plan[routeId].support))};
}
// Where to get a trade item: checked findings first; otherwise the item's own guide pages, marked unchecked.
function plannerSource(name,shown=''){
  const t=D.tradeItems?.[name];if(!t)return '';
  const known=t.verified.filter(v=>!shown.includes(v.text)).map(v=>v.text).join(' '),pages=t.pages.map(p=>`<a href="${href(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.label.split(' · ')[0])} ↗</a>`).join(' ');
  const found=known?'取得：'+esc(known):t.verified.length?'取得方式见上方交涉说明':'取得方式本站尚未核对';
  return `<small class="plan-source">${found}${pages?`<span>${t.verified.length?'详见':'可先查'} ${pages}</span>`:''}</small>`;
}
// Character dossier: the items this person asks for on any route, minus findings the trade notes already show.
function tradeSources(c){
  const shown=c.negotiations?.details||'',names=[...new Set(Object.values(c.plan||{}).flatMap(p=>(p.needs||[]).filter(n=>n.type==='item').map(n=>n.item)))].filter(n=>{const t=D.tradeItems?.[n];return t&&(t.pages.length||t.verified.some(v=>!shown.includes(v.text)));});
  return names.length?`<div class="trade-sources"><h4>物品去哪里找</h4>${names.map(n=>`<p><strong>${esc(n)}</strong>${plannerSource(n,shown)}</p>`).join('')}</div>`:'';
}
function plannerItemCost(items){return Object.entries(items).reduce((sum,[name,x])=>sum+(x.qty&&!x.unknown?(D.tradeItems?.[name]?.verified.find(v=>v.unitPrice)?.unitPrice||0)*x.qty:0),0);}
function plannerSummary(routeId){
  const t=plannerTotals(routeId),done=plannerCount(routeId,'done'),list=(type,title)=>{const rows=t.needs.filter(n=>n.type===type);return rows.length?`<h3>${title}</h3><ul>${rows.map(n=>`<li><strong>${esc(n.who)}</strong>${esc(n.text)}${n.type==='paralogue'?`<small>${esc(plannerWindows(n,routeId)||'本线窗口未收录')}</small>`:''}</li>`).join('')}</ul>`:'';};
  return `<div class="eyebrow">SHOPPING LIST</div><h2>${esc(plannerRouteTitle(routeId))} · 计划 ${t.people.length} 人</h2><p class="plan-count">已招募 ${done} 人 · 当前名声 ${plannerData().renown[routeId]}</p>${t.people.length?`<dl class="plan-stats"><div><dt>最高名声</dt><dd>${t.renown}</dd></div><div><dt>支援最高</dt><dd>${t.support}S</dd></div><div><dt>金币至少</dt><dd>${t.gold.toLocaleString('en-US')}G</dd></div></dl>${Object.keys(t.items).length?`<h3>物品</h3><ul>${Object.entries(t.items).map(([name,x])=>`<li><strong>${esc(name)}${x.qty?' ×'+x.qty:''}${x.unknown?(x.qty?' ＋待确认':' · 数量待确认'):''}</strong>${esc(x.who.join('、'))}${plannerSource(name)}</li>`).join('')}</ul>${plannerItemCost(t.items)?`<p class="plan-fine">按下方注明城镇的已核对物品标价估算约 ${plannerItemCost(t.items).toLocaleString('en-US')}G（不保证本线当前进度可到达或有足够库存；未含折扣及标价待核对的物品）。</p>`:''}${D.shopTips?.length?`<ul class="plan-tips">${D.shopTips.map(x=>`<li>${esc(x.text)} <a href="${esc(x.ref)}">原文 →</a></li>`).join('')}</ul>`:''}`:''}${list('quest','先完成的任务')}${list('paralogue','需要先打的外传')}${list('option','交涉时这样选')}${list('story','剧情前提')}<p class="plan-fine">金币按表内最低花费相加：希蒙掷错需再付，札可捏按砍到 10G 计；商店折扣与物品买价未计入（物品标价另列在物品清单下）。支援要靠送礼、用餐提升，表中 S 是与本线主角的支援等级。</p><div class="plan-buttons"><button class="button" id="plan-copy">复制清单</button><button class="button secondary" id="plan-clear">清空本线计划</button></div>`:`<p class="plan-fine">点人物右侧的「计划」，这里会汇总要准备的金币、物品、任务和外传。「已招募」的人不再计入清单。</p>`}${plannerBackupBlock()}`;
}
function plannerText(routeId){
  const t=plannerTotals(routeId);
  return [`【${plannerRouteTitle(routeId)} · 招募计划】`,...t.people.map(c=>{const p=c.plan[routeId];return `${c.name} ${p.support}S/${p.renown}R${p.needs.length?'：'+p.needs.map(n=>n.text+(n.type==='paralogue'&&plannerWindows(n,routeId)?`（${plannerWindows(n,routeId)}）`:'')).join('；'):''}`;}),`金币至少 ${t.gold}G`,...Object.entries(t.items).map(([name,x])=>`物品 ${name}${x.qty?' ×'+x.qty:''}${x.unknown?' 数量待确认':''}${D.tradeItems?.[name]?.verified.length?'（取得：'+D.tradeItems[name].verified.map(v=>v.text).join(' ')+'）':''}`),'— 万缕千丝 · 战术手帖 招募规划'].join('\n');
}
function plannerMatrix(onlyMarked){
  const marks=plannerData().marks,rows=D.characters.filter(c=>c.plan&&routeIds.some(id=>c.plan[id].kind==='scout')).filter(c=>!onlyMarked||routeIds.some(id=>marks[id][c.id]));
  const cell=(c,id)=>{const p=c.plan[id],m=marks[id][c.id],tag=m?`<em class="mark-${m}">${m==='done'?'✓':'◎'}</em>`:'';if(p.kind==='scout')return `<td class="${p.lowest?'is-lowest':''}"><b>${p.renown}R</b>${tag}<small>${p.support}S${p.needs.length?' · '+[...new Set(p.needs.map(n=>needLabels[n.type][0]))].join(''):''}</small></td>`;return `<td class="is-own"><small>${{lord:'主角',auto:p.chapter?`第${p.chapter}章加入`:'自带',tutorial:'教学加入',none:'—'}[p.kind]}</small>${tag}</td>`;};
  return rows.length?`<div class="table-scroll plan-matrix" role="region" aria-label="四线招募门槛对照表，可横向滚动" tabindex="0"><table><thead><tr><th scope="col">角色</th>${routeIds.map(id=>`<th scope="col"><button data-planner-route="${id}">${esc(plannerRouteName(id).replace('线',''))}</button></th>`).join('')}</tr></thead><tbody>${rows.map(c=>{const count=routeIds.filter(id=>marks[id][c.id]==='done').length;return `<tr><th scope="row"><button data-character="${esc(c.id)}">${esc(c.name)}</button>${count>1?`<span class="plan-dup">${count} 线</span>`:''}</th>${routeIds.map(id=>cell(c,id)).join('')}</tr>`;}).join('')}</tbody></table></div>`:'<p class="plan-empty">还没有标记任何人物。</p>';
}
function plannerPage(routeId,restore=null){
  const st=plannerData();if(routeIds.includes(routeId))st.route=routeId;
  plannerPending=restore?plannerDecode(restore):null;plannerRestoreBad=Boolean(restore)&&!plannerPending;
  return `<div class="container page planner-page">${heading('RECRUIT PLANNER','挖谁、在哪条线挖、要备什么。','对照四线门槛，标记同伴后汇总物品、金币和任务。计划存在本机，换设备前请备份。')}<div id="planner-restore"></div><div class="planner-routes" role="group" aria-label="选择第一部路线" id="planner-routes"></div><div id="planner-save-status" class="plan-save-status" role="status" hidden></div><div id="planner-mobile-summary" class="planner-mobile-summary"></div><div class="planner-layout"><div class="planner-main"><div class="planner-controls"><div class="renown-stepper"><span id="renown-label">本线当前名声</span><button data-renown="-1" aria-label="名声减一">−</button><output id="planner-renown" aria-labelledby="renown-label" aria-live="polite"></output><button data-renown="1" aria-label="名声加一">＋</button></div><div class="planner-filters" role="group" aria-label="筛选人物" id="planner-filters"></div></div><details class="planner-own" id="planner-own"></details><div id="planner-list"></div></div><aside class="planner-summary" id="planner-summary" aria-label="本线招募清单"></aside></div><section class="planner-compare"><div class="section-heading"><div><div class="eyebrow">FOUR ROUTES SIDE BY SIDE</div><h2>同一个人，在哪条线挖更省力？</h2></div><label class="plan-toggle"><input type="checkbox" id="planner-only-marked"> 只看我标记过的</label></div><p class="notice">绿色是四线里名声门槛最低的路线。小字为支援等级与附加条件：金＝金币、物＝物品、任＝任务、外＝外传、交＝交涉选项、剧＝剧情前提。◎ 计划，✓ 已招募。门槛最低只说明条件最宽，不代表最早出现；出场章节见各人物篇。第一部各线的等级和道具不互通，同一人物在多条线招到，第三部可以<a href="#guide/g5/s5-5">合并因果</a>，分开培养不同方向更划算。</p><div id="planner-matrix"></div></section><p class="notice">条件取自本站四路线招募表，与角色档案同源；标为原手册的条目尚未逐项实测，以游戏内交涉提示为准。<a href="#guide/g5/s5-3">查看招募原文 →</a></p></div>`;
}
function renderPlanner(){
  const st=plannerData(),id=st.route,own=plannerOwn(id),scouts=plannerScouts(id);
  $('#planner-routes').innerHTML=routeIds.map((r,i)=>{const hero=D.characters.find(c=>c.plan?.[r]?.kind==='lord');return `<button aria-pressed="${r===id}" data-planner-route="${r}">${hero?.avatar?`<img src="${esc(hero.avatar)}" alt="">`:''}<span><strong>${esc(routeNames[i].replace('线','篇'))}</strong><small>计划 ${plannerCount(r,'target')} · 已招 ${plannerCount(r,'done')}</small></span></button>`;}).join('');
  $('#planner-renown').textContent='Lv. '+st.renown[id];
  $('#planner-filters').innerHTML=plannerFilters.map(([f,label])=>{const n=scouts.filter(c=>f==='ready'?c.plan[id].renown<=st.renown[id]:f==='marked'?st.marks[id][c.id]:f==='lowest'?c.plan[id].lowest:true).length;return `<button data-plan-filter="${f}" aria-pressed="${st.filter===f}">${label}<span>${n}</span></button>`;}).join('');
  const ownBox=$('#planner-own');if(ownBox.dataset?.ready!==id){ownBox.open=!plannerMobile();if(ownBox.dataset)ownBox.dataset.ready=id;}
  ownBox.innerHTML=`<summary>本线自带 · ${own.length} 人</summary><div class="planner-own-people">${own.map(c=>`<button data-character="${esc(c.id)}" title="${esc(c.recruit[plannerRouteName(id)])}">${c.avatar?`<img src="${esc(c.avatar)}" alt="">`:''}<span>${esc(c.name)}<small>${esc(c.recruit[plannerRouteName(id)].replace('本路线主角','主角'))}</small></span></button>`).join('')}</div>`;
  $('#planner-list').innerHTML=plannerList(id);
  $('#planner-summary').innerHTML=plannerSummary(id);
  $('#planner-matrix').innerHTML=plannerMatrix($('#planner-only-marked')?.checked);
  $('#planner-restore').innerHTML=plannerRestoreBanner();
  const status=$('#planner-save-status');status.hidden=!plannerSaveFailed;status.innerHTML=plannerSaveFailed?'<strong>浏览器未允许保存；计划只在当前页面有效。</strong><button class="text-link" id="plan-save-retry">重试保存</button><button class="text-link" data-plan-backup="1">立即备份</button>':'';
  $('#planner-mobile-summary').innerHTML=`<button data-scroll="planner-summary">计划 ${plannerCount(id,'target')} · 已招 ${plannerCount(id,'done')}<span>查看清单 ↓</span></button>${plannerHasData()?'<button data-plan-backup="1">备份</button>':''}`;
  globalThis.navigator?.storage?.persisted?.().then(kept=>{const note=$('#plan-persist');if(note&&kept)note.textContent='浏览器已同意长期保存本站数据。';}).catch(()=>{});
}
function plannerAction(el){
  const st=plannerData();
  if(el.dataset.plannerRoute){st.route=el.dataset.plannerRoute;history.replaceState(null,'','#planner/'+st.route);plannerSave(false);renderPlanner();if(el.closest('.plan-matrix'))$('#planner-routes').scrollIntoView({behavior:'smooth'});return true;}
  if(el.dataset.renown){st.renown[st.route]=Math.min(10,Math.max(1,st.renown[st.route]+Number(el.dataset.renown)));plannerSave();renderPlanner();return true;}
  if(el.dataset.planFilter){st.filter=el.dataset.planFilter;plannerSave(false);renderPlanner();return true;}
  if(el.dataset.planMark){if(!plannerPersistAsked){plannerPersistAsked=true;globalThis.navigator?.storage?.persist?.().catch(()=>{});}const marks=st.marks[st.route],id=el.dataset.planId;if(marks[id]===el.dataset.planMark)delete marks[id];else marks[id]=el.dataset.planMark;plannerSave();renderPlanner();$(`[data-plan-row="${CSS.escape(id)}"] [data-plan-mark="${el.dataset.planMark}"]`)?.focus();return true;}
  if(el.id==='plan-clear'){for(const [id,v] of Object.entries(st.marks[st.route]))if(v==='target')delete st.marks[st.route][id];plannerSave();renderPlanner();toast('已清空本线计划；已招募的标记保留。');return true;}
  if(el.id==='plan-save-retry'){if(plannerSave())toast('已保存这份计划。');renderPlanner();return true;}
  if(el.id==='plan-backup-confirm'){if(plannerManualBackup)plannerFinishBackup(plannerManualBackup.code);return true;}
  if(el.id==='plan-backup'||el.dataset.planBackup){
    if(plannerCopying)return true;
    const code=plannerCode(),link=location.href.split('#')[0]+'#planner?restore='+code;
    const manual=()=>{plannerCopying=false;plannerManualBackup={code,link};plannerRefresh();const out=$('#plan-backup-out');out?.focus();out?.select();toast('请手动复制并保存链接，完成后点确认。');};
    if(globalThis.navigator?.clipboard?.writeText){
      plannerCopying=true;plannerRefresh();
      try{Promise.resolve(navigator.clipboard.writeText(link)).then(()=>{plannerCopying=false;plannerFinishBackup(code);},manual);}catch{manual();}
    }else manual();
    return true;
  }
  if(el.id==='plan-import'){const data=plannerDecode($('#plan-import-code').value);if(!data){toast('无法识别这个备份码，请确认复制完整。');return true;}plannerPending=data;plannerRestoreBad=false;renderPlanner();$('#planner-restore').scrollIntoView({behavior:'smooth',block:'center'});return true;}
  if(el.dataset.planRestore){
    const how=el.dataset.planRestore;
    if(plannerPending&&how==='merge')plannerMerge(st,plannerPending);
    if(plannerPending&&how==='replace'){for(const id of routeIds){st.renown[id]=plannerPending.renown[id];st.marks[id]={...plannerPending.marks[id]};}}
    if(how!=='dismiss'&&!Object.keys(st.marks[st.route]).length)st.route=routeIds.find(id=>Object.keys(st.marks[id]).length)||st.route;
    if(plannerPending&&how!=='dismiss'){const kept=plannerSave();toast(kept?(how==='merge'?'已合并并保存备份。':'已导入并保存备份。'):'已导入至当前页面；浏览器未允许保存，请先备份。');}
    plannerPending=null;plannerRestoreBad=false;history.replaceState(null,'','#planner/'+st.route);renderPlanner();return true;
  }
  return false;
}
function plannerHomeCard(){
  const st=plannerData(),rows=routeIds.map(id=>({id,target:plannerCount(id,'target'),done:plannerCount(id,'done')})).filter(r=>r.target||r.done);
  return `<div class="plan-mini"><div class="mini-head"><span>我的招募计划</span><a href="#planner">打开规划 →</a></div>${rows.length?rows.map(r=>`<a href="#planner/${r.id}"><strong>${esc(plannerRouteTitle(r.id))}</strong><span>计划 ${r.target} · 已招 ${r.done}</span></a>`).join(''):'<p>四条线的门槛放在一起比，勾选想招的人，自动列出要备的金币、物品和外传。</p><a class="text-link" href="#planner">开始规划 <span>→</span></a>'}</div>`;
}
