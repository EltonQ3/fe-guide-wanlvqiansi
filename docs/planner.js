'use strict';
// Recruit planner: Part I recruit table, compared across the four routes. Marks stay in this browser only.
const plannerKey='fe-next.planner.v1';
const needLabels={gold:'金币',item:'物品',quest:'任务',paralogue:'外传',option:'交涉选项',story:'剧情'};
const plannerFilters=[['all','本线可挖'],['ready','名声已达标'],['marked','我的标记'],['lowest','本线门槛最低']];
let plannerStore;
function plannerData(){
  if(plannerStore)return plannerStore;
  const raw=load(plannerKey,{}),ok=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const s=ok(raw)?raw:{};
  plannerStore={route:routeIds.includes(s.route)?s.route:'kai',filter:plannerFilters.some(f=>f[0]===s.filter)?s.filter:'all',renown:{},marks:{}};
  for(const id of routeIds){
    const r=Number(ok(s.renown)?s.renown[id]:NaN);plannerStore.renown[id]=Number.isInteger(r)&&r>=1&&r<=10?r:1;
    const m=ok(s.marks)&&ok(s.marks[id])?s.marks[id]:{};plannerStore.marks[id]=Object.fromEntries(Object.entries(m).filter(([,v])=>v==='target'||v==='done'));
  }
  return plannerStore;
}
function plannerSave(){save(plannerKey,plannerData());}
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
function plannerSummary(routeId){
  const t=plannerTotals(routeId),done=Object.values(plannerData().marks[routeId]).filter(v=>v==='done').length,list=(type,title)=>{const rows=t.needs.filter(n=>n.type===type);return rows.length?`<h3>${title}</h3><ul>${rows.map(n=>`<li><strong>${esc(n.who)}</strong>${esc(n.text)}${n.type==='paralogue'?`<small>${esc(plannerWindows(n,routeId)||'本线窗口未收录')}</small>`:''}</li>`).join('')}</ul>`:'';};
  return `<div class="eyebrow">SHOPPING LIST</div><h2>${esc(plannerRouteTitle(routeId))} · 计划 ${t.people.length} 人</h2><p class="plan-count">已招募 ${done} 人 · 当前名声 ${plannerData().renown[routeId]}</p>${t.people.length?`<dl class="plan-stats"><div><dt>最高名声</dt><dd>${t.renown}</dd></div><div><dt>支援最高</dt><dd>${t.support}S</dd></div><div><dt>金币至少</dt><dd>${t.gold.toLocaleString('en-US')}G</dd></div></dl>${Object.keys(t.items).length?`<h3>物品</h3><ul>${Object.entries(t.items).map(([name,x])=>`<li><strong>${esc(name)}${x.qty?' ×'+x.qty:''}${x.unknown?(x.qty?' ＋待确认':' · 数量待确认'):''}</strong>${esc(x.who.join('、'))}</li>`).join('')}</ul>`:''}${list('quest','先完成的任务')}${list('paralogue','需要先打的外传')}${list('option','交涉时这样选')}${list('story','剧情前提')}<p class="plan-fine">金币按表内最低花费相加：希蒙掷错需再付，札可捏按砍到 10G 计；商店折扣与物品买价未计入。支援要靠送礼、用餐提升，表中 S 是与本线主角的支援等级。</p><div class="plan-buttons"><button class="button" id="plan-copy">复制清单</button><button class="button secondary" id="plan-clear">清空本线计划</button></div>`:`<p class="plan-fine">点人物右侧的「计划」，这里会汇总要准备的金币、物品、任务和外传。「已招募」的人不再计入清单。</p>`}`;
}
function plannerText(routeId){
  const t=plannerTotals(routeId);
  return [`【${plannerRouteTitle(routeId)} · 招募计划】`,...t.people.map(c=>{const p=c.plan[routeId];return `${c.name} ${p.support}S/${p.renown}R${p.needs.length?'：'+p.needs.map(n=>n.text+(n.type==='paralogue'&&plannerWindows(n,routeId)?`（${plannerWindows(n,routeId)}）`:'')).join('；'):''}`;}),`金币至少 ${t.gold}G`,...Object.entries(t.items).map(([name,x])=>`物品 ${name}${x.qty?' ×'+x.qty:''}${x.unknown?' 数量待确认':''}`),'— 万缕千丝 · 战术手帖 招募规划'].join('\n');
}
function plannerMatrix(onlyMarked){
  const marks=plannerData().marks,rows=D.characters.filter(c=>c.plan&&routeIds.some(id=>c.plan[id].kind==='scout')).filter(c=>!onlyMarked||routeIds.some(id=>marks[id][c.id]));
  const cell=(c,id)=>{const p=c.plan[id],m=marks[id][c.id],tag=m?`<em class="mark-${m}">${m==='done'?'✓':'◎'}</em>`:'';if(p.kind==='scout')return `<td class="${p.lowest?'is-lowest':''}"><b>${p.renown}R</b>${tag}<small>${p.support}S${p.needs.length?' · '+[...new Set(p.needs.map(n=>needLabels[n.type][0]))].join(''):''}</small></td>`;return `<td class="is-own"><small>${{lord:'主角',auto:p.chapter?`第${p.chapter}章加入`:'自带',tutorial:'教学加入',none:'—'}[p.kind]}</small>${tag}</td>`;};
  return rows.length?`<div class="table-scroll plan-matrix" role="region" aria-label="四线招募门槛对照表，可横向滚动" tabindex="0"><table><thead><tr><th scope="col">角色</th>${routeIds.map(id=>`<th scope="col"><button data-planner-route="${id}">${esc(plannerRouteName(id).replace('线',''))}</button></th>`).join('')}</tr></thead><tbody>${rows.map(c=>{const count=routeIds.filter(id=>marks[id][c.id]==='done').length;return `<tr><th scope="row"><button data-character="${esc(c.id)}">${esc(c.name)}</button>${count>1?`<span class="plan-dup">${count} 线</span>`:''}</th>${routeIds.map(id=>cell(c,id)).join('')}</tr>`;}).join('')}</tbody></table></div>`:'<p class="plan-empty">还没有标记任何人物。</p>';
}
function plannerPage(routeId){
  const st=plannerData();if(routeIds.includes(routeId))st.route=routeId;
  return `<div class="container page planner-page">${heading('RECRUIT PLANNER','挖谁、在哪条线挖、要备什么。','第一部四条路线的招募门槛放在一起比较。标记计划后，自动汇总要准备的金币、物品、任务与外传。标记只保存在这台设备的浏览器里，不会读取游戏存档。')}<div class="planner-routes" role="group" aria-label="选择第一部路线" id="planner-routes"></div><div class="planner-layout"><div class="planner-main"><div class="planner-controls"><div class="renown-stepper"><span id="renown-label">本线当前名声</span><button data-renown="-1" aria-label="名声减一">−</button><output id="planner-renown" aria-labelledby="renown-label" aria-live="polite"></output><button data-renown="1" aria-label="名声加一">＋</button></div><div class="planner-filters" role="group" aria-label="筛选人物" id="planner-filters"></div></div><div class="planner-own" id="planner-own"></div><div id="planner-list"></div></div><aside class="planner-summary" id="planner-summary" aria-label="本线招募清单"></aside></div><section class="planner-compare"><div class="section-heading"><div><div class="eyebrow">FOUR ROUTES SIDE BY SIDE</div><h2>同一个人，在哪条线挖更省力？</h2></div><label class="plan-toggle"><input type="checkbox" id="planner-only-marked"> 只看我标记过的</label></div><p class="notice">绿色是四线里名声门槛最低的路线。小字为支援等级与附加条件：金＝金币、物＝物品、任＝任务、外＝外传、交＝交涉选项、剧＝剧情前提。◎ 计划，✓ 已招募。门槛最低只说明条件最宽，不代表最早出现；出场章节见各人物篇。第一部各线的等级和道具不互通，同一人物在多条线招到，第三部可以<a href="#guide/g5/s5-5">合并因果</a>，分开培养不同方向更划算。</p><div id="planner-matrix"></div></section><p class="notice">条件取自本站四路线招募表，与角色档案同源；标为原手册的条目尚未逐项实测，以游戏内交涉提示为准。<a href="#guide/g5/s5-3">查看招募原文 →</a></p></div>`;
}
function renderPlanner(){
  const st=plannerData(),id=st.route,own=plannerOwn(id),scouts=plannerScouts(id);
  $('#planner-routes').innerHTML=routeIds.map((r,i)=>{const hero=D.characters.find(c=>c.plan?.[r]?.kind==='lord'),m=Object.values(st.marks[r]);return `<button aria-pressed="${r===id}" data-planner-route="${r}">${hero?.avatar?`<img src="${esc(hero.avatar)}" alt="">`:''}<span><strong>${esc(routeNames[i].replace('线','篇'))}</strong><small>计划 ${m.filter(v=>v==='target').length} · 已招 ${m.filter(v=>v==='done').length}</small></span></button>`;}).join('');
  $('#planner-renown').textContent='Lv. '+st.renown[id];
  $('#planner-filters').innerHTML=plannerFilters.map(([f,label])=>{const n=scouts.filter(c=>f==='ready'?c.plan[id].renown<=st.renown[id]:f==='marked'?st.marks[id][c.id]:f==='lowest'?c.plan[id].lowest:true).length;return `<button data-plan-filter="${f}" aria-pressed="${st.filter===f}">${label}<span>${n}</span></button>`;}).join('');
  $('#planner-own').innerHTML=`<span class="eyebrow">本线自带</span>${own.map(c=>`<button data-character="${esc(c.id)}" title="${esc(c.recruit[plannerRouteName(id)])}">${c.avatar?`<img src="${esc(c.avatar)}" alt="">`:''}<span>${esc(c.name)}<small>${esc(c.recruit[plannerRouteName(id)].replace('本路线主角','主角'))}</small></span></button>`).join('')}`;
  $('#planner-list').innerHTML=plannerList(id);
  $('#planner-summary').innerHTML=plannerSummary(id);
  $('#planner-matrix').innerHTML=plannerMatrix($('#planner-only-marked')?.checked);
}
function plannerAction(el){
  const st=plannerData();
  if(el.dataset.plannerRoute){st.route=el.dataset.plannerRoute;history.replaceState(null,'','#planner/'+st.route);plannerSave();renderPlanner();if(el.closest('.plan-matrix'))$('#planner-routes').scrollIntoView({behavior:'smooth'});return true;}
  if(el.dataset.renown){st.renown[st.route]=Math.min(10,Math.max(1,st.renown[st.route]+Number(el.dataset.renown)));plannerSave();renderPlanner();return true;}
  if(el.dataset.planFilter){st.filter=el.dataset.planFilter;plannerSave();renderPlanner();return true;}
  if(el.dataset.planMark){const marks=st.marks[st.route],id=el.dataset.planId;if(marks[id]===el.dataset.planMark)delete marks[id];else marks[id]=el.dataset.planMark;plannerSave();renderPlanner();$(`[data-plan-row="${CSS.escape(id)}"] [data-plan-mark="${el.dataset.planMark}"]`)?.focus();return true;}
  if(el.id==='plan-clear'){for(const [id,v] of Object.entries(st.marks[st.route]))if(v==='target')delete st.marks[st.route][id];plannerSave();renderPlanner();toast('已清空本线计划；已招募的标记保留。');return true;}
  return false;
}
function plannerHomeCard(){
  const st=plannerData(),rows=routeIds.map(id=>{const m=Object.values(st.marks[id]);return {id,target:m.filter(v=>v==='target').length,done:m.filter(v=>v==='done').length};}).filter(r=>r.target||r.done);
  return `<div class="plan-mini"><div class="mini-head"><span>我的招募计划</span><a href="#planner">打开规划 →</a></div>${rows.length?rows.map(r=>`<a href="#planner/${r.id}"><strong>${esc(plannerRouteTitle(r.id))}</strong><span>计划 ${r.target} · 已招 ${r.done}</span></a>`).join(''):'<p>四条线的门槛放在一起比，勾选想招的人，自动列出要备的金币、物品和外传。</p><a class="text-link" href="#planner">开始规划 <span>→</span></a>'}</div>`;
}
