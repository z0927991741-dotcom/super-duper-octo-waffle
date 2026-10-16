import {buildingFootprints,segmentHitsBuilding} from './building-collision.js';
import {STREET_SNAPSHOT} from './street-snapshot.js';
// Geometry and shared node IDs come directly from OSM, never inferred from tile colors.
const NON_WALKABLE=/^(motorway|motorway_link|trunk|trunk_link|construction|proposed|raceway)$/;
export const GEOMETRY_BOUNDS={south:22.672,west:120.487,north:22.681,east:120.495};
export function streetGraph(elements,coverage=null){
 const nodes=new Map(),edges=[],links=new Map(),blocked=new Map(),buildings=buildingFootprints(elements);
 for(const way of elements){
  const tags=way.tags||{},foot=tags.foot,explicit=['yes','designated','permissive'].includes(foot);
  if(way.type!=='way'||!tags.highway||NON_WALKABLE.test(tags.highway)||tags.area==='yes'||tags.indoor==='yes'||tags.highway==='corridor'||tags.tunnel==='building_passage'||['no','private'].includes(foot)||(!explicit&&['no','private'].includes(tags.access)))continue;
  if(!Array.isArray(way.nodes)||!Array.isArray(way.geometry)||way.nodes.length!==way.geometry.length)continue;
  for(let i=0;i<way.nodes.length;i++){const p=way.geometry[i];if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lon))nodes.set(way.nodes[i],{lat:p.lat,lng:p.lon});}
  for(let i=1;i<way.nodes.length;i++){
   const a=way.nodes[i-1],b=way.nodes[i];if(a===b||!nodes.has(a)||!nodes.has(b))continue;
   const within=p=>!coverage||(p.lat>=coverage.south&&p.lat<=coverage.north&&p.lng>=coverage.west&&p.lng<=coverage.east),reason=!within(nodes.get(a))||!within(nodes.get(b))?'boundary':segmentHitsBuilding(nodes.get(a),nodes.get(b),buildings)?'building':null;
   if(reason){for(const [id,other] of [[a,b],[b,a]]){if(!blocked.has(id))blocked.set(id,[]);blocked.get(id).push({reason,to:nodes.get(other)});}continue;}
   const edge={a,b,name:tags.name||'地圖道路',kind:tags.highway,sourceWay:way.id};edges.push(edge);
   for(const id of [a,b]){if(!links.has(id))links.set(id,[]);links.get(id).push(edge);}
  }
 }
 if(!edges.length)throw Error('沒有可用的道路資料');return {nodes,edges,links,buildings,coverage,blocked};
}
const streetMeters=(a,b)=>Math.hypot((a.lng-b.lng)*Math.cos((a.lat+b.lat)*Math.PI/360),a.lat-b.lat)*111195;
const streetMix=(a,b,t)=>({lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t});
export class StreetWalker {
 constructor(graph,start){
  this.graph=graph;let nearest=null;
  for(const edge of graph.edges){const a=graph.nodes.get(edge.a),b=graph.nodes.get(edge.b),c=Math.cos(start.lat*Math.PI/180),dx=(b.lng-a.lng)*c,dy=b.lat-a.lat,t=Math.max(0,Math.min(1,((start.lng-a.lng)*c*dx+(start.lat-a.lat)*dy)/(dx*dx+dy*dy||1))),point=streetMix(a,b,t),distance=streetMeters(start,point);if(!nearest||distance<nearest.distance)nearest={edge,t,distance};}
  if(!nearest||nearest.distance>200)throw Error('起點附近沒有可用道路');
  this.edge=nearest.edge;this.t=nearest.t;this.direction=1;this.node=null;this.turnIntent=null;this.lastBlockReason='';
 }
 read(){if(this.node!==null)return {...this.graph.nodes.get(this.node),onRoad:true};return {...streetMix(this.graph.nodes.get(this.edge.a),this.graph.nodes.get(this.edge.b),this.t),onRoad:true};}
 move(x,y,budget){
  this.lastBlockReason='';if(!x&&!y)return this.read();const n=Math.hypot(x,y),request={x:x/n,y:y/n};
  const direction=(a,b)=>{const dx=(b.lng-a.lng)*Math.cos(a.lat*Math.PI/180),dy=b.lat-a.lat,n=Math.hypot(dx,dy)||1;return {x:dx/n,y:dy/n};};
  for(let guard=0;budget>1e-7&&guard<200;guard++){
   if(this.node!==null){
    const steering=this.turnIntent&&this.turnIntent.x*request.x+this.turnIntent.y*request.y>.5?this.turnIntent:request;this.turnIntent=null;
    const p=this.graph.nodes.get(this.node),choices=(this.graph.links.get(this.node)||[]).map(edge=>{const q=this.graph.nodes.get(edge.a===this.node?edge.b:edge.a),d=direction(p,q);return {edge,score:d.x*steering.x+d.y*steering.y};}).filter(c=>c.score>.25).sort((a,b)=>b.score-a.score);
    if(!choices.length){const barriers=(this.graph.blocked?.get(this.node)||[]).map(b=>{const d=direction(p,b.to);return {...b,score:d.x*steering.x+d.y*steering.y};}).filter(b=>b.score>.25).sort((a,b)=>b.score-a.score);this.lastBlockReason=barriers[0]?.reason||'road-end';break;}this.edge=choices[0].edge;this.direction=this.edge.a===this.node?1:-1;this.t=this.direction===1?0:1;this.node=null;
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
 if(STREET_SNAPSHOT.geometryVersion===3&&STREET_SNAPSHOT.elements?.length){const graph=streetGraph(STREET_SNAPSHOT.elements,STREET_SNAPSHOT.bounds||GEOMETRY_BOUNDS);graph.source={kind:'packaged',capturedAt:STREET_SNAPSHOT.capturedAt};return graph;}
 try{const cached=JSON.parse(localStorage.getItem('dream-mender:osm-geometry:v3')||'null');if(cached?.geometryVersion===3&&Array.isArray(cached.elements)&&cached.elements.length){const graph=streetGraph(cached.elements,cached.bounds||GEOMETRY_BOUNDS);graph.source={kind:'browser-cache',capturedAt:cached.capturedAt};return graph;}}catch{}
 return null;
}
export function parseOsmMapXml(text){
 const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror')||xml.documentElement.tagName!=='osm')throw Error('OSM 資料格式不正確');
 const tags=element=>Object.fromEntries([...element.children].filter(e=>e.tagName==='tag').map(e=>[e.getAttribute('k'),e.getAttribute('v')])),nodes=new Map(),ways=new Map(),elements=[];
 for(const node of xml.querySelectorAll('osm > node'))nodes.set(node.getAttribute('id'),{lat:Number(node.getAttribute('lat')),lon:Number(node.getAttribute('lon'))});
 for(const raw of xml.querySelectorAll('osm > way')){const ids=[...raw.children].filter(e=>e.tagName==='nd').map(e=>e.getAttribute('ref')),way={type:'way',id:Number(raw.getAttribute('id')),nodes:ids.map(Number),geometry:ids.map(id=>nodes.get(id)),tags:tags(raw)};if(way.geometry.some(p=>!p))throw Error('OSM 道路或建築物節點不完整');ways.set(String(way.id),way);elements.push(way);}
 for(const raw of xml.querySelectorAll('osm > relation')){const t=tags(raw);if(!t.building||t.type!=='multipolygon')continue;const members=[...raw.children].filter(e=>e.tagName==='member').map(e=>({type:e.getAttribute('type'),ref:Number(e.getAttribute('ref')),role:e.getAttribute('role'),geometry:ways.get(e.getAttribute('ref'))?.geometry}));if(members.some(m=>m.type==='way'&&!m.geometry))throw Error('OSM 建築物關係不完整');elements.push({type:'relation',id:Number(raw.getAttribute('id')),tags:t,members});}
 return {apiExport:true,elements,osm3s:{timestamp_osm_base:xml.documentElement.getAttribute('timestamp')||null}};
}
async function fetchMapGeometry(url,xml=false){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),26000);
 try{const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('地圖資料服務暫時無法使用');return xml?parseOsmMapXml(await response.text()):await response.json();}finally{clearTimeout(timer);}
}
export function loadStreetGraph(){
 if(networkPromise)return networkPromise;const cached=cachedStreetGraph();if(cached)return Promise.resolve(cached);
 const query='[out:json][timeout:25];(way["highway"]["area"!="yes"](22.672,120.487,22.681,120.495);way["building"]["building"!="no"](22.672,120.487,22.681,120.495);relation["building"]["type"="multipolygon"](22.672,120.487,22.681,120.495););out geom;';
 const sources=[{url:'https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query)},{url:'https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent(query)},{url:'https://api.openstreetmap.org/api/0.6/map?bbox=120.487,22.672,120.495,22.681',xml:true}];
 networkPromise=(async()=>{
  for(const source of sources){try{
   const data=await fetchMapGeometry(source.url,source.xml);if(data.remark||(!data.apiExport&&!data.osm3s?.timestamp_osm_base)||!data.elements?.some(e=>e.tags?.building&&e.tags.building!=='no'))throw Error('道路與建築物資料不完整');
   const graph=streetGraph(data.elements,GEOMETRY_BOUNDS),capturedAt=new Date().toISOString();graph.source={kind:'live',capturedAt};
   try{localStorage.setItem('dream-mender:osm-geometry:v3',JSON.stringify({version:1,geometryVersion:3,bounds:GEOMETRY_BOUNDS,capturedAt,apiExport:!!data.apiExport,osm3s:data.osm3s||null,source:source.url,elements:data.elements}));}catch{}return graph;
  }catch{}}
  throw Error('道路與建築物資料載入失敗，請按重新載入道路；角色暫停移動');
 })().catch(error=>{networkPromise=null;throw error;});return networkPromise;
}

export function exportStreetSnapshot(){
 const data=JSON.parse(localStorage.getItem('dream-mender:osm-geometry:v3')||'null');
 if(!data?.elements?.length)throw Error('目前尚未取得完整道路與建築物資料，請先重新載入道路。');
 streetGraph(data.elements);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='dream-mender-osm-roads.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
