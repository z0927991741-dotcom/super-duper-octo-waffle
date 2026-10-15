import {TASKS,SETTINGS} from '../src/config.js';
import {ROAD_NODES,ROAD_EDGES} from '../src/roads.js';
import {NPCS,NPC_ART,NPC_WALK_FRAMES,NPC_DIALOGUE_SHOTS,npcDialogue} from '../src/npc.js';
import {PLAYERS} from '../src/player.js';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
await mkdir('native/data',{recursive:true});await mkdir('native/assets',{recursive:true});
await writeFile('native/data/game.json',JSON.stringify({tasks:TASKS.map(t=>({...t,npc:NPCS[t.id],dialogue:npcDialogue(t),art:NPC_ART[t.id],frames:NPC_WALK_FRAMES[t.id],shots:NPC_DIALOGUE_SHOTS[t.id]})),settings:SETTINGS,nodes:ROAD_NODES,edges:ROAD_EDGES,players:PLAYERS},null,2));
for(const id of ['color','gate','book']){await copyFile(`src/assets/${id}.png`,`native/assets/${id}.png`);for(const kind of ['portrait','sheet'])await copyFile(`src/assets/npc/${id}-${kind}-cutout.png`,`native/assets/${id}-${kind}.png`);}
for(const id of ['male','female'])for(const kind of ['portrait','sheet'])await copyFile(`src/assets/player/${id}-${kind}.png`,`native/assets/${id}-${kind}.png`);
