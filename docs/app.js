'use strict';
const D = window.FE_DATA;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href = s => /^https?:\/\//i.test(s || '') ? esc(s) : '';
const magnify = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const chapterNotes = ['难度与路线选择，第一次出发前要知道的事。','从支援到战斗公式，理解每一次行动的价值。','七神加护、侍奉优先级与专属日安排。','按角色查喜好，让每一份心意用在对的地方。','招募、转职、外传与成长，规划你的主力队伍。','切换路线前，确认哪些进度能够留下。'];
const routeNames = ['凯伊线','迪托利希线','赛奥朵拉线','蕾达线'];
let currentView = '', sourceTab = 'registry', observer, toastTimer, lastFocus, exportUrl;
function load(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast('浏览器未允许保存；本次操作仅在当前页面有效。'); return false; } }
let checks = load('fe-next.weekly.v1', {});
if (!checks || Array.isArray(checks) || typeof checks !== 'object') checks = {};
let drafts = load('fe-next.candidates.v1', []);
if (!Array.isArray(drafts)) drafts = [];
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2800); }
function openDialog(id) { lastFocus = document.activeElement; const dialog = $('#'+id); if(!dialog.open) dialog.showModal(); }
function closeDialog(id) { $('#'+id).close(); }
$$('dialog').forEach(d => { d.addEventListener('close', () => lastFocus?.isConnected && lastFocus.focus()); d.addEventListener('click', e => { if(e.target === d) { const r = d.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); } }); });
function countDone() { return D.weekly.filter(t => checks[t.id]).length; }
function heading(kicker, title, description) { return `<header class="page-heading"><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></header>`; }
function weeklyItem(task, i, mini = false) { return `<label class="check-item ${checks[task.id]?'done':''}"><input type="checkbox" data-week="${task.id}" ${checks[task.id]?'checked':''} aria-label="完成行动 ${i+1}：${esc(task.text)}">${mini?'':`<span class="check-number">${String(i+1).padStart(2,'0')}</span>`}<span class="check-copy">${task.html}</span></label>`; }
function home() {
  const names=['凯伊','迪托利希','赛奥朵拉','蕾达'];
  const protagonists=names.map(n => D.characters.find(c=>c.aliases.includes(n)));
  const latest=D.logs.find(e=>e.date===D.updated);
  return `<section class="hero-home"><div class="container"><div class="hero-inner"><div class="hero-copy"><div class="eyebrow">FIRE EMBLEM · FORTUNE’S WEAVE</div><h1>于万缕命运间，<br><span>走出你的胜局。</span></h1><p>从第一次选择，到每一场战斗。<br>一份陪你探索《万缕千丝》的玩家战术手帖。</p><div class="hero-actions"><a class="button gold" href="#guide/g1">开始冒险 <span>↗</span></a><a class="text-link" href="#characters">查找角色 <span>→</span></a></div></div><div class="hero-art">${protagonists.map(c=>`<a class="portrait-panel" href="#characters?name=${encodeURIComponent(c.name)}" aria-label="查看${esc(c.name)}的角色资料"><img src="${esc(c.portrait)}" alt="${esc(c.name)}立绘" fetchpriority="high"><span>${esc(c.name)}</span></a>`).join('')}<div class="hero-caption">FOUR PATHS. ONE INTERWOVEN DESTINY.</div></div></div><div class="meta-strip"><span><i class="dot"></i>资料快照 ${D.updated.replaceAll('-','.')}</span><span>6 篇攻略 / ${D.characters.length} 位角色索引</span><span>玩家整理 · 非官方网站</span></div></div></section>
  <div class="container"><div class="home-search"><button class="search-launch" data-search="">${magnify}<span>想查什么？角色、礼物、招募条件…</span></button><div class="hot-search"><span>常用</span><button data-search="招募">招募</button><button data-search="转职">转职</button><button data-search="礼物">礼物</button><button data-search="错过">错过要素</button></div></div>
  <div class="home-body"><div class="section-heading"><div><div class="eyebrow">YOUR NEXT MOVE</div><h2>此刻，你想做什么？</h2></div><span class="text-link">从问题出发，更快找到答案</span></div><div class="entry-grid"><a class="entry featured" href="#guide/g1"><span class="entry-number">01</span><span class="arrow">↗</span><h3>准备开始冒险</h3><p>选路线、定难度，掌握开局的关键决策。</p></a><a class="entry" href="#characters"><span class="entry-number">02</span><span class="arrow">↗</span><h3>找到心仪的同伴</h3><p>招募门槛、礼物喜好，一份档案查清楚。</p></a><a class="entry" href="#guide/g6"><span class="entry-number">03</span><span class="arrow">↗</span><h3>不留下遗憾</h3><p>路线切换与错过要素，推进前再确认。</p></a></div>
  <div class="home-columns"><section><div class="section-heading"><div><div class="eyebrow">THE FIELD MANUAL</div><h2>把每一步，走得更从容</h2></div><a class="text-link" href="#guides">全部攻略 ↗</a></div><div class="guide-list">${D.chapters.map((c,i)=>`<a class="guide-row" href="#guide/${c.id}"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(c.title)}</h3><p>${chapterNotes[i]}</p></div><span class="arrow">↗</span></a>`).join('')}</div></section>
  <aside><div class="section-heading"><div><div class="eyebrow">A LITTLE EVERY WEEK</div><h2>本周，也别忘了</h2></div></div><div class="weekly-mini"><div class="mini-head"><span>我的行动清单</span><span data-progress-text>${countDone()} / ${D.weekly.length} 完成</span></div><div class="progress"><span data-progress style="width:${countDone()/D.weekly.length*100}%"></span></div>${D.weekly.slice(1,4).map((t,i)=>weeklyItem(t,i+1,true)).join('')}<a class="text-link" href="#weekly">查看完整 ${D.weekly.length} 项行动 <span>→</span></a></div><div class="update-note"><div class="eyebrow">LATEST NOTES</div><time>${D.updated}</time><h3>最近的内容修订</h3><p>${esc(latest?.merged?.[0]?.text || '查看最近的资料记录。')}</p><a href="#sources/log">查看修订与争议记录 ↗</a></div></aside></div>
  <section class="featured-chars"><div class="section-heading"><div><div class="eyebrow">MEET YOUR COMPANIONS</div><h2>四段旅途，由你展开</h2></div><a class="text-link" href="#characters">角色图鉴 ↗</a></div><div class="characters-preview">${protagonists.map(c=>`<button class="mini-character" data-character="${c.id}"><img src="${esc(c.avatar)}" alt="" loading="lazy"><span><strong>${esc(c.name)}</strong><small>${esc(c.jp)} · 查看档案 ↗</small></span></button>`).join('')}</div></section></div></div>`;
}
function characterPage(query='') { return `<div class="container page">${heading('COMPANION ARCHIVE','每一位同伴，都值得了解。','把分散在攻略里的招募条件与送礼喜好放在一起。支持简繁别名、日文名与礼物反查。')}<div class="filter-bar"><input id="char-query" type="search" value="${esc(query)}" placeholder="搜索角色、别名、礼物，例如：洛蕾塔、咖啡" aria-label="搜索角色或礼物"><select id="route-filter" aria-label="按可招募路线筛选"><option value="">所有路线</option>${routeNames.map(n=>`<option>${n}</option>`).join('')}</select><span class="count" id="char-count" aria-live="polite"></span></div><div id="character-grid" class="character-grid"></div><p class="notice">本页当前提供招募与礼物资料；逐角色养成、转职路线、各章用人与难点战斗攻略正在规划，尚未补全。现有条目由原手册整理，空缺不补写；「—」表示该路线无法招募。简繁与社群别名共用同一档案，数值仍需以当前游戏版本核对。</p></div>`; }
function filterCharacters() {
  const query=$('#char-query').value.trim().toLocaleLowerCase(), route=$('#route-filter').value;
  const chars=D.characters.filter(c=> (!query || normalize([c.name,c.jp,...c.aliases,...Object.values(c.gifts)].join(' ')).includes(normalize(query))) && (!route || (c.recruit[route] && c.recruit[route]!=='—')));
  $('#char-count').textContent=`${chars.length} / ${D.characters.length} 位同伴`;
  $('#character-grid').innerHTML=chars.map(c=>`<button class="character-card" data-character="${esc(c.id)}" aria-label="查看${esc(c.name)}档案"><div class="character-image">${c.portrait?`<img src="${esc(c.portrait)}" alt="${esc(c.name)}" loading="lazy">`:`<span class="fallback">${esc(c.name[0])}</span>`}</div><h3>${esc(c.name)}</h3><p>${esc(c.faction.replace(/（.*?）/g,''))}</p><div class="character-flags">${Object.keys(c.recruit).length?'<span class="tag">招募条件</span>':''}${c.gifts['推荐礼物']&&c.gifts['推荐礼物']!=='—'?'<span class="tag green">礼物喜好</span>':''}</div></button>`).join('') || '<p class="empty">没有匹配的角色。试试其他别名，或切回所有路线。</p>';
}
function showCharacter(id) {
  const c=D.characters.find(x=>x.id===id); if(!c)return;
  const gift=c.gifts['推荐礼物'];
  $('#character-dialog').innerHTML=`<button class="icon-btn" data-close="character-dialog" aria-label="关闭角色档案">×</button><div class="character-detail"><div class="detail-art">${c.portrait?`<img src="${esc(c.portrait)}" alt="${esc(c.name)}立绘">`:''}</div><div class="detail-body"><div class="eyebrow">COMPANION DOSSIER</div><h2>${esc(c.name)}</h2><p class="jp">${esc(c.jp)} · ${esc(c.faction)}</p><p class="aliases">检索别名：${c.aliases.map(esc).join(' / ')}</p><h3>喜欢什么，送什么</h3><p>${gift && gift!=='—'?esc(gift):'原手册尚未收录明确的推荐礼物。'}</p>${c.gifts['喜欢的东西']?`<p class="aliases">喜好：${esc(c.gifts['喜欢的东西'])}</p>`:''}${c.gifts['兴趣']?`<p class="aliases">兴趣：${esc(c.gifts['兴趣'])}</p>`:''}<a class="text-link" href="#guide/g4/s4-4" data-dismiss>查看送礼原文与例外 →</a><h3>各路线招募条件</h3>${Object.keys(c.recruit).length?`<dl>${routeNames.map(n=>`<div><dt>${n}</dt><dd>${esc(c.recruit[n]||'原表未收录')}</dd></div>`).join('')}</dl><p class="aliases">S = 支援等级 · R = 名声等级 · — = 无法招募</p>`:'<p>原手册未提供此角色的四路线招募表。</p>'}${Object.values(c.recruit).some(v=>v.includes('①'))?'<p class="notice">原表的「追加条件①」未在该行展开，请结合游戏内提示核对。</p>':''}<a class="text-link" href="#guide/g5/s5-3" data-dismiss>查看招募原文与附加说明 →</a><div class="notice">资料继承自原手册 ${D.updated} 快照，本次未逐项重新实测。礼物与招募的源站说明见情报档案。</div></div></div>`;
  openDialog('character-dialog');
}
function guides() { return `<div class="container page">${heading('THE FIELD MANUAL','攻略手册','先看结论，再读细节。按主题阅读，也可以直接跳到你关心的问题。')}<div class="guide-catalog">${D.chapters.map((c,i)=>`<section class="catalog-item"><div class="eyebrow">CHAPTER ${String(i+1).padStart(2,'0')} · ${c.sections.length} 个主题</div><h2><a href="#guide/${c.id}">${esc(c.title)} ↗</a></h2><p>${chapterNotes[i]}</p><div class="catalog-links">${c.sections.map(s=>`<a href="#guide/${c.id}/${s.id}">${esc(s.title)}<span>→</span></a>`).join('')}</div></section>`).join('')}</div></div>`; }
function guide(id) {
  const c=D.chapters.find(c=>c.id===id); if(!c)return notFound();
  return `<div class="container page"><div class="breadcrumbs"><a href="#home">首页</a><span>/</span><a href="#guides">攻略手册</a><span>/</span><span>第 ${c.number} 篇</span></div><div class="reading-layout"><aside class="reading-nav"><h2>本篇目录 <span class="eyebrow">${String(c.number).padStart(2,'0')}</span></h2><nav aria-label="本篇目录">${c.sections.map(s=>`<a href="#guide/${c.id}/${s.id}" data-section="${s.id}">${esc(s.title)}</a>`).join('')}</nav><div class="notice">数据继承自原手册。<br><a href="#sources/log">查看修订与争议 →</a></div></aside><article class="reading-content"><header class="reading-title"><div class="eyebrow">CHAPTER ${String(c.number).padStart(2,'0')} / FIELD NOTES</div><h1>${esc(c.title)}</h1><div class="article-meta"><span>资料快照 ${D.updated}</span><span>${c.sections.length} 个主题</span><a href="#sources">出处与核对状态 ↗</a></div></header>${c.introHtml?`<div class="prose">${c.introHtml}</div>`:''}${c.sections.map(s=>`<section class="reading-section" id="${s.id}"><h2>${esc(s.title)}</h2><div class="prose">${s.html}</div></section>`).join('')}<div class="page-end">${c.number>1?`<a href="#guide/g${c.number-1}">← 上一篇</a>`:'<a href="#guides">← 全部攻略</a>'}${c.number<6?`<a href="#guide/g${c.number+1}">下一篇 →</a>`:'<a href="#weekly">每周行动 →</a>'}</div></article></div></div>`;
}
function weekly() { return `<div class="container page">${heading('YOUR WEEKLY RITUAL','把小事做好，胜局自来。','根据原手册整理的 9 项每周行动。进度只保存在当前浏览器，由你在游戏开始新一周时重置。')}<div class="weekly-layout"><div class="weekly-list">${D.weekly.map((t,i)=>weeklyItem(t,i)).join('')}</div><aside class="weekly-aside"><div class="eyebrow">THIS WEEK’S PROGRESS</div><div class="weekly-score"><span data-done>${countDone()}</span><small> / ${D.weekly.length} 已完成</small></div><div class="progress"><span data-progress style="width:${countDone()/D.weekly.length*100}%"></span></div><h2>以你的游戏进度为准</h2><p>这是一张玩家行动清单，不会读取游戏存档，也不会随现实日期自动重置。</p><p>原手册优先级：精准用餐 → 侍奉 → 送礼。神的专属日可另行安排。</p><button class="button" id="reset-week">开始新的一周 ↻</button><button class="button secondary" id="print-week">打印清单 ↗</button><p><a href="#guide/g1/s1-5">每周行动完整机制 →</a><br><a href="#guide/g3/s3-4">七神专属日排程 →</a></p></aside></div></div>`; }
function sources() { return `<div class="container page">${heading('INTELLIGENCE & EVIDENCE','每一条情报，都有来处。','区分出处、原站评价与本次核验。收录不等于证实，来源数量也不等于独立证据数量。')}<div class="source-tabs" role="tablist" aria-label="情报档案分类"><button role="tab" id="tab-registry" aria-controls="source-content" aria-selected="${sourceTab==='registry'}" data-source-tab="registry">来源目录</button><button role="tab" id="tab-log" aria-controls="source-content" aria-selected="${sourceTab==='log'}" data-source-tab="log">修订与争议</button><button role="tab" id="tab-collect" aria-controls="source-content" aria-selected="${sourceTab==='collect'}" data-source-tab="collect">收集新资料</button></div><div id="source-content" role="tabpanel" aria-labelledby="tab-${sourceTab}"></div></div>`; }
function renderSources() {
  $$('.source-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.sourceTab===sourceTab)));
  $('#source-content').setAttribute('aria-labelledby','tab-'+sourceTab);
  if(sourceTab==='registry') {
    $('#source-content').innerHTML=`<p class="notice">${D.sources.length} 个去重后的来源地址，继承自原站清单及更新日志。「原分级」仅表示历史记录；本次没有对全部链接和攻略结论重新核验。官方报道、玩家实测、媒体转述应按具体论断分别判断。</p><div class="filter-bar"><input type="search" id="source-query" placeholder="搜索站点、主题或网址" aria-label="搜索来源"><select id="source-kind" aria-label="按来源类型筛选"><option value="">所有来源</option><option>官方</option><option>攻略 / 媒体</option><option>社区</option></select><span class="count" id="source-count" aria-live="polite"></span></div><div id="source-list"></div>`;
    filterSources();
  } else if(sourceTab==='log') {
    $('#source-content').innerHTML=`<p class="notice">下列为原站历史记录，不代表本预览版正在自动巡检。日期相同的内容修订与采集记录分别保留，冲突状态沿用原记录的文字。</p>${D.logs.map((e,i)=>`<details class="log-item" ${i===0?'open':''}><summary><strong>${esc(e.date)}</strong><span>${(e.merged||[]).length} 条修订 · ${(e.conflicts||[]).length} 条争议记录　＋</span></summary>${e.merged?.length?`<h3>本次修订</h3><ul>${e.merged.map(m=>`<li>${esc(m.text)}${href(m.src)?`<br><a href="${href(m.src)}" target="_blank" rel="noopener noreferrer">原记录引用 ↗</a>`:''}</li>`).join('')}</ul>`:''}${e.conflicts?.length?`<h3>冲突与裁决记录</h3>${e.conflicts.map(c=>`<div class="conflict"><strong>${esc(c.topic)}</strong><p>正文：${esc(c.current)}</p><p>来源差异：${esc(c.incoming)}</p>${href(c.src)?`<a href="${href(c.src)}" target="_blank" rel="noopener noreferrer">查看引用来源 ↗</a>`:''}</div>`).join('')}`:''}${e.limited?.length?`<h3>当次访问受限</h3><p class="notice">${e.limited.map(l=>`${esc(l.site)}：${esc(l.reason)}`).join('<br>')}</p>`:''}</details>`).join('')}`;
  } else {
    $('#source-content').innerHTML=`<div class="collection-layout"><section><h2 style="font-family:var(--serif);font-size:25px;margin-bottom:12px">把线索，留给下一次核对。</h2><p class="notice">候选资料保存在本机，可导出为 JSON 交给维护者。此处不会发布，也不会自动写入攻略正文。</p><form id="source-form" class="source-form"><label>来源标题<input name="title" required maxlength="160" placeholder="例如：某角色在蕾达路线的加入条件"></label><label>原始链接<input name="url" type="url" required placeholder="https://…"></label><label>资料类型<select name="kind"><option>玩家实测</option><option>官方公告</option><option>攻略 / 媒体</option><option>公开数据表</option></select></label><label>游戏版本（可选）<input name="gameVersion" maxlength="80" placeholder="例如：1.0.1；不清楚则留空"></label><label>适用路线（可选）<select name="route"><option value="">尚未确认</option><option>全路线</option><option>凯伊线</option><option>迪托利希线</option><option>赛奥朵拉线</option><option>蕾达线</option></select></label><label>证据位置（可选）<input name="evidenceLocation" maxlength="300" placeholder="章节标题、截图编号或视频时间点"></label><label>需要核对的内容<textarea name="claim" required maxlength="2000" placeholder="记录具体结论、游戏版本、路线、截图位置或视频时间点；转述资料请注明原始出处。"></textarea></label><button class="button" type="submit">保存为待核对资料 <span>＋</span></button></form><div id="drafts"></div></section><aside><div class="eyebrow">FROM A LEAD TO A FACT</div>${[['收集','优先找官方页面、原始实测、公开数据表；保留永久链接和原文位置。'],['核对','记录版本、路线、难度与证据。转载同一张表，只算同一个证据来源。'],['裁决','区分已确认、暂定、冲突、失效；关键数值存在冲突时保留旧值并标记。'],['发布','确认具体条目后再入库。保留修改前后、证据与核对时间，可追溯也可回退。']].map((s,i)=>`<div class="pipeline-step"><b>0${i+1}</b><div><h3>${s[0]}</h3><p>${s[1]}</p></div></div>`).join('')}</aside></div>`;
    renderDrafts();
  }
}
function filterSources() {
  const q=$('#source-query').value.toLowerCase().trim(),kind=$('#source-kind').value;
  const values=D.sources.filter(s=>(!kind||s.kind===kind)&&(!q||[s.title,s.host,s.note,s.url].join(' ').toLowerCase().includes(q)));
  $('#source-count').textContent=`${values.length} 个来源`;
  $('#source-list').innerHTML=values.map(s=>`<div class="source-row"><div><span class="tag ${s.kind==='官方'?'green':''}">${esc(s.kind)}</span></div><div><h3><a href="${href(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></h3><p>${esc(s.host)}${s.originalGrade?` · 原分级 ${esc(s.originalGrade)}`:''}</p>${s.note?`<details><summary style="font-size:10px;cursor:pointer;color:var(--muted)">展开原记录说明</summary><p>${esc(s.note)}</p></details>`:''}</div><div><span class="tag">待重新核验</span>${s.lastListed?`<br><time>记录 ${esc(s.lastListed)}</time>`:''}</div></div>`).join('')||'<p class="empty">没有匹配的来源，试试其他关键词。</p>';
}
function renderDrafts() {
  if(!drafts.length){$('#drafts').innerHTML='';return;}
  $('#drafts').innerHTML=`<div class="draft-header"><h3>本机候选 · ${drafts.length}</h3><button id="export-drafts">导出 JSON ↓</button></div>${drafts.map((s,i)=>`<div class="draft-row"><div><strong>${esc(s.title)}</strong><a href="${href(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a><span class="tag amber">待核对</span></div><button data-remove-draft="${i}">移除</button></div>`).join('')}`;
}
function notFound() { return `<div class="container page">${heading('PAGE NOT FOUND','这一页还没有收录。','可以返回攻略手册，或搜索你想查找的主题。')}<a class="button" href="#guides">返回攻略手册 →</a></div>`; }
function normalize(text) {
  const variants={'禮':'礼','贈':'赠','轉':'转','職':'职','術':'术','線':'线','錯':'错','過':'过','條':'条','關':'关','護':'护','級':'级','聲':'声','戰':'战','鬥':'斗','練':'练','難':'难','隊':'队','體':'体','驗':'验','時':'时','間':'间','圖':'图','鑑':'鉴','選':'选','擇':'择','週':'周','遊':'游','戲':'戏','書':'书','鐵':'铁','劍':'剑','槍':'枪','繼':'继','資':'资','廟':'庙'};
  let s=String(text).toLowerCase().replace(/[\s·・]/g,'').replace(/[禮贈轉職術線錯過條關護級聲戰鬥練難隊體驗時間圖鑑選擇週遊戲書鐵劍槍繼資廟]/g,c=>variants[c]||c);
  for(const c of D.characters) for(const alias of c.aliases) if(alias!==c.name)s=s.replaceAll(alias,c.name);
  return s;
}
function search(query='') { openDialog('search-dialog'); $('#global-query').value=query; renderSearch(); $('#global-query').focus(); }
function renderSearch() {
  const q=normalize($('#global-query').value.trim());
  if(!q){$('#search-results').innerHTML='<p class="result-label">搜索角色与攻略正文，也可以从这些主题开始</p><div class="search-suggestions">'+['洛蕾塔','礼物','招募','转职','外传','名声'].map(x=>`<button data-search="${x}">${x}</button>`).join('')+'</div>';return;}
  const characters=D.characters.filter(c=>normalize([c.name,c.jp,...c.aliases,...Object.values(c.gifts)].join(' ')).includes(q));
  const sections=D.chapters.flatMap(c=>c.sections.map(s=>({...s,chapter:c})));
  const results=sections.filter(s=>normalize(s.title+' '+s.text).includes(q)).sort((a,b)=>Number(normalize(b.title).includes(q))-Number(normalize(a.title).includes(q)));
  $('#search-results').innerHTML=`<p class="result-label">${characters.length} 位角色 · ${results.length} 个攻略主题${characters.length>8?'（角色显示前 8 位）':''}</p>${characters.slice(0,8).map(c=>`<button class="search-result" data-search-character="${esc(c.id)}"><strong>${esc(c.name)}</strong><small>角色档案 · ${esc(c.gifts['推荐礼物']||c.faction)}</small></button>`).join('')}${results.slice(0,16).map(s=>`<a class="search-result" href="#guide/${s.chapter.id}/${s.id}" data-dismiss><strong>${esc(s.title)}</strong><small>${esc(s.chapter.title)} · ${esc(s.text.replace(/\n/g,' ').slice(0,100))}</small></a>`).join('')}${!characters.length&&!results.length?'<p class="empty">没有找到结果。试试角色别名或较短的关键词。</p>':''}`;
}
function navigate() {
  const raw=location.hash.slice(1)||'home';
  if(raw==='main'){ $('#main').focus(); return; }
  const [path,query='']=raw.split('?'), [view,id,section]=path.split('/');
  const key=view==='guide'?`guide/${id}`:view;
  if(view==='guide'&&currentView===key) { if(section) $('#'+CSS.escape(section))?.scrollIntoView({behavior:'smooth'}); else window.scrollTo({top:0}); return; }
  observer?.disconnect(); currentView=key;
  if(view==='sources') sourceTab=['registry','log','collect'].includes(id)?id:'registry';
  const titles={home:'首页',characters:'角色图鉴',guides:'攻略手册',guide:D.chapters.find(c=>c.id===id)?.title||'攻略',weekly:'每周行动',sources:'情报档案'};
  document.title=(titles[view]||'未收录页面')+' · 万缕千丝战术手帖';
  $('#main').innerHTML=view==='home'?home():view==='characters'?characterPage(new URLSearchParams(query).get('name')||''):view==='guides'?guides():view==='guide'?guide(id):view==='weekly'?weekly():view==='sources'?sources():notFound();
  $$('.main-nav a').forEach(a=>{const active=a.dataset.nav===(view==='guide'?'guides':view);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(view==='characters')filterCharacters();
  if(view==='sources')renderSources();
  window.scrollTo({top:0,behavior:'instant'});
  if(view==='guide') {
    if(section)requestAnimationFrame(()=>$('#'+CSS.escape(section))?.scrollIntoView({behavior:'instant'}));
    observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top); if(visible[0]) $$('.reading-nav a[data-section]').forEach(a=>a.classList.toggle('active',a.dataset.section===visible[0].target.id));},{rootMargin:'-145px 0px -55% 0px'});
    $$('.reading-section').forEach(s=>observer.observe(s));
    // A visible selection on initial load, before the observer reports.
    ($(`[data-section="${section||D.chapters.find(c=>c.id===id)?.sections[0]?.id}"]`))?.classList.add('active');
  }
}
document.addEventListener('click', async e=> {
  const el=e.target.closest('button,a'); if(!el)return;
  if(el.dataset.close)closeDialog(el.dataset.close);
  if(el.hasAttribute('data-search'))search(el.dataset.search);
  if(el.id==='search-open')search();
  if(el.dataset.character)showCharacter(el.dataset.character);
  if(el.dataset.searchCharacter){closeDialog('search-dialog');showCharacter(el.dataset.searchCharacter);}
  if(el.hasAttribute('data-dismiss')){$$('dialog[open]').forEach(d=>d.close()); if(el.hash===location.hash)navigate();}
  if(el.dataset.sourceTab){sourceTab=el.dataset.sourceTab;history.replaceState(null,'','#sources/'+sourceTab);renderSources();}
  if(el.id==='reset-week'){checks={};save('fe-next.weekly.v1',checks);$$('[data-week]').forEach(c=>{c.checked=false;c.closest('label').classList.remove('done');});updateProgress();toast('新的一周，重新出发。');}
  if(el.id==='print-week')window.print();
  if(el.dataset.removeDraft!==undefined){drafts.splice(Number(el.dataset.removeDraft),1);save('fe-next.candidates.v1',drafts);renderDrafts();}
  if(el.id==='export-drafts') {
    const json=JSON.stringify({schemaVersion:1,candidates:drafts},null,2);
    if(exportUrl)URL.revokeObjectURL(exportUrl);
    exportUrl=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    $('#export-json').value=json;$('#download-json').href=exportUrl;openDialog('export-dialog');
  }
  if(el.id==='copy-json'){try{await navigator.clipboard.writeText($('#export-json').value);toast('已复制候选资料。');}catch{$('#export-json').focus();$('#export-json').select();toast('已选中导出内容，请手动复制。');}}
});
function updateProgress(){ $$('[data-progress]').forEach(x=>x.style.width=countDone()/D.weekly.length*100+'%');$$('[data-progress-text]').forEach(x=>x.textContent=`${countDone()} / ${D.weekly.length} 完成`);$$('[data-done]').forEach(x=>x.textContent=countDone()); }
document.addEventListener('input', e=>{if(e.target.id==='global-query')renderSearch();if(e.target.id==='char-query')filterCharacters();if(e.target.id==='source-query')filterSources();});
document.addEventListener('change', e=>{if(e.target.id==='route-filter')filterCharacters();if(e.target.id==='source-kind')filterSources();if(e.target.dataset.week){checks[e.target.dataset.week]=e.target.checked;save('fe-next.weekly.v1',checks);e.target.closest('label').classList.toggle('done',e.target.checked);updateProgress();}});
document.addEventListener('submit',e=>{if(e.target.id!=='source-form')return;e.preventDefault();const form=e.target,values=new FormData(form);let url;try{url=new URL(values.get('url'));if(!['https:','http:'].includes(url.protocol))throw new Error();}catch{toast('请填写有效的 HTTP 或 HTTPS 原始链接。');return;}if(drafts.some(d=>d.url===url.href)){toast('这条链接已在本机候选列表中。');return;}if(!values.get('title').trim()||!values.get('claim').trim()){toast('请填写标题和需要核对的具体内容。');return;}drafts.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:values.get('title').trim(),url:url.href,kind:values.get('kind'),claim:values.get('claim').trim(),status:'pending',createdAt:new Date().toISOString(),gameVersion:values.get('gameVersion').trim()||null,route:values.get('route')||null,evidenceLocation:values.get('evidenceLocation').trim()||null,independentSourceIds:[]});save('fe-next.candidates.v1',drafts);form.reset();renderDrafts();toast('已保存到本机，等待核对。');});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.activeElement.isContentEditable&&!$('dialog[open]')){e.preventDefault();search();}});
window.addEventListener('hashchange',navigate);
navigate();
