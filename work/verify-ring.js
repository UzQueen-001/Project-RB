const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('work/game.js','utf8');

let P=0, lastRafCb=null;
const grad={addColorStop(){}};
const ctx={
  setTransform(){}, translate(){}, quadraticCurveTo(){}, setLineDash(){}, createLinearGradient(){return grad;}, createRadialGradient(){return grad;},
  fillRect(){}, fill(){}, beginPath(){}, arc(){}, arcTo(){}, moveTo(){}, lineTo(){}, closePath(){},
  stroke(){}, fillText(){}, strokeRect(){}, clip(){}, save(){}, restore(){},
  fillStyle:'', strokeStyle:'', lineWidth:1, globalAlpha:1, font:'', textAlign:'', textBaseline:'', shadowColor:'', shadowBlur:0
};
function makeEl(id){const listeners={};return{id,textContent:'',innerHTML:'',offsetWidth:0,dataset:{},style:{setProperty(){},width:'',background:''},classList:{add(){},remove(){},toggle(){}},addEventListener(type,cb){(listeners[type]=listeners[type]||[]).push(cb);},appendChild(){},getContext(){return ctx;},getBoundingClientRect(){return{left:0,top:0,width:100,height:100};},listeners};}
const els={};
const docListeners={};
const document={querySelector:s=>els[s]||(els[s]=makeEl(s)),querySelectorAll:()=>Array.from({length:8},()=>makeEl('g')),createElement:()=>makeEl('c'),documentElement:{style:{setProperty(){}}},addEventListener(type,cb){(docListeners[type]=docListeners[type]||[]).push(cb);},hidden:false};
const canvas=makeEl('canvas');
const sandbox={console,window:{addEventListener(){},__RING_TEST__:{}},performance:{now:()=>P},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(cb){lastRafCb=cb;},document,innerWidth:1280,innerHeight:800,devicePixelRatio:2};
vm.createContext(sandbox);
vm.runInContext(code,sandbox,{filename:'ring-beat.js'});
const T=sandbox.window.__RING_TEST__;

let issues=0;
function check(cond,msg){ if(!cond){ console.log('FAIL:',msg); issues++; } }

// 谱面规则
for(const def of T.TRACKS){
  for(const diff of ['easy','normal','hard']){
    const notes=T.buildPattern(def.bpm,def.duration,diff,def.seed);
    check(notes.length>20, def.id+'/'+diff+' 音符过少');
    check(notes[0].type==='tap'&&notes[0].d===0, def.id+'/'+diff+' 首音应为正上方向键');
    check(notes.every((n,i)=>i===0||n.t>notes[i-1].t-1e-9), def.id+'/'+diff+' 时间应单调');
    const arcs=notes.filter(n=>n.type==='arc');
    if(diff==='easy') check(arcs.length===0, def.id+'/easy 不应有 90° 弧');
    else check(arcs.length>0, def.id+'/'+diff+' 应有 90° 弧');
    check(arcs.every(n=>Math.abs((n.a1-n.a0)-90)<1e-6), def.id+'/'+diff+' 弧应跨 90°');
    // hold 期间不应有其他音符（可打性）
    for(const h of notes.filter(n=>n.type==='hold')){
      const clash=notes.some(n=>n!==h && n.type!=='kick' && n.t>=h.t-1e-6 && n.t<h.t2-1e-6);
      check(!clash, def.id+'/'+diff+' hold 期间出现了其他音符');
      const tailClash=notes.some(n=>n.type==='tap' && Math.abs(n.t-h.t2)<1e-6 && n.d===h.d);
      check(!tailClash, def.id+'/'+diff+' hold 尾部同刻同方向出现了 tap');
    }
    // kick：可在 hold 内（须同方向），也可独立出现
    let standaloneKick=0;
    for(const k of notes.filter(n=>n.type==='kick')){
      const h=notes.find(n=>n.type==='hold'&&k.t>=n.t-1e-6&&k.t<n.t2-1e-6);
      if(h) check(k.d===h.d, def.id+'/'+diff+' hold 内 kick 应与 hold 同方向');
      else standaloneKick++;
    }
    if(diff!=='easy') check(standaloneKick>0, def.id+'/'+diff+' 应存在独立 kick');
  }
}

// 旋转映射：左滑（逆时针 -90）后，谱面的"上"（方向0）应位于屏幕左侧（区域3 = A 键）
check(T.zoneOf(T.norm(0+270))===3, '旋转后谱面"上"应对应 A（左）键');
// 右滑（+90）归位
check(T.zoneOf(T.norm(0+360))===0, '旋转归位后谱面"上"应对应 W 键');

// 电脑端左右方向键旋转（带 0.18s 动画）
T.rotateChart(-1);
check(T.rotTarget()===270, '按 ← 目标角度应为 270，实际 '+T.rotTarget());
check(T.chartRotLive()===0, '动画起点应从当前角度开始');
T.updateEffects(0.2);
check(T.chartRotLive()===270, '动画结束后显示角度应为 270，实际 '+T.chartRotLive());
T.rotateChart(1);
T.updateEffects(0.2);
check(T.chartRotLive()===0, '按 → 动画结束后应归位 0，实际 '+T.chartRotLive());

// 90° 弧：端点 + 正确旋转（跨左上 270→360：A+逆时针 或 W+顺时针）
T.setupArc(); check(T.rotateArcTest(3,-1,-0.05)===true, '按 A（左端点）逆时针旋转应命中左上弧');
T.setupArc(); check(T.rotateArcTest(0,1,-0.05)===true, '按 W（上端点）顺时针旋转应命中左上弧');
T.setupArc(); check(T.rotateArcTest(0,-1,-0.05)===false, '按 W 逆时针（错误组合）不应命中');
T.setupArc(); check(T.rotateArcTest(3,-1,-0.25)===false, '端点按键过早（超过150ms）不应命中');
// 滑动：逆时针从 a0（左）起手，顺时针从 a1（上）起手
T.setupArc(); check(T.swipeArcTest(270,-1,-0.02,0)===true, '从左端点逆时针滑应命中');
T.setupArc(); check(T.swipeArcTest(0,1,-0.02,0)===true, '从上端点顺时针滑应命中');
T.setupArc(); check(T.swipeArcTest(270,1,-0.02,0)===false, '从左端点顺时针滑（错误方向）不应命中');

// hold 长按：起点命中、提前松开结束、按住到结束完成
T.holdSetup(0.02,1.5);
T.pressZone(0);
check(T.holdCount()===1, '按住方向键应开始 hold');
check(T.getScore()===100, 'hold 起点命中应得 100 分，实际 '+T.getScore());
P=100;
T.releaseHold(0);
check(T.holdCount()===0, '提前松开应结束 hold');
T.holdSetup(0.02,1.5);
T.pressZone(0);
P=2000;
T.releaseHold(0);
check(T.holdCount()===0, '按住到结束应完成 hold');

// kick：按住时到底线自动命中；未按住则漏
P=0;
T.kickSetup(true);
P=50;
lastRafCb(50);
check(T.getScore()===100, 'kick 按住时应自动命中，实际 '+T.getScore());
P=0;
T.kickSetup(false);
P=300;
lastRafCb(300);
check(T.getScore()===0 && T.getMiss()===1, 'kick 未按住时应判漏');

// 方位一致性：方向编号 0=上 1=右 2=下 3=左，必须与屏幕位置一致
{
  const p0=T.ptOnRing(0,100),p1=T.ptOnRing(90,100),p2=T.ptOnRing(180,100),p3=T.ptOnRing(270,100);
  const CY2=432; // 1280x800 布局下的中心 y
  check(p0.y<CY2,'方向0应在屏幕上方');
  check(p1.x>640,'方向1应在屏幕右方');
  check(p2.y>CY2,'方向2应在屏幕下方');
  check(p3.x<640,'方向3应在屏幕左方');
  check(T.zoneOf(0)===0&&T.zoneOf(90)===1&&T.zoneOf(180)===2&&T.zoneOf(270)===3,'方向编号与判定区域应一致');
}

// 完整流程：开始 → W 命中首音 → 快进结算
const keydown=docListeners.keydown[0];
P=0;
els['#btnStart'].listeners.click[0]();
lastRafCb(0);
keydown({repeat:false,code:'KeyW',preventDefault(){}}); // gt=-0.9 太早
P=940; // gt=0.04 → 命中 t=0 的"上"音符
keydown({repeat:false,code:'KeyW',preventDefault(){}});
lastRafCb(16);
check(els['#score'].textContent==='100','命中首音后得分应为 100，实际 '+els['#score'].textContent);
P=61000;
lastRafCb(61000);
check(!!els['#resScore'],'结算未出现');
console.log('score:',els['#resScore'].textContent,'| grade:',els['#grade'].textContent,'| judge:',els['#resJudge'].textContent);
console.log(issues? ('FAILS: '+issues) : 'RING OK');
process.exit(issues?1:0);
