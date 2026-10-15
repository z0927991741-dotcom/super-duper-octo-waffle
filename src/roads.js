import {SETTINGS,MAP_ANCHORS} from './config.js';
import {refineStreetLayout} from './map-detail.js';
// 依使用者地圖截圖整理的遊戲示意路網；不是查證後的道路測繪資料。
// 圖上像素對應到虛構經緯度，只供模擬模式運算。
export const MAP_LAYOUT = {
 nodes:structuredClone(MAP_ANCHORS),
 links:[['nw','bookRoad','勝利東路'],['bookRoad','ne','勝利東路'],['bookRoad','book','書院入口'],['nw','west','中山路'],['west','color','中山路'],['color','start','中山路'],['west','gate','濟南街'],['gate','east','公園北側道路'],['ne','east','仁愛路'],['east','southeast','仁愛路'],['color','park','公園路'],['park','southeast','公園路'],['farwest','westnorth','街區西側道路'],['westnorth','northwest','街區西側道路'],['northwest','north','北側街道'],['north','northeast','北側街道'],['northeast','fareast','街區東側道路'],['fareast','eastpark','街區東側道路'],['eastpark','south','南側街道'],['south','southwest','南側街道'],['southwest','farwest','街區西側道路'],['farwest','color','西側連接道'],['westnorth','west','西側連接道'],['north','book','北側連接道'],['ne','northeast','東北連接道'],['east','fareast','東側連接道'],['southeast','eastpark','東側連接道'],['start','southwest','西南連接道'],['park','south','中華路'],['ne','freeMid','自由路'],['freeMid','freeSouth','自由路'],['freeSouth','south','民生路'],['east','freeMid','民生路'],['freeMid','fareast','廣東路189巷'],['ne','libraryEntry','勝利東路'],['libraryEntry','library','千禧公園步道','path'],['library','northeast','圖書館園區步道','path'],['southwest','temple','慈鳳宮前道路'],['temple','south','民生路']]
};
export const MAP_BLOCKS=refineStreetLayout(MAP_LAYOUT);
export const ROAD_NODES=Object.fromEntries(Object.entries(MAP_LAYOUT.nodes).map(([id,[x,y]])=>[id,{id,lng:x*.0000025,lat:(1000-y)*.000003}]));
export const ROAD_EDGES=MAP_LAYOUT.links.map(([a,b,name,kind='street'],i)=>({kind,id:'road-'+i,a,b,name,walkable:true}));
const meters=(a,b)=>Math.hypot(a.lat-b.lat,a.lng-b.lng)*111195;
const mix=(a,b,t)=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
export class RoadWalker {
 constructor(){this.node='start';this.edge=null;this.t=0;this.direction=1;this.turnIntent=null;}
 read(){return this.edge?mix(ROAD_NODES[this.edge.a],ROAD_NODES[this.edge.b],this.t):{lat:ROAD_NODES[this.node].lat,lng:ROAD_NODES[this.node].lng};}
 move(x,y,budget){if(!x&&!y){this.turnIntent=null;return this.read();}const norm=Math.hypot(x,y);const requested={x:x/norm,y:y/norm};
  for(let guard=0;budget>1e-7&&guard<100;guard++){
   if(!this.edge){const steering=this.turnIntent&&this.turnIntent.x*requested.x+this.turnIntent.y*requested.y>.5?this.turnIntent:requested;this.turnIntent=null;const p=ROAD_NODES[this.node];const choices=ROAD_EDGES.filter(e=>e.walkable&&(e.a===this.node||e.b===this.node)).map(e=>{const q=ROAD_NODES[e.a===this.node?e.b:e.a];const dx=q.lng-p.lng,dy=q.lat-p.lat;return {edge:e,score:(dx*steering.x+dy*steering.y)/Math.hypot(dx,dy)};}).filter(c=>c.score>SETTINGS.minimumTurnDot).sort((a,b)=>b.score-a.score);this.edge=choices[0]?.edge;if(!this.edge)break;this.direction=this.edge.a===this.node?1:-1;this.t=this.direction===1?0:1;}
   const a=ROAD_NODES[this.edge.a],b=ROAD_NODES[this.edge.b];const along=(b.lng-a.lng)*requested.x+(b.lat-a.lat)*requested.y;
   // 轉向指令在下一個路口執行；始終沿目前路段走，不橫切街區。
   const forwardDot=along/Math.hypot(b.lng-a.lng,b.lat-a.lat)*this.direction;
   const origin=ROAD_NODES[this.node];
   const leavingOrigin=(this.edge.a===this.node&&this.direction===1)||(this.edge.b===this.node&&this.direction===-1);
   // A diagonal key pair or joystick turn can arrive over two frames. Within 3 m,
   // retrace to the junction before taking the better branch; never cut the corner.
   let correcting=false;
   if(leavingOrigin&&meters(origin,this.read())<=SETTINGS.turnCorrectionMeters){
    const better=ROAD_EDGES.some(e=>{if(e.id===this.edge.id||e.a!==this.node&&e.b!==this.node)return false;const q=ROAD_NODES[e.a===this.node?e.b:e.a],dx=q.lng-origin.lng,dy=q.lat-origin.lat;const score=(dx*requested.x+dy*requested.y)/Math.hypot(dx,dy);return score>.8&&score>forwardDot+.25;});
    if(better){this.direction*=-1;this.turnIntent=requested;correcting=true;}
   }
   if(!correcting&&forwardDot < -SETTINGS.reverseDotThreshold){this.direction*=-1;this.turnIntent=null;}
   const length=meters(a,b),remaining=(this.direction===1?1-this.t:this.t)*length;
   if(remaining<=SETTINGS.turnBufferMeters&&forwardDot<.8&&forwardDot>-.5)this.turnIntent=requested;
   const step=Math.min(budget,remaining);this.t+=this.direction*step/length;budget-=step;
   if(remaining-step<1e-6){this.node=this.direction===1?this.edge.b:this.edge.a;this.edge=null;this.t=0;}else break;
  }return this.read();
 }
}
export function roadRoute(position,targetNode){
 if(!position||!ROAD_NODES[targetNode])return null;
 const distances=new Map(),paths=new Map();
 for(const edge of ROAD_EDGES){if(!edge.walkable)continue;const a=ROAD_NODES[edge.a],b=ROAD_NODES[edge.b],dx=b.lng-a.lng,dy=b.lat-a.lat;
 const t=Math.max(0,Math.min(1,((position.lng-a.lng)*dx+(position.lat-a.lat)*dy)/(dx*dx+dy*dy)));const p=mix(a,b,t);
 if(meters(p,position)>.6)continue;
 for(const id of [edge.a,edge.b]){const d=meters(p,ROAD_NODES[id]);if(d<(distances.get(id)??Infinity)){distances.set(id,d);paths.set(id,[position,ROAD_NODES[id]]);}}
 }
 const visited=new Set();while(true){const next=[...distances].filter(([id])=>!visited.has(id)).sort((a,b)=>a[1]-b[1])[0];if(!next)return null;const [id,d]=next;if(id===targetNode)return {distance:d,points:paths.get(id)};visited.add(id);
 for(const e of ROAD_EDGES){if(!e.walkable||e.a!==id&&e.b!==id)continue;const other=e.a===id?e.b:e.a;const nd=d+meters(ROAD_NODES[id],ROAD_NODES[other]);if(nd<(distances.get(other)??Infinity)){distances.set(other,nd);paths.set(other,[...paths.get(id),ROAD_NODES[other]]);}}
 }
}
