import {chibiTileLayer} from './chibi-map.js';
import {playerArtwork,animatePlayer} from './player.js';
import {TASKS,officialReady,entranceReady} from './config.js';
import {positionIssue} from './geo.js';

// Only presentation uses Leaflet. Arrival always uses geo.js, never map pixels.
export class OsmMap {
 constructor(host,tasks,simulation=false,playerId='male'){
  this.playerId=playerId;this.motion={dx:0,dy:0,until:0};
  this.simulation=simulation;
  this.host=host;this.tasks=tasks;this.position=null;this.follow=true;this.centered=false;this.destroyed=false;this.tileErrors=0;
  host.innerHTML='<div class="osm-viewport" role="region" aria-label="OpenStreetMap 地圖，可拖曳或縮放"></div><button type="button" class="osm-follow">回到定位</button><p class="osm-status" role="status">啟用定位後顯示地圖；地圖需要網路。</p>';
  this.status=host.querySelector('.osm-status');
  if(simulation){this.waitingActor=document.createElement('div');this.waitingActor.className='waiting-actor';this.waitingActor.innerHTML=playerArtwork(playerId).replaceAll('player-opaque-','waiting-player-opaque-')+'<span>正在準備道路起點…</span>';host.append(this.waitingActor);}
  const L=window.L;
  if(!L){this.status.textContent='地圖元件未能載入，請重新開啟遊戲。';return;}
  this.map=L.map(host.querySelector('.osm-viewport'),{minZoom:3,maxZoom:19,zoomControl:true,attributionControl:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
  this.map.attributionControl.setPrefix(false);
  this.map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>');
  this.roadMaskVersion=0;this.roadAtlas=new Map();this.roadAtlasZoom=null;this.tiles=chibiTileLayer(L);
  this.tiles.on('tileload',event=>{this.roadMaskVersion++;if(!event.tile.roadMask)return;const c=event.coords;if(this.roadAtlasZoom===null)this.roadAtlasZoom=c.z;if(c.z===this.roadAtlasZoom)this.roadAtlas.set(c.x+':'+c.y,{x:c.x,y:c.y,mask:event.tile.roadMask.slice()});});
  this.tiles.on('loading',()=>{this.loading=true;this.tileErrors=0;this.tileStatus();});
  this.tiles.on('tileerror',()=>{this.tileErrors++;this.tileStatus();});
  this.tiles.on('load',()=>{this.loading=false;this.initialTilesLoaded=true;this.tileStatus();});
  this.map.on('dragstart',()=>{this.follow=false;});
  this.markers=L.layerGroup().addTo(this.map);this.arrivalCircles=new Map();this.arrivalLinks=new Map();this.arrivalDots=new Map();
  for(const task of tasks){
   if(officialReady(task))this.landmark(task.official,task.place+'・政府參考點','#967251',task);
   if(task.fieldPoint)this.landmark(task.fieldPoint,task.name+'・私人測試點','#7061a8',task);
   const target=simulation?(task.simTargetReady===false?null:task.test):task.fieldPoint||(entranceReady(task)?task.entrance:officialReady(task)?task.official:null);
   if(target){const reference=!simulation&&!task.fieldPoint&&!entranceReady(task);const label=reference?'30 公尺景點參考範圍・入口待確認':'30 公尺抵達範圍';this.arrivalCircles.set(task.id,L.circle([target.lat,target.lng],{radius:task.radiusMeters,color:reference?'#b17c35':'#9b6baf',weight:2.5,fillColor:reference?'#efca76':'#c9a7e2',fillOpacity:.2,dashArray:reference?'6 5':null,className:'arrival-radius'}).bindTooltip(label).addTo(this.map));}
   if(officialReady(task)&&entranceReady(task))this.landmark(task.entrance,task.place+'・安全入口','#3f8250');
  }
  const points=tasks.map(t=>t.fieldPoint||t.official).filter(Boolean);
  const bounds=points.length?points:TASKS.map(t=>t.official);
  this.map.fitBounds(bounds.map(p=>[p.lat,p.lng]),{padding:[45,65],maxZoom:17,animate:false});this.centered=true;this.tiles.addTo(this.map);
  if(simulation)host.querySelector('.osm-follow').textContent='回到模擬角色';
  host.querySelector('.osm-follow').onclick=()=>{this.follow=true;if(this.position&&!positionIssue(this.position)){this.map.setView([this.position.lat,this.position.lng],this.map.getZoom(),{animate:false});}};
  this.observer=new ResizeObserver(()=>{if(!this.destroyed&&host.clientWidth&&host.clientHeight)this.map.invalidateSize({pan:false});});this.observer.observe(host);
 }
 landmark(point,label,color,task){
  const content=document.createElement('div');const title=document.createElement('strong');title.textContent=label;content.append(title);
  const coordinates=document.createElement('p');coordinates.textContent=point.lat.toFixed(6)+', '+point.lng.toFixed(6);content.append(coordinates);
  if(task?.source){const link=document.createElement('a');link.href=task.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='政府座標來源（非安全入口） ↗';content.append(link);}
  const text=document.createElement('span');text.textContent=label;
  const marker=task?window.L.marker([point.lat,point.lng],{icon:window.L.divIcon({className:'osm-landmark',html:`<img alt="" src="./src/assets/${task.id}.png">`,iconSize:[52,52],iconAnchor:[26,42]})}):window.L.circleMarker([point.lat,point.lng],{radius:8,color,fillOpacity:.8});
  marker.bindTooltip(text,{direction:'top'}).bindPopup(content).addTo(this.map);
 }
 show(point){if(!this.map)return;this.map.setView([point.lat,point.lng],this.centered?this.map.getZoom():17,{animate:false});if(!this.centered){this.centered=true;this.tiles.addTo(this.map);}}
 preview(task){if(this.simulation&&task.test){this.follow=false;this.show(task.test);return;}if(task.fieldPoint){this.follow=false;this.show(task.fieldPoint);return;}if(!officialReady(task)){this.status.textContent='此景點中心尚未查證，暫不標示。';return;}this.follow=false;this.show(entranceReady(task)?task.entrance:task.official);}
 syncArrivalTasks(tasks){
  if(!this.simulation||!this.map)return;
  for(const task of tasks){
   if(task.simTargetReady===false||!task.test)continue;let circle=this.arrivalCircles.get(task.id);if(!circle){circle=window.L.circle([task.test.lat,task.test.lng],{radius:task.radiusMeters,color:'#9b6baf',weight:2.5,fillColor:'#c9a7e2',fillOpacity:.2,className:'arrival-radius'}).bindTooltip('固定 30 公尺模擬抵達範圍').addTo(this.map);this.arrivalCircles.set(task.id,circle);}
   const p=circle.getLatLng();if(p.lat!==task.test.lat||p.lng!==task.test.lng)circle.setLatLng([task.test.lat,task.test.lng]);
   if(task.simRoadTarget&&!this.arrivalLinks.has(task.id)){
    circle.setTooltipContent('30 公尺模擬抵達範圍・已外移至道路側');
    const link=window.L.polyline([[task.official.lat,task.official.lng],[task.test.lat,task.test.lng]],{color:'#9b6baf',weight:2,opacity:0,interactive:false}).addTo(this.map);
    this.arrivalDots.set(task.id,window.L.circleMarker([task.test.lat,task.test.lng],{radius:4,color:'#9b6baf',fillOpacity:1}).bindTooltip('模擬抵達點・非正式入口').addTo(this.map));
    this.arrivalLinks.set(task.id,link);
   }
   if(task.simRoadTarget){this.arrivalLinks.get(task.id)?.setLatLngs([[task.official.lat,task.official.lng],[task.test.lat,task.test.lng]]);this.arrivalDots.get(task.id)?.setLatLng([task.test.lat,task.test.lng]);}
  }
 }
 setPosition(position){
  const issue=positionIssue(position),key=JSON.stringify([position,issue]);if(this.lastKey===key)return;this.lastKey=key;
  const previous=this.position;this.position=position;if(!this.map)return;if(this.waitingActor)this.waitingActor.hidden=!!position?.onRoad&&!issue;
  if(!position||issue||(this.simulation&&!position.onRoad)){this.markers.clearLayers();this.actor=null;this.accuracyCircle=null;this.motion={dx:0,dy:0,until:0};this.tileStatus();return;}
  if(previous){const dx=position.lng-previous.lng,dy=position.lat-previous.lat;if(Math.hypot(dx,dy)>1e-10)this.motion={dx,dy,until:performance.now()+(this.simulation?220:900)};}
  const L=window.L,point=[position.lat,position.lng];
  if(this.follow&&(!this.simulation||this.initialTilesLoaded)){const p=this.map.latLngToContainerPoint(point),size=this.map.getSize();if(p.x<size.x*.25||p.x>size.x*.75||p.y<size.y*.25||p.y>size.y*.75)this.show(position);}
  if(!this.accuracyCircle)this.accuracyCircle=L.circle(point,{radius:position.accuracy,color:'#9b7656',weight:1,fillOpacity:.12,interactive:false,className:'osm-accuracy'}).addTo(this.markers);
  else this.accuracyCircle.setLatLng(point).setRadius(position.accuracy);
  if(!this.actor){
   const art=playerArtwork(this.playerId).replaceAll('player-opaque-','map-player-opaque-');
   this.actor=L.marker(point,{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'osm-player map-actor',html:'<div class="map-actor-body">'+art+'</div>'+(this.simulation?'':'<small>你</small>'),iconSize:[48,72],iconAnchor:[24,65]})}).addTo(this.markers);
  }else this.actor.setLatLng(point);
  this.tileStatus();
 }
 // Pixel masks use the unpainted OSM road colors, not the illustrated building colors.
 roadPixel(point){const z=this.roadAtlasZoom;if(!Number.isFinite(z))return null;const p=this.map.project([point.lat,point.lng],z),x=Math.floor(p.x),y=Math.floor(p.y),tx=Math.floor(x/256),ty=Math.floor(y/256),entry=this.roadAtlas.get(tx+':'+ty);return entry?{mask:entry.mask,index:(y-ty*256)*256+(x-tx*256)}:null;}
 isRoad(point){const pixel=this.roadPixel(point);return !!pixel?.mask[pixel.index];}

 nearestRoad(point,maxMeters=120){
  const z=this.roadAtlasZoom;if(!Number.isFinite(z))return null;
  const origin=this.map.project([point.lat,point.lng],z),scale=40075016.686*Math.cos(point.lat*Math.PI/180)/(256*2**z),radius=maxMeters/scale;let best=null;
  for(const tile of this.roadAtlas.values()){
   const ox=tile.x*256,oy=tile.y*256,mask=tile.mask;
   const minX=Math.max(0,Math.floor(origin.x-radius-ox)),maxX=Math.min(255,Math.ceil(origin.x+radius-ox)),minY=Math.max(0,Math.floor(origin.y-radius-oy)),maxY=Math.min(255,Math.ceil(origin.y+radius-oy));
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    if(!mask[y*256+x])continue;const d=(ox+x+.5-origin.x)**2+(oy+y+.5-origin.y)**2;
    if(d<=radius*radius&&(!best||d<best.d))best={x:ox+x+.5,y:oy+y+.5,d};
   }
  }
  if(!best)return null;const p=this.map.unproject([best.x,best.y],z);return {lat:p.lat,lng:p.lng};
 }
 reachableRoadTargets(tasks,origin,maxMeters=100){
  const z=this.roadAtlasZoom;if(z===null||!this.isRoad(origin))return {};const signature=JSON.stringify([maxMeters,tasks.map(t=>[t.id,t.official])]);
  const start=this.map.project([origin.lat,origin.lng],z),sx=Math.floor(start.x),sy=Math.floor(start.y),key=(x,y)=>x+':'+y;
  if(this.reachableTargets?.signature===signature&&this.reachableTargets.version===this.roadMaskVersion&&this.reachableTargets.visited.has(key(sx,sy)))return this.reachableTargets.targets;
  const pass=(x,y)=>{const tx=Math.floor(x/256),ty=Math.floor(y/256),tile=this.roadAtlas.get(tx+':'+ty);return !!tile?.mask[(y-ty*256)*256+x-tx*256];};
  const refs=tasks.map(task=>({id:task.id,p:this.map.project([task.official.lat,task.official.lng],z),best:null})),queue=[[sx,sy]],visited=new Set([key(sx,sy)]);
  for(let head=0;head<queue.length&&head<70000;head++){
   const [x,y]=queue[head];for(const ref of refs){const d=(x+.5-ref.p.x)**2+(y+.5-ref.p.y)**2;if(!ref.best||d<ref.best.d)ref.best={x:x+.5,y:y+.5,d};}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(visited.has(k)||!pass(nx,ny)||(dx&&dy&&(!pass(x+dx,y)||!pass(x,y+dy))))continue;visited.add(k);queue.push([nx,ny]);}
  }
  const targets={};for(const ref of refs){if(!ref.best)continue;const p=this.map.unproject([ref.best.x,ref.best.y],z),task=tasks.find(t=>t.id===ref.id);if(this.map.distance([p.lat,p.lng],[task.official.lat,task.official.lng])<=maxMeters)targets[ref.id]={lat:p.lat,lng:p.lng};}
  this.reachableTargets={signature,version:this.roadMaskVersion,visited,targets};return targets;
 }
 simulationStart(reference,fixedTarget){
  if(this.spawnSearchVersion===this.roadMaskVersion)return this.spawnSearchResult||null;
  this.spawnSearchVersion=this.roadMaskVersion;
  const z=this.roadAtlasZoom;if(z===null)return null;const center=this.map.project([reference.lat,reference.lng],z),scale=40075016.686*Math.cos(reference.lat*Math.PI/180)/(256*2**z),anchors=[];
  for(const tile of this.roadAtlas.values())for(let i=0;i<tile.mask.length;i++){
   if(!tile.mask[i])continue;const x=tile.x*256+i%256,y=tile.y*256+Math.floor(i/256),distance=Math.hypot(x+.5-center.x,y+.5-center.y)*scale;
   if(distance<=120)anchors.push({x,y,distance});
  }
  anchors.sort((a,b)=>a.distance-b.distance);const checked=new Set();
  for(const anchor of anchors){
   if(checked.has(anchor.x+':'+anchor.y))continue;const p=this.map.unproject([anchor.x+.5,anchor.y+.5],z);
   this.reachableRoadTargets([{id:'start',official:reference}],{lat:p.lat,lng:p.lng},250);
   const visited=this.reachableTargets?.visited;if(!visited)continue;let best=null;
   for(const key of visited){checked.add(key);const [x,y]=key.split(':').map(Number),q=this.map.unproject([x+.5,y+.5],z),distance=this.map.distance([q.lat,q.lng],[reference.lat,reference.lng]);
    if(distance<110||distance>200||fixedTarget&&this.map.distance([q.lat,q.lng],[fixedTarget.lat,fixedTarget.lng])<80)continue;
    const score=Math.abs(distance-140);if(!best||score<best.score)best={lat:q.lat,lng:q.lng,score};
   }
   if(best){this.spawnSearchResult={lat:best.lat,lng:best.lng};return this.spawnSearchResult;}
  }this.spawnSearchResult=null;return null;
 }

 roadStep(point,x,y,meters){
  const norm=Math.hypot(x,y);if(!norm||meters<=0)return point;let current={...point},remaining=Math.min(meters,5),angle=Math.atan2(y,x);
  while(remaining>1e-6){const step=Math.min(.25,remaining);let next=null;
   for(const offset of [0,Math.PI/12,-Math.PI/12,Math.PI/6,-Math.PI/6,Math.PI/4,-Math.PI/4,Math.PI/3,-Math.PI/3,Math.PI*5/12,-Math.PI*5/12,Math.PI/2,-Math.PI/2]){
    const a=angle+offset,candidate={lat:current.lat+Math.sin(a)*step/111195,lng:current.lng+Math.cos(a)*step/(111195*Math.cos(current.lat*Math.PI/180))};
    if(this.isRoad(candidate)&&this.isRoad({lat:current.lat,lng:candidate.lng})&&this.isRoad({lat:candidate.lat,lng:current.lng})){next=candidate;break;}
   }
   if(!next)break;current=next;remaining-=step;
  }return current;
 }
 rasterRoute(from,to){
  if(!this.isRoad(from)||!this.isRoad(to)||this.roadAtlasZoom===null)return null;
  const z=this.roadAtlasZoom,a=this.map.project([from.lat,from.lng],z),b=this.map.project([to.lat,to.lng],z),sx=Math.floor(a.x),sy=Math.floor(a.y),tx=Math.floor(b.x),ty=Math.floor(b.y);
  const key=(x,y)=>x+':'+y,pass=(x,y)=>{const bx=Math.floor(x/256),by=Math.floor(y/256),tile=this.roadAtlas.get(bx+':'+by);return !!tile?.mask[(y-by*256)*256+x-bx*256];};
  const queue=[[sx,sy]],seen=new Map([[key(sx,sy),null]]);let found=null;
  for(let head=0;head<queue.length&&head<45000;head++){
   const [x,y]=queue[head];if(x===tx&&y===ty){found=key(x,y);break;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(seen.has(k)||!pass(nx,ny)||(dx&&dy&&(!pass(x+dx,y)||!pass(x,y+dy))))continue;seen.set(k,key(x,y));queue.push([nx,ny]);}
  }
  if(!found)return null;const pixels=[];for(let k=found;k!==null;k=seen.get(k))pixels.push(k.split(':').map(Number));pixels.reverse();
  // Keep bends rather than simplifying across buildings.
  const kept=pixels.filter((p,i)=>i===0||i===pixels.length-1||p[0]-pixels[i-1][0]!==pixels[i+1][0]-p[0]||p[1]-pixels[i-1][1]!==pixels[i+1][1]-p[1]);
  const points=kept.map(p=>{const q=this.map.unproject([p[0]+.5,p[1]+.5],z);return {lat:q.lat,lng:q.lng};});
  let distance=0;for(let i=1;i<points.length;i++)distance+=this.map.distance([points[i-1].lat,points[i-1].lng],[points[i].lat,points[i].lng]);
  return {points,distance,street:'依地圖道路前進',source:'raster'};
 }
 setGuidance(route,task,message){
  if(!this.map)return;
  if(!this.routeNote){this.routeNote=document.createElement('p');this.routeNote.className='route-note';this.routeNote.setAttribute('role','status');this.host.append(this.routeNote);}
  this.routeNote.textContent=message;
  if(!route?.points?.length){this.routeLine?.remove();this.routeLine=null;return;}
  const target=this.simulation?task.test:task.fieldPoint||(entranceReady(task)?task.entrance:task.official);if(!this.position||!target)return;this.guidanceTarget=target;
  const points=route.points.map(p=>[p.lat,p.lng]);
  if(this.routeLine)this.routeLine.setLatLngs(points);else this.routeLine=window.L.polyline(points,{color:'#ae7540',weight:3,opacity:.9,dashArray:'8 6',interactive:false,className:'sim-route'}).addTo(this.map);
 }
 animate(now){const el=this.actor?.getElement();if(!el)return;const moving=now<this.motion.until;animatePlayer(el,this.playerId,moving?this.motion.dx:0,moving?this.motion.dy:0,now,matchMedia('(prefers-reduced-motion: reduce)').matches);}

 tileStatus(){
  if(this.destroyed)return;
  const issue=positionIssue(this.position);
  this.status.textContent=issue?issue+'；定位有效後顯示玩家位置。':this.tileErrors?'地圖未能完整載入，請確認網路；定位判定仍獨立運作。':this.loading?'正在載入 OpenStreetMap…':this.simulation?'Q 版街道・角色沿 OSM 道路行走；圓圈半徑 30 公尺。':'Q 版街道參考・不提供步行導航；小圓為定位誤差；景點圈半徑 30 公尺。';
 }
 destroy(){this.destroyed=true;this.observer?.disconnect();this.map?.remove();}
}
