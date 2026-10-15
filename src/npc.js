import {STORIES} from './stories.js';
export const NPCS={color:{name:'色彩引路人',greeting:'歡迎來到美術館。我替這裡保管著一些尚未醒來的顏色。'},gate:{name:'古城守夢人',greeting:'旅人，歡迎來到朝陽門。一起聽聽這座城門留下的記憶吧。'},book:{name:'書院說書人',greeting:'歡迎來到書院。散落的書頁裡，藏著這座城市的故事。'}};
export function npcDialogue(task){const npc=NPCS[task.id],story=STORIES[task.id];return [{title:'夢境中的相遇',text:npc.greeting},{title:story.title,text:story.fact,sourceName:story.sourceName,sourceUrl:story.sourceUrl},{title:'一起修補這段記憶',text:`${story.observe} 接下來，先觀看 ${task.length} 次圖案閃爍，再依序點擊。答錯也沒關係，可以重新觀看。`}];}
// Keep uploaded originals intact. SVG viewBox displays the relevant character frame.
export const NPC_ART={
 color:{portrait:{src:'./src/assets/npc/color-portrait-cutout.png',size:[1376,768],box:[490,35,335,733]},sheet:{src:'./src/assets/npc/color-sheet-cutout.png',size:[1253,848],box:[5,290,155,270]}},
 gate:{portrait:{src:'./src/assets/npc/gate-portrait-cutout.png',size:[1175,896],box:[395,20,540,860]},sheet:{src:'./src/assets/npc/gate-sheet-cutout.png',size:[1408,768],box:[5,277,139,227]}},
 book:{portrait:{src:'./src/assets/npc/book-portrait-cutout.png',size:[442,765],box:[25,10,390,745]},sheet:{src:'./src/assets/npc/book-sheet-cutout.png',size:[1253,848],box:[10,290,125,265]}}
};
export const NPC_WALK_FRAMES={color:[[275,0,160,280],[550,0,160,280],[825,0,160,280],[1093,0,160,280]],gate:[[0,27,117,223],[117,27,117,223],[587,27,117,223],[704,27,117,223]],book:[[135,5,140,280],[275,5,140,280],[415,5,140,280],[275,5,140,280]]};
export function npcArtwork(id,purpose){const source=NPC_ART[id][purpose==='walk'?'sheet':'portrait'];const art={...source,box:purpose==='walk'?NPC_WALK_FRAMES[id][0]:source.box};return `<svg class="npc-art" data-npc-art="${id}-${purpose}" viewBox="${art.box.join(' ')}" role="img" aria-label="${NPCS[id].name}${purpose==='walk'?'移動角色':'談話角色'}"><defs><filter id="npc-solid-${id}-${purpose}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter><clipPath id="npc-clip-${id}-${purpose}"><rect x="${art.box[0]}" y="${art.box[1]}" width="${art.box[2]}" height="${art.box[3]}"/></clipPath></defs><image filter="url(#npc-solid-${id}-${purpose})" preserveAspectRatio="none" clip-path="url(#npc-clip-${id}-${purpose})" href="${art.src}" width="${art.size[0]}" height="${art.size[1]}"/></svg>`;}

export function animateNpc(stage,id){
 if(!stage||stage.classList.contains('talking'))return;
 const walker=stage.querySelector('.npc-walker'),svg=walker.querySelector('svg');
 const elapsed=Number(walker.getAnimations()[0]?.currentTime)||0;
 const box=NPC_WALK_FRAMES[id][Math.floor(elapsed/170)%NPC_WALK_FRAMES[id].length];
 svg.setAttribute('viewBox',box.join(' '));const rect=svg.querySelector('clipPath rect');['x','y','width','height'].forEach((key,i)=>rect.setAttribute(key,box[i]));
 svg.style.transform=Math.floor(elapsed/9000)%2?'scaleX(-1)':'scaleX(1)';
}
