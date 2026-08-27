const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('work/game.js','utf8');

const grad={addColorStop(){}};
const ctx={
  setTransform(){}, createLinearGradient(){return grad;}, createRadialGradient(){return grad;},
  fillRect(){}, fill(){}, beginPath(){}, arc(){}, arcTo(){}, moveTo(){}, lineTo(){}, closePath(){},
  stroke(){}, fillText(){}, strokeRect(){}, clip(){}, save(){}, restore(){},
  fillStyle:'', strokeStyle:'', lineWidth:1, globalAlpha:1, font:'', textAlign:'', shadowColor:'', shadowBlur:0
};
function makeEl(id){
  const listeners={};
  return {
    id, textContent:'', innerHTML:'', offsetWidth:0, dataset:{},
    style:{setProperty(){}, width:'', background:''},
    classList:{add(){}, remove(){}, toggle(){}},
    addEventListener(type,cb){ (listeners[type]=listeners[type]||[]).push(cb); },
    appendChild(){}, getContext(){ return ctx; },
    getBoundingClientRect(){ return {left:0,top:0,width:100,height:100}; }, listeners
  };
}
const els={};
const document={
  querySelector:s=>els[s]||(els[s]=makeEl(s)),
  querySelectorAll:()=>Array.from({length:8},()=>makeEl('g')),
  createElement:()=>makeEl('c'),
  documentElement:{style:{setProperty(){}}},
  addEventListener(){}, hidden:false
};
const sandbox={
  console,
  window:{addEventListener(){}, __NOVA_TEST__:{}},
  performance:{now:()=>0},
  localStorage:{getItem:()=>null,setItem(){}},
  requestAnimationFrame(){},
  document, innerWidth:1280, innerHeight:800, devicePixelRatio:2
};
vm.createContext(sandbox);
vm.runInContext(code,sandbox,{filename:'ring-beat.js'});
const T=sandbox.window.__NOVA_TEST__;

let issues=0;
function check(cond,msg){
  if(!cond){ console.log('FAIL:',msg); issues++; }
}

for(const def of T.TRACKS){
  for(const diff of ['easy','normal','hard']){
    const times=T.buildPattern(def.bpm,def.duration,diff,def.seed);
    check(times.length>20, def.id+'/'+diff+' 音符数量过少: '+times.length);
    const sorted=times.every((v,i)=>i===0||v>=times[i-1]);
    check(sorted, def.id+'/'+diff+' 时间未排序');
    check(times[times.length-1]<def.duration+0.1, def.id+'/'+diff+' 超出时长');
    // 最小间隔（排除同拍并音 0 间隔）
    let minGap=1e9;
    for(let i=1;i<times.length;i++){
      const g=times[i]-times[i-1];
      if(g>0.001 && g<minGap) minGap=g;
    }
    check(minGap>0.09, def.id+'/'+diff+' 非并音间隔过近: '+minGap.toFixed(3));
    // 同拍多音（并音/双压）
    const dups=times.filter((v,i)=>i>0&&v===times[i-1]).length;
    if(diff==='easy') check(dups===0, def.id+'/easy 不应有并音');
    else check(dups>0, def.id+'/'+diff+' 应有并音（双/三压）');
    // bars
    const bars=T.buildBars(times,0.9);
    check(bars.every(b=>b.start<b.t), def.id+'/'+diff+' bar start 应小于 t');
    // events
    const events=T.buildEvents(def.bpm,times,def);
    const sortedEv=events.every((e,i)=>i===0||e.t>=events[i-1].t);
    check(sortedEv, def.id+'/'+diff+' 音频事件未排序');
    const kicks=events.filter(e=>e.k==='kick').length;
    const distinctTimes=new Set(times).size;
    check(kicks===distinctTimes, def.id+'/'+diff+' kick 应等于去重后音符数: '+kicks+' vs '+distinctTimes);
    console.log(def.id+'/'+diff+': '+times.length+' 音符, 并音 '+dups+', 最小间隔 '+(minGap*1000|0)+'ms, kick '+kicks);
  }
}

// 双压交互：同一时刻两个音，快速按两次应都判定
const bpm=124, spb=60/bpm;
const times=[0,0,spb];
const bars=T.buildBars(times,0.9);
console.log('双压 bars start:', bars.map(b=>b.start.toFixed(2)), 't:', bars.map(b=>b.t.toFixed(2)));
check(bars[0].start===bars[1].start, '并音两个 bar 应同起点（同速读条）');
check(bars[2].start===0, '下一个音的起点应是上一音的 t');

process.exit(issues?1:0);
