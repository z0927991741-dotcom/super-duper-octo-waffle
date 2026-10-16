import {STREET_SNAPSHOT} from './street-snapshot.js';
// Geometry and shared node IDs come directly from OSM, never inferred from tile colors.
const NON_WALKABLE=/^(motorway|motorway_link|trunk|trunk_link|construction|proposed|raceway)$/;
export function streetGraph(elements){
 const nodes=new Map(),edges=[],links=new Map();
 for(const way of elements){
  const tags=way.tags||{},foot=tags.foot,explicit=['yes','designated','permissive'].includes(foot);
  if(way.type!=='way'||!tags.highway||NON_WALKABLE.test(tags.highway)||tags.area==='yes'||tags.indoor==='yes'||tags.highway==='corridor'||tags.tunnel==='building_passage'||['no','private'].includes(foot)||(!explicit&&['no','private'].includes(tags.access)))continue;
  if(!Array.isArray(way.nodes)||!Array.isArray(way.geometry)||way.nodes.length!==way.geometry.length)continue;
  for(let i=0;i<way.nodes.length;i++){const p=way.geometry[i];if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lon))nodes.set(way.nodes[i],{lat:p.lat,lng:p.lon});}
  for(let i=1;i<way.nodes.length;i++){
   const a=way.nodes[i-1],b=way.nodes[i];if(a===b||!nodes.has(a)||!nodes.has(b))continue;
   const edge={a,b,name:tags.name||'地圖道路',sourceWay:way.id};edges.push(edge);
   for(const id of [a,b]){if(!links.has(id))links.set(id,[]);links.get(id).push(edge);}
  }
 }
 if(!edges.length)throw Error('沒有可用的道路資料');return {nodes,edges,links};
}
const streetMeters=(a,b)=>Math.hypot((a.lng-b.lng)*Math.cos((a.lat+b.lat)*Math.PI/360),a.lat-b.lat)*111195;
const streetMix=(a,b,t)=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
export class StreetWalker {
 constructor(graph,start){
  this.graph=graph;let nearest=null;
  for(const edge of graph.edges){const a=graph.nodes.get(edge.a),b=graph.nodes.get(edge.b),c=Math.cos(start.lat*Math.PI/180),dx=(b.lng-a.lng)*c,dy=b.lat-a.lat,t=Math.max(0,Math.min(1,((start.lng-a.lng)*c*dx+(start.lat-a.lat)*dy)/(dx*dx+dy*dy||1))),point=streetMix(a,b,t),distance=streetMeters(start,point);if(!nearest||distance<nearest.distance)nearest={edge,t,distance};}
  if(!nearest||nearest.distance>200)throw Error('起點附近沒有可用道路');
  this.edge=nearest.edge;this.t=nearest.t;this.direction=1;this.node=null;this.turnIntent=null;
 }
 read(){if(this.node!==null)return {...this.graph.nodes.get(this.node),onRoad:true};return {...streetMix(this.graph.nodes.get(this.edge.a),this.graph.nodes.get(this.edge.b),this.t),onRoad:true};}
 move(x,y,budget){
  if(!x&&!y)return this.read();const n=Math.hypot(x,y),request={x:x/n,y:y/n};
  const direction=(a,b)=>{const dx=(b.lng-a.lng)*Math.cos(a.lat*Math.PI/180),dy=b.lat-a.lat,n=Math.hypot(dx,dy)||1;return {x:dx/n,y:dy/n};};
  for(let guard=0;budget>1e-7&&guard<200;guard++){
   if(this.node!==null){
    const steering=this.turnIntent&&this.turnIntent.x*request.x+this.turnIntent.y*request.y>.5?this.turnIntent:request;this.turnIntent=null;
    const p=this.graph.nodes.get(this.node),choices=(this.graph.links.get(this.node)||[]).map(edge=>{const q=this.graph.nodes.get(edge.a===this.node?edge.b:edge.a),d=direction(p,q);return {edge,score:d.x*steering.x+d.y*steering.y};}).filter(c=>c.score>.25).sort((a,b)=>b.score-a.score);
    if(!choices.length)break;this.edge=choices[0].edge;this.direction=this.edge.a===this.node?1:-1;this.t=this.direction===1?0:1;this.node=null;
   }
   const a=this.graph.nodes.get(this.edge.a),b=this.graph.nodes.get(this.edge.b),d=direction(a,b),dot=d.x*request.x+d.y*request.y;
   if(dot*this.direction<-.85){this.direction*=-1;this.turnIntent=null;}else if(Math.abs(dot)<.75)this.turnIntent=request;
   const length=streetMeters(a,b);if(length<1e-6){this.node=this.direction===1?this.edge.b:this.edge.a;continue;}
   const remaining=(this.direction===1?1-this.t:this.t)*length,step=Math.min(budget,remaining);this.t+=this.direction*step/length;budget-=step;
   if(remaining-step<1e-6){this.node=this.direction===1?this.edge.b:this.edge.a;this.t=this.direction===1?1:0;}
  }return this.read();
 }
}
let networkPromise;
export function cachedStreetGraph(){
 if(STREET_SNAPSHOT.elements?.length){const graph=streetGraph(STREET_SNAPSHOT.elements);graph.source={kind:'packaged',capturedAt:STREET_SNAPSHOT.capturedAt};return graph;}
 try{const cached=JSON.parse(localStorage.getItem('dream-mender:osm-streets:v2')||'null');if(cached?.version===1&&Array.isArray(cached.elements)&&cached.elements.length){const graph=streetGraph(cached.elements);graph.source={kind:'browser-cache',capturedAt:cached.capturedAt};return graph;}}catch{}
 return null;
}
export function loadStreetGraph(){
 if(networkPromise)return networkPromise;const cached=cachedStreetGraph();if(cached)return Promise.resolve(cached);
 const query='[out:json][timeout:20];way["highway"]["area"!="yes"](22.670,120.484,22.684,120.499);out geom;';
 networkPromise=(async()=>{
  for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
   try{const response=await fetch(endpoint+'?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(26000),credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('道路服務暫時無法使用');const data=await response.json(),graph=streetGraph(data.elements||[]);const capturedAt=new Date().toISOString();graph.source={kind:'live',capturedAt};try{localStorage.setItem('dream-mender:osm-streets:v2',JSON.stringify({version:1,capturedAt,osm3s:data.osm3s||null,source:endpoint,elements:data.elements}));}catch{}return graph;}catch{}
  }throw Error('道路資料載入失敗，請檢查網路後重試');
 })().catch(error=>{networkPromise=null;throw error;});return networkPromise;
}

export function exportStreetSnapshot(){
 const data=JSON.parse(localStorage.getItem('dream-mender:osm-streets:v2')||'null');
 if(!data?.elements?.length)throw Error('目前尚未取得完整 OSM 道路資料；地圖備援仍可操作。');
 streetGraph(data.elements);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='dream-mender-osm-roads.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
