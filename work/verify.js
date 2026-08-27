const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('work/game.js','utf8');

let P=0; // fake performance clock in ms
let lastRafCb=null;

const grad={addColorStop(){}};
const ctx={
  setTransform(){}, translate(){}, quadraticCurveTo(){}, createLinearGradient(){return grad;}, createRadialGradient(){return grad;},
  fillRect(){}, fill(){}, beginPath(){}, arc(){}, arcTo(){}, moveTo(){}, lineTo(){}, closePath(){},
  stroke(){}, fillText(){}, strokeRect(){}, clip(){}, save(){}, restore(){},
  fillStyle:'', strokeStyle:'', lineWidth:1, globalAlpha:1, font:'', textAlign:'', shadowColor:'', shadowBlur:0
};

function makeEl(id){
  const listeners={};
  return {
    id, textContent:'', innerHTML:'', offsetWidth:0,
    dataset:{},
    style:{setProperty(){}, width:'', background:''},
    classList:{add(){}, remove(){}, toggle(){}},
    addEventListener(type,cb){ (listeners[type]=listeners[type]||[]).push(cb); },
    appendChild(){}, getContext(){ return ctx; },
    getBoundingClientRect(){ return {left:0,top:0,width:100,height:100}; },
    listeners
  };
}

const els={};
function qs(sel){
  if(!els[sel]) els[sel]=makeEl(sel);
  return els[sel];
}
const docListeners={};
const document={
  querySelector:qs,
  querySelectorAll:()=>Array.from({length:8},()=>makeEl('generic')),
  createElement:()=>makeEl('created'),
  documentElement:{style:{setProperty(){}}},
  addEventListener(type,cb){ (docListeners[type]=docListeners[type]||[]).push(cb); },
  hidden:false
};

const sandbox={
  console,
  window:{addEventListener(){}},
  performance:{now:()=>P},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  requestAnimationFrame(cb){ lastRafCb=cb; },
  document,
  innerWidth:1280, innerHeight:800, devicePixelRatio:2
};

vm.createContext(sandbox);
vm.runInContext(code,sandbox,{filename:'ring-beat.js'});

const keydown=docListeners.keydown[0];
const pressKey=codeName=>keydown({repeat:false,code:codeName,preventDefault(){}});

// 1) 初始菜单帧
lastRafCb(0);
if(sandbox.document.querySelector('#trackList').listeners) console.log('menu built ok');

// 2) 开始游戏
els['#btnStart'].listeners.click[0]();
console.log('started: state=playing');

// 3) 太早按键
pressKey('KeyJ');

// 4) 在第一个音符时刻附近按键（t=0，游戏时钟起点 +0.9s）
P=940; // gt = 0.04 → perfect
pressKey('KeyA');

// 5) 再打一帧，确认 HUD 更新不报错
lastRafCb(16);
console.log('score after perfect:', els['#score'].textContent);

// 6) 快进到歌曲结束
P=61000;
lastRafCb(61000);
console.log('results score:', els['#resScore'].textContent);
console.log('grade:', els['#grade'].textContent);
console.log('judge:', els['#resJudge'].textContent);
console.log('OK: no runtime errors');
