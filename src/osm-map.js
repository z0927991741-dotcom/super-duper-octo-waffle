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
  const L=window.L;
  if(!L){this.status.textContent='地圖元件未能載入，請重新開啟遊戲。';return;}
  this.map=L.map(host.querySelector('.osm-viewport'),{minZoom:3,maxZoom:19,zoomControl:true,attributionControl:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
  this.map.attributionControl.setPrefix(false);
  this.map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>');
  this.tiles=chibiTileLayer(L);
  this.tiles.on('loading',()=>{this.loading=true;this.tileErrors=0;this.tileStatus();});
  this.tiles.on('tileerror',()=>{this.tileErrors++;this.tileStatus();});
  this.tiles.on('load',()=>{this.loading=false;this.tileStatus();});
  this.map.on('dragstart',()=>{this.follow=false;});
  this.markers=L.layerGroup().addTo(this.map);
  for(const task of tasks){
   if(officialReady(task))this.landmark(task.official,task.place+'・政府參考點','#967251',task);
   if(task.fieldPoint){this.landmark(task.fieldPoint,task.name+'・私人測試點','#7061a8',task);L.circle([task.fieldPoint.lat,task.fieldPoint.lng],{radius:task.radiusMeters,color:'#7061a8',fillOpacity:.08}).addTo(this.map);}
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
 preview(task){if(task.fieldPoint){this.follow=false;this.show(task.fieldPoint);return;}if(!officialReady(task)){this.status.textContent='此景點中心尚未查證，暫不標示。';return;}this.follow=false;this.show(entranceReady(task)?task.entrance:task.official);}
 setPosition(position){
  const issue=positionIssue(position),key=JSON.stringify([position,issue]);if(this.lastKey===key)return;this.lastKey=key;
  const previous=this.position;this.position=position;if(!this.map)return;
  if(!position||issue){this.markers.clearLayers();this.actor=null;this.accuracyCircle=null;this.motion={dx:0,dy:0,until:0};this.tileStatus();return;}
  if(previous){const dx=position.lng-previous.lng,dy=position.lat-previous.lat;if(Math.hypot(dx,dy)>1e-10)this.motion={dx,dy,until:performance.now()+(this.simulation?220:900)};}
  const L=window.L,point=[position.lat,position.lng];
  if(this.follow){const p=this.map.latLngToContainerPoint(point),size=this.map.getSize();if(p.x<size.x*.25||p.x>size.x*.75||p.y<size.y*.25||p.y>size.y*.75)this.show(position);}
  if(!this.accuracyCircle)this.accuracyCircle=L.circle(point,{radius:position.accuracy,color:'#9b7656',weight:1,fillOpacity:.12,interactive:false,className:'osm-accuracy'}).addTo(this.markers);
  else this.accuracyCircle.setLatLng(point).setRadius(position.accuracy);
  if(!this.actor){
   const art=playerArtwork(this.playerId).replaceAll('player-opaque-','map-player-opaque-');
   this.actor=L.marker(point,{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'osm-player map-actor',html:'<div class="map-actor-body">'+art+'</div><small>'+ (this.simulation?'模擬角色':'你')+'</small>',iconSize:[48,72],iconAnchor:[24,65]})}).addTo(this.markers);
  }else this.actor.setLatLng(point);
  this.tileStatus();
 }
 animate(now){const el=this.actor?.getElement();if(!el)return;const moving=now<this.motion.until;animatePlayer(el,this.playerId,moving?this.motion.dx:0,moving?this.motion.dy:0,now,matchMedia('(prefers-reduced-motion: reduce)').matches);}

 tileStatus(){
  if(this.destroyed)return;
  const issue=positionIssue(this.position);
  this.status.textContent=issue?issue+'；定位有效後顯示玩家位置。':this.tileErrors?'地圖未能完整載入，請確認網路；定位判定仍獨立運作。':this.loading?'正在載入 OpenStreetMap…':this.simulation?'Q 版街道地圖・虛擬位置；不代表可通行路線。':'Q 版街道參考・不提供步行導航；圓圈表示定位誤差。';
 }
 destroy(){this.destroyed=true;this.observer?.disconnect();this.map?.remove();}
}
