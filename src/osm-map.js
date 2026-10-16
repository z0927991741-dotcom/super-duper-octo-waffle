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
  this.tiles=chibiTileLayer(L);
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
  if(this.follow&&(!this.simulation||this.initialTilesLoaded||this.drawnScene)){const p=this.map.latLngToContainerPoint(point),size=this.map.getSize();if(p.x<size.x*.25||p.x>size.x*.75||p.y<size.y*.25||p.y>size.y*.75)this.show(position);}
  if(!this.accuracyCircle)this.accuracyCircle=L.circle(point,{radius:position.accuracy,color:'#9b7656',weight:1,fillOpacity:.12,interactive:false,className:'osm-accuracy'}).addTo(this.markers);
  else this.accuracyCircle.setLatLng(point).setRadius(position.accuracy);
  if(!this.actor){
   const art=playerArtwork(this.playerId).replaceAll('player-opaque-','map-player-opaque-');
   this.actor=L.marker(point,{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'osm-player map-actor',html:'<div class="map-actor-body">'+art+'</div>'+(this.simulation?'':'<small>你</small>'),iconSize:[48,72],iconAnchor:[24,65]})}).addTo(this.markers);
  }else this.actor.setLatLng(point);
  this.tileStatus();
 }
 setStreetScene(scene){
  if(!this.map||this.drawnScene===scene)return;this.drawnScene=scene;this.streetGeometry?.remove();const L=window.L;this.streetGeometry=L.layerGroup().addTo(this.map);
  for(const polygon of scene.graph.buildings||[]){const rings=[polygon.outer,...polygon.holes].map(r=>r.map(p=>[p.lat,p.lng]));L.polygon(rings,{color:'#a98f72',weight:1,fillColor:'#e1c8ad',fillOpacity:.6,interactive:false}).addTo(this.streetGeometry);}
  for(const edge of scene.graph.edges){const a=scene.graph.nodes.get(edge.a),b=scene.graph.nodes.get(edge.b),points=[[a.lat,a.lng],[b.lat,b.lng]],path=['footway','path','steps','cycleway','pedestrian'].includes(edge.kind);L.polyline(points,{color:'#eadfc8',weight:path?6:11,lineCap:'round',interactive:false}).addTo(this.streetGeometry);L.polyline(points,{color:'#fff8e8',weight:path?3:7,lineCap:'round',interactive:false}).addTo(this.streetGeometry);}
  if(scene.graph.coverage){const c=scene.graph.coverage;L.rectangle([[c.south,c.west],[c.north,c.east]],{color:'#ac9774',weight:1,dashArray:'5 5',fill:false,interactive:false}).addTo(this.streetGeometry);}
  this.streetGeometry.eachLayer(layer=>layer.bringToBack?.());
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
