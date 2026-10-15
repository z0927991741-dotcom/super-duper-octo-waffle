import {officialReady,entranceReady} from './config.js';
import {positionIssue} from './geo.js';

// Only presentation uses Leaflet. Arrival always uses geo.js, never map pixels.
export class OsmMap {
 constructor(host,tasks){
  this.host=host;this.tasks=tasks;this.position=null;this.follow=true;this.centered=false;this.destroyed=false;this.tileErrors=0;
  host.innerHTML='<div class="osm-viewport" role="region" aria-label="OpenStreetMap 地圖，可拖曳或縮放"></div><button type="button" class="osm-follow">回到定位</button><p class="osm-status" role="status">啟用定位後顯示地圖；地圖需要網路。</p>';
  this.status=host.querySelector('.osm-status');
  const L=window.L;
  if(!L){this.status.textContent='地圖元件未能載入，請重新開啟遊戲。';return;}
  this.map=L.map(host.querySelector('.osm-viewport'),{minZoom:3,maxZoom:19,zoomControl:true,attributionControl:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
  this.map.attributionControl.setPrefix(false);
  this.map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>');
  this.tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:0,updateWhenIdle:true,referrerPolicy:'strict-origin-when-cross-origin'});
  this.tiles.on('loading',()=>{this.loading=true;this.tileErrors=0;this.tileStatus();});
  this.tiles.on('tileerror',()=>{this.tileErrors++;this.tileStatus();});
  this.tiles.on('load',()=>{this.loading=false;this.tileStatus();});
  this.map.on('dragstart',()=>{this.follow=false;});
  this.markers=L.layerGroup().addTo(this.map);
  for(const task of tasks){
   if(officialReady(task))this.landmark(task.official,task.place+'・中心','#967251');
   if(officialReady(task)&&entranceReady(task))this.landmark(task.entrance,task.place+'・安全入口','#3f8250');
  }
  host.querySelector('.osm-follow').onclick=()=>{this.follow=true;if(this.position&&!positionIssue(this.position)){this.map.setView([this.position.lat,this.position.lng],this.map.getZoom(),{animate:false});}};
  this.observer=new ResizeObserver(()=>{if(!this.destroyed&&host.clientWidth&&host.clientHeight)this.map.invalidateSize({pan:false});});this.observer.observe(host);
 }
 landmark(point,label,color){const text=document.createElement('span');text.textContent=label;window.L.circleMarker([point.lat,point.lng],{radius:8,color,fillOpacity:.8}).bindTooltip(text,{permanent:true,direction:'top'}).addTo(this.map);}
 show(point){if(!this.map)return;this.map.setView([point.lat,point.lng],this.centered?this.map.getZoom():17,{animate:false});if(!this.centered){this.centered=true;this.tiles.addTo(this.map);}}
 preview(task){if(!officialReady(task)){this.status.textContent='此景點中心尚未查證，暫不標示。';return;}this.follow=false;this.show(entranceReady(task)?task.entrance:task.official);}
 setPosition(position){
  const issue=positionIssue(position);const key=JSON.stringify([position,issue]);if(this.lastKey===key)return;this.lastKey=key;this.position=position;
  if(!this.map)return;
  this.markers.clearLayers();
  if(position&&!issue){
   if(this.follow||!this.centered)this.show(position);
   const point=[position.lat,position.lng];
   window.L.circle(point,{radius:position.accuracy,color:'#3777b5',weight:1,fillOpacity:.15,interactive:false,className:'osm-accuracy'}).addTo(this.markers);
   window.L.circleMarker(point,{radius:8,color:'#fff',weight:2,fillColor:'#3777b5',fillOpacity:1,className:'osm-player'}).bindTooltip('你',{permanent:true,direction:'top'}).addTo(this.markers);
  }
  this.tileStatus();
 }
 tileStatus(){
  if(this.destroyed)return;
  const issue=positionIssue(this.position);
  this.status.textContent=issue?issue+'；定位有效後顯示玩家位置。':this.tileErrors?'地圖未能完整載入，請確認網路；定位判定仍獨立運作。':this.loading?'正在載入 OpenStreetMap…':'街道參考地圖・不提供步行導航；圓圈表示定位誤差。';
 }
 destroy(){this.destroyed=true;this.observer?.disconnect();this.map?.remove();}
}
