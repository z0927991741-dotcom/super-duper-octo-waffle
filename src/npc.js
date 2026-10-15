import {STORIES} from './stories.js';
export const NPCS={color:{name:'色彩引路人',greeting:'歡迎來到美術館。我替這裡保管著一些尚未醒來的顏色。'},gate:{name:'古城守夢人',greeting:'旅人，歡迎來到朝陽門。一起聽聽這座城門留下的記憶吧。'},book:{name:'書院說書人',greeting:'歡迎來到書院。散落的書頁裡，藏著這座城市的故事。'}};
const NPC_FACTS={color:'2022 年，美術館以「南方女神的逆襲」集結 56 名藝術家的作品，也與臺東、高雄交流典藏。看看入口與長窗，你發現對稱的地方了嗎？',gate:'阿猴城門也叫「朝陽門」。看看門額上的名字，以及紅磚、石牆和拱形門洞，找找它們和插畫的差異。',book:'《臺灣通史》記載，屏東書院位於「鳳山阿猴街」，於嘉慶二十年興建。「阿猴」這個舊地名，也出現在我們的旅程裡。'};
export const NPC_THANKS={color:'謝謝你！散落的色彩回來了，這座城市又多了一點光。',gate:'你守住了這段記憶。往後經過城門，也別忘了抬頭看看它。',book:'書頁終於接起來了。謝謝你，讓這裡的故事可以繼續被讀到。'};
export function npcDialogue(task){const npc=NPCS[task.id],story=STORIES[task.id];return [{title:'夢境中的相遇',text:npc.greeting},{title:story.title,text:NPC_FACTS[task.id],sourceName:story.sourceName,sourceUrl:story.sourceUrl},{title:'一起修補這段記憶',text:`先觀看 ${task.length} 次圖案閃爍，再依序點擊。答錯可以重新觀看，不必重新走到這裡。`}];}
const patrolTimes=new Map();
export function rememberNpc(stage,id){const time=stage?.querySelector('.npc-walker')?.getAnimations()[0]?.currentTime;if(typeof time==='number')patrolTimes.set(id,time);}
export function restoreNpc(stage,id){const animation=stage?.querySelector('.npc-walker')?.getAnimations()[0];if(animation)animation.currentTime=patrolTimes.get(id)||0;}
export function npcPatrolPose(elapsed){const t=((elapsed%20000)+20000)%20000;const returning=t>=10000;const travel=returning?t-11000:t-1000;return {returning,walking:travel>0&&travel<8000,frame:travel>0&&travel<8000?1+Math.floor(travel/180)%4:0};}
// Keep uploaded originals intact. SVG viewBox displays the relevant character frame.
export const NPC_ART={
 color:{portrait:{src:'./src/assets/npc/color-portrait-cutout.png',size:[1376,768],box:[490,35,335,733]},sheet:{src:'./src/assets/npc/color-sheet-cutout.png',size:[1253,848],box:[5,290,155,270]}},
 gate:{portrait:{src:'./src/assets/npc/gate-portrait-cutout.png',size:[1175,896],box:[395,20,540,860]},sheet:{src:'./src/assets/npc/gate-sheet-cutout.png',size:[1264,848],box:[0,0,170,280]}},
 book:{portrait:{src:'./src/assets/npc/book-portrait-cutout.png',size:[442,765],box:[25,10,390,745]},sheet:{src:'./src/assets/npc/book-sheet-cutout.png',size:[1253,848],box:[10,290,125,265]}}
};
export const NPC_WALK_FRAMES={color:[[5,0,160,280],[275,0,160,280],[540,0,160,280],[825,0,160,280],[1093,0,160,280]],gate:[[0,0,170,280],[275,0,170,280],[545,0,170,280],[815,0,170,280],[1085,0,170,280]],book:[[0,0,160,280],[270,0,160,280],[545,0,160,280],[825,0,160,280],[1093,0,160,280]]};
export function npcArtwork(id,purpose){const source=NPC_ART[id][purpose==='walk'?'sheet':'portrait'];const art={...source,box:purpose==='walk'?NPC_WALK_FRAMES[id][0]:source.box};return `<svg class="npc-art" data-npc-art="${id}-${purpose}" viewBox="${art.box.join(' ')}" role="img" aria-label="${NPCS[id].name}${purpose==='walk'?'移動角色':'談話角色'}"><defs><filter id="npc-solid-${id}-${purpose}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter><clipPath id="npc-clip-${id}-${purpose}"><rect x="${art.box[0]}" y="${art.box[1]}" width="${art.box[2]}" height="${art.box[3]}"/></clipPath></defs><image filter="url(#npc-solid-${id}-${purpose})" preserveAspectRatio="none" clip-path="url(#npc-clip-${id}-${purpose})" href="${art.src}" width="${art.size[0]}" height="${art.size[1]}"/></svg>`;}

export function animateNpc(stage,id){
 if(!stage||stage.classList.contains('talking'))return;
 const walker=stage.querySelector('.npc-walker'),svg=walker.querySelector('svg');
 const elapsed=Number(walker.getAnimations()[0]?.currentTime)||0;
 const pose=npcPatrolPose(elapsed);const box=NPC_WALK_FRAMES[id][pose.frame];patrolTimes.set(id,elapsed);walker.dataset.walking=String(pose.walking);walker.dataset.frame=String(pose.frame);walker.dataset.direction=pose.returning?'left':'right';
 svg.setAttribute('viewBox',box.join(' '));const rect=svg.querySelector('clipPath rect');['x','y','width','height'].forEach((key,i)=>rect.setAttribute(key,box[i]));
 svg.style.transform=pose.returning?'scaleX(-1)':'scaleX(1)';
}

// Portrait camera crops in each source image's logical coordinates.
export const NPC_DIALOGUE_SHOTS={
 color:[[490,35,335,560],[560,35,270,355],[600,35,190,225]],
 gate:[[395,20,540,680],[440,20,360,455],[480,20,240,300]],
 book:[[25,10,390,590],[90,10,270,370],[130,10,180,250]]
};
export function focusNpc(svg,id,page,previous){
 if(!svg)return;const target=NPC_DIALOGUE_SHOTS[id][page];const from=previous||NPC_ART[id].portrait.box;
 svg.dataset.shot=String(page);svg.setAttribute('viewBox',target.join(' '));
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const start=performance.now();const tick=now=>{if(!svg.isConnected)return;const t=Math.min(1,(now-start)/650),ease=1-(1-t)**3;svg.setAttribute('viewBox',target.map((v,i)=>from[i]+(v-from[i])*ease).join(' '));if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
}
