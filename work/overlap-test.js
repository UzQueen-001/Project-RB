const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('work/game.js','utf8');

const grad={addColorStop(){}};
const ctx={setTransform(){},translate(){},quadraticCurveTo(){},createLinearGradient(){return grad;},createRadialGradient(){return grad;},fillRect(){},fill(){},beginPath(){},arc(){},arcTo(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fillText(){},strokeRect(){},clip(){},save(){},restore(){},fillStyle:'',strokeStyle:'',lineWidth:1,globalAlpha:1,font:'',textAlign:'',shadowColor:'',shadowBlur:0};
function makeEl(id){const listeners={};return{id,textContent:'',innerHTML:'',offsetWidth:0,dataset:{},style:{setProperty(){},width:'',background:''},classList:{add(){},remove(){},toggle(){}},addEventListener(type,cb){(listeners[type]=listeners[type]||[]).push(cb);},appendChild(){},getContext(){return ctx;},getBoundingClientRect(){return{left:0,top:0,width:100,height:100};},listeners};}
const els={};
const document={querySelector:s=>els[s]||(els[s]=makeEl(s)),querySelectorAll:()=>Array.from({length:8},()=>makeEl('g')),createElement:()=>makeEl('c'),documentElement:{style:{setProperty(){}}},addEventListener(){},hidden:false};
const sandbox={console,window:{addEventListener(){},__NOVA_TEST__:{}},performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(){},document,innerWidth:1280,innerHeight:800,devicePixelRatio:2};
vm.createContext(sandbox);
vm.runInContext(code,sandbox,{filename:'ring-beat.js'});
const T=sandbox.window.__NOVA_TEST__;

let issues=0;
function check(cond,msg){
  if(!cond){ console.log('FAIL:',msg); issues++; }
}

for(const def of T.TRACKS){
  const spb=60/def.bpm;
  for(const diff of ['easy','normal','hard']){
    const times=T.buildPattern(def.bpm,def.duration,diff,def.seed);
    check(times.length>20, def.id+'/'+diff+' 音符过少: '+times.length);
    check(times[0]===0, def.id+'/'+diff+' 首音应在 0');
    check(times.every((v,i)=>i===0||v>times[i-1]-1e-9), def.id+'/'+diff+' 时间应单调');
    check(new Set(times).size===times.length, def.id+'/'+diff+' 不应有同刻重复音（单线轨道）');
    let minGap=1e9, hasRest=false, hasHalf=false, has16th=false;
    for(let i=1;i<times.length;i++){
      const g=times[i]-times[i-1];
      if(g<minGap) minGap=g;
      if(Math.abs(g-2*spb)<1e-6) hasRest=true;
      if(Math.abs(g-spb/2)<1e-6) hasHalf=true;
      if(Math.abs(g-spb/4)<1e-6) has16th=true;
    }
    check(minGap>=spb/4-1e-6, def.id+'/'+diff+' 最小间隔应 ≥ 十六分: '+(minGap*1000|0)+'ms');
    if(diff==='easy') check(!hasHalf&&!has16th, def.id+'/easy 不应有插拍');
    else check(hasHalf, def.id+'/'+diff+' 应有半拍插音');
    if(diff==='normal') check(hasRest, def.id+'/normal 应有休止');
    if(diff==='hard') check(has16th, def.id+'/hard 应有十六分插音');
    // 音频事件与音符一一对应
    const events=T.buildEvents(def.bpm,times,def);
    check(events.every((e,i)=>i===0||e.t>=events[i-1].t-1e-9), def.id+'/'+diff+' 音频事件未排序');
    const kicks=events.filter(e=>e.k==='kick').length;
    check(kicks===times.length, def.id+'/'+diff+' kick 数应等于音符数: '+kicks+' vs '+times.length);
    console.log(def.id+'/'+diff+': '+times.length+' 音符, 最小间隔 '+(minGap*1000|0)+'ms, 休止 '+hasRest+', 半拍 '+hasHalf+', 十六分 '+has16th);
  }
  // 轨道：固定、闭合、在屏幕内
  const path=T.buildPath(def);
  check(path.length===32, def.id+' 轨道应有 32 个路径点');
  check(path.every(p=>p.x>=-10&&p.x<=1290&&p.y>=-10&&p.y<=810), def.id+' 轨道应在屏幕内');
  const d0=Math.hypot(path[0].x-path[path.length-1].x,path[0].y-path[path.length-1].y);
  check(d0<120, def.id+' 轨道应闭合（首尾弦距过大: '+d0.toFixed(0)+'）');
}

// NEON SKY 音乐结构（保持不变）
const neon=T.TRACKS[0];
const song=T.buildNeonSong(neon.bpm);
check(song.length>200, 'NEON 音乐事件过少');
check(song.every((e,i)=>i===0||e.t>=song[i-1].t-1e-9), 'NEON 事件未排序');
const kinds=new Set(song.map(e=>e.k));
for(const k of ['kick','snare','hat','bass','lead','pad','riser']) check(kinds.has(k), 'NEON 缺少乐器: '+k);
console.log('NEON 音乐: '+song.length+' 事件');

process.exit(issues?1:0);
