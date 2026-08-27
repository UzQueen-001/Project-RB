const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('work/game.js','utf8');

let P=0, lastRafCb=null;
const grad={addColorStop(){}};
const ctx={setTransform(){},createLinearGradient(){return grad;},createRadialGradient(){return grad;},fillRect(){},fill(){},beginPath(){},arc(){},arcTo(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fillText(){},strokeRect(){},clip(){},save(){},restore(){},fillStyle:'',strokeStyle:'',lineWidth:1,globalAlpha:1,font:'',textAlign:'',shadowColor:'',shadowBlur:0};
function makeEl(id){const listeners={};return{id,textContent:'',innerHTML:'',offsetWidth:0,dataset:{},style:{setProperty(){},width:'',background:''},classList:{add(){},remove(){},toggle(){}},addEventListener(type,cb){(listeners[type]=listeners[type]||[]).push(cb);},appendChild(){},getContext(){return ctx;},getBoundingClientRect(){return{left:0,top:0,width:100,height:100};},listeners};}
const els={};
const docListeners={};
const document={
  querySelector:s=>els[s]||(els[s]=makeEl(s)),
  querySelectorAll:()=>Array.from({length:8},()=>makeEl('g')),
  createElement:()=>makeEl('c'),
  documentElement:{style:{setProperty(){}}},
  addEventListener(type,cb){(docListeners[type]=docListeners[type]||[]).push(cb);},
  hidden:false
};
const sandbox={console,window:{addEventListener(){}},performance:{now:()=>P},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame(cb){lastRafCb=cb;},document,innerWidth:1280,innerHeight:800,devicePixelRatio:2};
vm.createContext(sandbox);
vm.runInContext(code,sandbox,{filename:'nova-beat.js'});

const keydown=docListeners.keydown[0];
console.log('keydown listeners:',docListeners.keydown.length);
const pressKey=codeName=>keydown({repeat:false,code:codeName,preventDefault(){}});

els['#btnStart'].listeners.click[0]();
console.log('after start: hud hidden?',els['#hud'].classList);
console.log('trackLabel:',els['#trackLabel'].textContent);

P=940;
pressKey('KeyA');
console.log('after press: score el exists?',!!els['#score']);
console.log('judgments text el created?', !!els['#combo']);

P=950;
lastRafCb(950);
console.log('after frame: score=',els['#score']&&els['#score'].textContent,'combo=',els['#combo']&&els['#combo'].textContent);

P=61000;
lastRafCb(61000);
console.log('after finish: resScore el?',!!els['#resScore'],'grade=',els['#grade']&&els['#grade'].textContent);
