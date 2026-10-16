import {auditMissionRoads} from './road-audit.js';
import {prepareStreetScene,routeOnStreets,streetDistance} from './street-plan.js';
import {StreetWalker,loadStreetGraph} from './street-network.js';
import {SETTINGS,TASKS} from './config.js';
import {RoadWalker} from './roads.js';
export class SimLocation {constructor(){this.walker=new RoadWalker();}read(){return {...this.walker.read(),accuracy:0,timestamp:Date.now()};}move(x,y,seconds){this.walker.move(x,y,SETTINGS.speedMetersPerSecond*seconds);return this.read();}}
export class RealLocation {constructor(){this.id=null;this.generation=0;}stop(){this.generation++;if(this.id!==null)navigator.geolocation?.clearWatch(this.id);this.id=null;}start(onPosition,onError){this.stop();const generation=this.generation;if(!window.isSecureContext)return onError('真實定位需要 HTTPS 或 localhost。');if(!navigator.geolocation)return onError('此裝置或瀏覽器不支援定位。');this.id=navigator.geolocation.watchPosition(p=>{if(generation===this.generation)onPosition({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp,...(Number.isFinite(p.coords.speed)?{speed:p.coords.speed}:{})});},e=>{if(generation===this.generation)onError(({1:'定位權限遭拒，請在瀏覽器設定允許後重試。',2:'無法取得位置，請檢查裝置定位功能。',3:'定位逾時，請至空曠處重試。'})[e.code]||'定位失敗，請重試。');},{enableHighAccuracy:true,timeout:10000,maximumAge:0});}}

// Simulator stays on connected OSM segments; unavailable geometry never permits free movement.
export class GeographicSimLocation {
 constructor(start){this.position={...start};this.spawnPlaced=false;this.walker=null;this.loading=false;this.error='';this.roadMap=null;this.rasterReady=false;this.snapVersion=-1;this.arrivalTargets={};this.targetsLocked=false;this.restoreTargets();}
 attachMap(map){this.roadMap=map;this.snapVersion=-1;this.rasterReady=false;}
 async loadRoads(){
  if(this.walker||this.loading)return;this.loading=true;this.error='';
  try{
   const graph=await loadStreetGraph(),references=TASKS.map(t=>({...t,official:this.arrivalTargets[t.id]||t.official})),scene=prepareStreetScene(graph,references);
   let spawn=null;
   for(const edge of scene.graph.edges){if(!scene.missionNodes.has(edge.a)||!scene.missionNodes.has(edge.b))continue;const a=scene.graph.nodes.get(edge.a),b=scene.graph.nodes.get(edge.b),count=Math.max(1,Math.ceil(streetDistance(a,b)/8));
    for(let i=0;i<=count;i++){const t=i/count,p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t},d=streetDistance(p,TASKS[0].official);if(d<110||d>200||this.arrivalTargets.color&&streetDistance(p,this.arrivalTargets.color)<80)continue;const score=Math.abs(d-140);if(!spawn||score<spawn.score)spawn={...p,score};}
   }
   if(!spawn)throw Error('道路資料中沒有符合條件的起點');
   for(const task of TASKS){const fixed=this.arrivalTargets[task.id];if(fixed&&streetDistance(fixed,scene.targets[task.id])>task.radiusMeters)throw Error('已保存的'+task.place+'抵達圈與目前道路不相連；保留原圈，請重新載入原道路資料。');}
   this.audit=auditMissionRoads(scene,TASKS);const walker=new StreetWalker(scene.graph,spawn);this.scene=scene;this.walker=walker;this.position=walker.read();this.spawnPlaced=true;
   for(const task of TASKS)if(!this.arrivalTargets[task.id])this.arrivalTargets[task.id]={...scene.targets[task.id]};
   this.targetsLocked=true;this.saveTargets();
  }catch(error){this.error=error.message;}finally{this.loading=false;}
 }
 prepareRoad(){/* Movement is enabled only after the complete geometric dataset is loaded. */}

 route(taskId){return this.scene&&this.walker?routeOnStreets(this.scene,this.walker,taskId):null;}
 restoreTargets(){try{const saved=JSON.parse(localStorage.getItem('dream-mender:fixed-sim-targets:v2')||'null');if(saved?.reference===JSON.stringify(TASKS.map(t=>t.official))&&saved.targets&&typeof saved.targets==='object'){for(const task of TASKS){const p=saved.targets[task.id];if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)&&Math.abs(p.lat-task.official.lat)<.0012&&Math.abs(p.lng-task.official.lng)<.0014)this.arrivalTargets[task.id]={lat:p.lat,lng:p.lng};}this.targetsLocked=TASKS.every(t=>this.arrivalTargets[t.id]);}}catch{}}
 saveTargets(){try{localStorage.setItem('dream-mender:fixed-sim-targets:v2',JSON.stringify({reference:JSON.stringify(TASKS.map(t=>t.official)),targets:this.arrivalTargets}));}catch{}}
 simulationRoadTargets(tasks){return this.arrivalTargets;}

 get blockReason(){return this.error?'data':!this.ready?'loading':this.walker.lastBlockReason||'';}
 get blockMessage(){return ({building:'前方是建築物，無法穿越。',boundary:'已到遊戲範圍邊界，請沿範圍內道路行走。','road-end':'這個方向沒有相連道路，請在路口轉向。',data:this.error,loading:'道路與建築物尚未載入，請稍候或重試。'})[this.blockReason]||'請沿道路行走。';}
 get sourceLabel(){return this.scene?(this.scene.source?.kind==='packaged'?'內建道路':'已固定道路快照'):'正在準備道路與建築物';}
 get ready(){return !!this.walker;}
 read(){this.prepareRoad();return {...(this.walker?this.walker.read():this.position),onRoad:!!this.walker,accuracy:0,timestamp:Date.now()};}
 move(x,y,seconds){
  this.prepareRoad();const meters=SETTINGS.speedMetersPerSecond*Math.max(0,seconds);
  if(this.walker){this.walker.move(x,y,meters);this.position=this.walker.read();}
  
  return this.read();
 }
}
export function geographicSimulationTasks(tasks,targets=null){return tasks.map(t=>({...t,test:{...(targets?.[t.id]||t.official)},simTargetReady:targets===null||!!targets[t.id],simRoadTarget:!!targets?.[t.id],entranceNode:null,requiresRoad:true}));}
