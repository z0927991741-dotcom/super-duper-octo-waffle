import {refineStreetLayout} from './map-detail.js';
// 依使用者地圖截圖整理的遊戲示意路網；不是查證後的道路測繪資料。
// 圖上像素對應到虛構經緯度，只供模擬模式運算。
export const MAP_LAYOUT = {
 nodes:{nw:[360,140],book:[570,195],ne:[870,270],west:[260,515],gate:[450,562],east:[770,645],color:[180,775],park:[500,860],southeast:[710,915],start:[120,960],farwest:[-210,780],westnorth:[-40,335],northwest:[170,-150],north:[640,-80],northeast:[1150,110],fareast:[1230,590],eastpark:[1120,1150],south:[590,1310],southwest:[-140,1160]},
 links:[['nw','book','勝利東路'],['book','ne','勝利東路'],['nw','west','中山路'],['west','color','中山路'],['color','start','中山路'],['west','gate','公園北側道路'],['gate','east','公園北側道路'],['ne','east','仁愛路'],['east','southeast','仁愛路'],['color','park','公園路'],['park','southeast','公園路'],['farwest','westnorth','街區西側道路'],['westnorth','northwest','街區西側道路'],['northwest','north','北側街道'],['north','northeast','北側街道'],['northeast','fareast','街區東側道路'],['fareast','eastpark','街區東側道路'],['eastpark','south','南側街道'],['south','southwest','南側街道'],['southwest','farwest','街區西側道路'],['farwest','color','西側連接道'],['westnorth','west','西側連接道'],['north','book','北側連接道'],['ne','northeast','東北連接道'],['east','fareast','東側連接道'],['southeast','eastpark','東側連接道'],['start','southwest','西南連接道'],['park','south','公園南側連接道']]
};
export const MAP_BLOCKS=refineStreetLayout(MAP_LAYOUT);
export const ROAD_NODES=Object.fromEntries(Object.entries(MAP_LAYOUT.nodes).map(([id,[x,y]])=>[id,{id,lng:x*.0000025,lat:(1000-y)*.000003}]));
export const ROAD_EDGES=MAP_LAYOUT.links.map(([a,b,name,kind='street'],i)=>({kind,id:'road-'+i,a,b,name,walkable:true}));
const meters=(a,b)=>Math.hypot(a.lat-b.lat,a.lng-b.lng)*111195;
const mix=(a,b,t)=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
export class RoadWalker {
 constructor(){this.node='start';this.edge=null;this.t=0;this.direction=1;}
 read(){return this.edge?mix(ROAD_NODES[this.edge.a],ROAD_NODES[this.edge.b],this.t):{lat:ROAD_NODES[this.node].lat,lng:ROAD_NODES[this.node].lng};}
 move(x,y,budget){if(!x&&!y)return this.read();const norm=Math.hypot(x,y);const requested={x:x/norm,y:y/norm};
  for(let guard=0;budget>1e-7&&guard<100;guard++){
   if(!this.edge){const p=ROAD_NODES[this.node];const choices=ROAD_EDGES.filter(e=>e.walkable&&(e.a===this.node||e.b===this.node)).map(e=>{const q=ROAD_NODES[e.a===this.node?e.b:e.a];const dx=q.lng-p.lng,dy=q.lat-p.lat;return {edge:e,score:(dx*requested.x+dy*requested.y)/Math.hypot(dx,dy)};}).filter(c=>c.score>.35).sort((a,b)=>b.score-a.score);this.edge=choices[0]?.edge;if(!this.edge)break;this.direction=this.edge.a===this.node?1:-1;this.t=this.direction===1?0:1;}
   const a=ROAD_NODES[this.edge.a],b=ROAD_NODES[this.edge.b];const along=(b.lng-a.lng)*requested.x+(b.lat-a.lat)*requested.y;
   // 轉向指令在下一個路口執行；始終沿目前路段走，不橫切街區。
   if(Math.abs(along)/Math.hypot(b.lng-a.lng,b.lat-a.lat)>.65)this.direction=Math.sign(along);
   const length=meters(a,b),remaining=(this.direction===1?1-this.t:this.t)*length;
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
