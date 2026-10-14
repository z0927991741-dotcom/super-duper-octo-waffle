// 明確標示的測試步行路網；不是屏東實際道路。所有邊皆為公共步道的模擬資料。
export const ROAD_NODES = Object.fromEntries([-1,0,1].flatMap(y=>[-1,0,1].map(x=>[`${x},${y}`,{id:`${x},${y}`,lat:y*.00065,lng:x*.0007}])));
export const ROAD_EDGES = [];
for (const y of [-1,0,1]) for(const x of [-1,0]) ROAD_EDGES.push({id:`h${x}:${y}`,a:`${x},${y}`,b:`${x+1},${y}`,walkable:true});
for (const x of [-1,0,1]) for(const y of [-1,0]) ROAD_EDGES.push({id:`v${x}:${y}`,a:`${x},${y}`,b:`${x},${y+1}`,walkable:true});
const meters=(a,b)=>Math.hypot(a.lat-b.lat,a.lng-b.lng)*111195;
const mix=(a,b,t)=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
export class RoadWalker {
 constructor(){this.node='-1,-1';this.edge=null;this.t=0;this.direction=1;}
 read(){return this.edge?mix(ROAD_NODES[this.edge.a],ROAD_NODES[this.edge.b],this.t):{lat:ROAD_NODES[this.node].lat,lng:ROAD_NODES[this.node].lng};}
 move(x,y,budget){if(!x&&!y)return this.read();const requested=Math.abs(x)>Math.abs(y)?{x:Math.sign(x),y:0}:{x:0,y:Math.sign(y)};
  for(let guard=0;budget>1e-7&&guard<100;guard++){
   if(!this.edge){const p=ROAD_NODES[this.node];this.edge=ROAD_EDGES.find(e=>{if(!e.walkable||e.a!==this.node&&e.b!==this.node)return false;const q=ROAD_NODES[e.a===this.node?e.b:e.a];return (q.lng-p.lng)*requested.x+(q.lat-p.lat)*requested.y>0;});if(!this.edge)break;this.direction=this.edge.a===this.node?1:-1;this.t=this.direction===1?0:1;}
   const a=ROAD_NODES[this.edge.a],b=ROAD_NODES[this.edge.b];const along=(b.lng-a.lng)*requested.x+(b.lat-a.lat)*requested.y;
   // 轉向指令在下一個路口執行；始終沿目前路段走，不橫切街區。
   if(along!==0)this.direction=Math.sign(along);
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
