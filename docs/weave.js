'use strict';
// Home hero backdrop: fine threads drift like warp on a loom while the four route threads, spread apart on the
// left, braid together behind the portraits ("four paths, one interwoven destiny"). Purely decorative: the canvas
// sits behind the content, ignores the pointer for clicks, fades out under the text, holds still for
// prefers-reduced-motion, and stops drawing when it is off screen, in a background tab, or removed by navigation.
const weaveColors=['#6f93d6','#a58ad0','#d8b45a','#d9607f']; // portrait backdrops: 凯伊, 迪托利希, 赛奥朵拉, 蕾达
function startWeave(canvas){
  const hero=canvas.parentElement,ctx=canvas.getContext('2d');if(!ctx)return;
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(pointer: fine)').matches;
  let W=0,H=0,mask=null,band=null,warp=[],visible=true,raf=0,last=0,t=0,focus=-1,glow=[0,0,0,0];
  const pointer={x:0,y:0,on:0,want:0};
  function layout(){
    const r=hero.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,fine?2:1.5);
    W=r.width;H=r.height;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const rel=el=>{const b=el.getBoundingClientRect();return {l:b.left-r.left,t:b.top-r.top,r:b.right-r.left,b:b.bottom-r.top};};
    const copy=rel(hero.querySelector('.hero-copy')),art=rel(hero.querySelector('.hero-art')),meta=rel(hero.querySelector('.meta-strip'));
    const ends=[...hero.querySelectorAll('.portrait-panel')].map(el=>rel(el).b);
    // Braid line: where the staggered portraits end, so it slips in front of and behind the cards; between text
    // and portraits when they stack. Threads fan out upward on the left, under the (masked) text.
    band=art.t>copy.b-20?{y:(copy.b+art.t)/2,from:0,spread:Math.min(14,H*.03),up:0}:{y:Math.min((Math.min(...ends)+Math.max(...ends))/2,meta.t-24),from:copy.l,spread:0,up:(Math.max(...ends)-copy.t)/4.5};
    const n=Math.round(Math.min(34,Math.max(14,W/42)));
    warp=Array.from({length:n},(_,i)=>({y:H*(.06+.88*i/(n-1)),a:5+(i*7)%9,l:340+(i*137)%380,s:.10+(i%5)*.035,p:i*1.7,o:.07+(i%4)*.025}));
    // Text stays on a near-plain ground: erase most of the threads under the copy with a soft-edged mask.
    mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;
    const m=mask.getContext('2d');m.setTransform(dpr,0,0,dpr,0,0);m.filter='blur(28px)';m.fillStyle='rgba(0,0,0,.92)';
    m.fillRect(copy.l-36,copy.t,copy.r-copy.l+72,copy.b-copy.t);m.fillRect(meta.l,meta.t+8,meta.r-meta.l,meta.b-meta.t);
  }
  const push=(x,y)=>{if(!pointer.on)return 0;const dx=x-pointer.x,dy=y-pointer.y,d=Math.exp(-(dx*dx+dy*dy)/7200);return d*22*pointer.on*Math.sign(dy||1);};
  function line(f){ctx.beginPath();for(let x=-20;x<=W+20;x+=16){const y=f(x);x===-20?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}
  function draw(){
    ctx.clearRect(0,0,W,H);ctx.lineCap='round';
    ctx.lineWidth=1;
    for(const w of warp){ctx.strokeStyle=`rgba(203,182,142,${w.o})`;line(x=>{const y=w.y+w.a*Math.sin(x/w.l*6.283+t*w.s+w.p);return y+push(x,y);});}
    const {y:yc,from,spread,up}=band,span=Math.max(1,W-from);
    for(let pass=0;pass<2;pass++)weaveColors.forEach((c,k)=>{
      const lift=glow[k],dim=focus>=0&&focus!==k?.45:1;
      ctx.strokeStyle=c;ctx.globalAlpha=(pass?.62+.38*lift:.10+.12*lift)*dim;ctx.lineWidth=pass?1.3+lift:5+3*lift;
      line(x=>{const u=Math.min(1,Math.max(0,(x-from)/span)),s=u*u*(3-2*u),e=Math.min(1,s*1.6);
        const apart=yc+((k-1.5)*spread-k*up)*(1-s)+9*Math.sin(x/260+t*.35+k*2.1)*(1-s);
        const braid=yc+11*Math.sin(x/62-t*.6+k*Math.PI/2);
        const y=apart+(braid-apart)*e;return y+push(x,y);});
    });
    ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-out';ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(mask,0,0);
    ctx.globalCompositeOperation='source-over';const dpr=canvas.width/W;ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function frame(now){
    raf=0;if(!canvas.isConnected)return cleanup();
    const dt=Math.min(.05,(now-(last||now))/1000);last=now;t+=dt;
    pointer.on+=(pointer.want-pointer.on)*Math.min(1,dt*6);
    glow=glow.map((g,k)=>g+((focus===k?1:0)-g)*Math.min(1,dt*8));
    draw();if(visible&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  const wake=()=>{if(!raf&&visible&&!document.hidden&&canvas.isConnected){last=0;raf=requestAnimationFrame(frame);}};
  const redraw=()=>{if(!canvas.isConnected)return cleanup();layout();still?draw():wake();};
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(!still)wake();});io.observe(canvas);
  const ro=new ResizeObserver(redraw);ro.observe(hero);
  const onVis=()=>{if(!still)wake();};document.addEventListener('visibilitychange',onVis);
  const art=hero.querySelector('.hero-art'),panels=[...hero.querySelectorAll('.portrait-panel')];
  const onOver=e=>{const i=e.type==='pointerleave'||e.type==='focusout'?-1:panels.indexOf(e.target.closest('.portrait-panel'));if(i===focus)return;focus=i;if(still){glow=glow.map((_,k)=>k===i?1:0);draw();}};
  art.addEventListener('pointerover',onOver);art.addEventListener('pointerleave',onOver);art.addEventListener('focusin',onOver);art.addEventListener('focusout',onOver);
  const onMove=e=>{const r=hero.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;pointer.want=1;wake();};
  const onLeave=()=>{pointer.want=0;};
  if(fine&&!still){hero.addEventListener('pointermove',onMove);hero.addEventListener('pointerleave',onLeave);}
  function cleanup(){io.disconnect();ro.disconnect();document.removeEventListener('visibilitychange',onVis);if(raf)cancelAnimationFrame(raf);raf=0;}
  layout();
  if(still)draw();else wake();
}
