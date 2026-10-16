import {prepareStreetScene,routeOnStreets,streetDistance} from './street-plan.js';
import {StreetWalker,loadStreetGraph} from './street-network.js';
import {SETTINGS,TASKS} from './config.js';
import {RoadWalker} from './roads.js';
export class SimLocation {constructor(){this.walker=new RoadWalker();}read(){return {...this.walker.read(),accuracy:0,timestamp:Date.now()};}move(x,y,seconds){this.walker.move(x,y,SETTINGS.speedMetersPerSecond*seconds);return this.read();}}
export class RealLocation {constructor(){this.id=null;this.generation=0;}stop(){this.generation++;if(this.id!==null)navigator.geolocation?.clearWatch(this.id);this.id=null;}start(onPosition,onError){this.stop();const generation=this.generation;if(!window.isSecureContext)return onError('真實定位需要 HTTPS 或 localhost。');if(!navigator.geolocation)return onError('此裝置或瀏覽器不支援定位。');this.id=navigator.geolocation.watchPosition(p=>{if(generation===this.generation)onPosition({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp});},e=>{if(generation===this.generation)onError(({1:'定位權限遭拒，請在瀏覽器設定允許後重試。',2:'無法取得位置，請檢查裝置定位功能。',3:'定位逾時，請至空曠處重試。'})[e.code]||'定位失敗，請重試。');},{enableHighAccuracy:true,timeout:10000,maximumAge:0});}}

// Simulator stays on connected OSM segments; unavailable geometry never permits free movement.
export class GeographicSimLocation {
 constructor(start){this.position={...start};this.spawnPlaced=false;this.walker=null;this.loading=false;this.error='';this.roadMap=null;this.rasterReady=false;this.snapVersion=-1;this.arrivalTargets={};this.targetsLocked=false;this.restoreTargets();}
 attachMap(map){this.roadMap=map;this.snapVersion=-1;this.rasterReady=false;}
 async loadRoads(){if(this.walker||this.loading||this.targetsLocked)return;this.loading=true;this.error='';try{const graph=await loadStreetGraph();if(this.targetsLocked||Object.keys(this.arrivalTargets).length)return;const scene=prepareStreetScene(graph,TASKS);this.scene=scene;this.arrivalTargets=scene.targets;this.targetsLocked=true;this.saveTargets();const spawn=[...scene.graph.nodes.values()].filter(p=>streetDistance(p,TASKS[0].official)>=110&&streetDistance(p,TASKS[0].official)<=200).sort((a,b)=>Math.abs(streetDistance(a,TASKS[0].official)-140)-Math.abs(streetDistance(b,TASKS[0].official)-140))[0];if(!spawn)throw Error('起點附近的道路尚未就緒');this.walker=new StreetWalker(scene.graph,spawn);this.position=this.walker.read();this.spawnPlaced=true;}catch(error){this.error=error.message;}finally{this.loading=false;}}
 prepareRoad(){
  if(this.walker||!this.roadMap||this.roadMap.destroyed)return;
  if(!this.spawnPlaced){if(!this.roadMap.initialTilesLoaded)return;const spawn=this.roadMap.simulationStart(TASKS[0].official,this.arrivalTargets.color);if(!spawn)return;this.position=spawn;this.spawnPlaced=true;this.rasterReady=true;return;}
  if(this.roadMap.isRoad(this.position)){this.rasterReady=true;return;}
  // A zoom or missing tile pauses walking; never snap an established walker across a block.
  if(this.rasterReady)return;
  if(this.snapVersion===this.roadMap.roadMaskVersion)return;this.snapVersion=this.roadMap.roadMaskVersion;
  const point=this.roadMap.nearestRoad(this.position);if(point){this.position=point;this.rasterReady=true;}
 }
 route(taskId){return this.scene&&this.walker?routeOnStreets(this.scene,this.walker,taskId):null;}
 restoreTargets(){try{const saved=JSON.parse(localStorage.getItem('dream-mender:fixed-sim-targets:v2')||'null');if(saved?.reference===JSON.stringify(TASKS.map(t=>t.official))&&saved.targets&&typeof saved.targets==='object'){for(const task of TASKS){const p=saved.targets[task.id];if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)&&Math.abs(p.lat-task.official.lat)<.0012&&Math.abs(p.lng-task.official.lng)<.0014)this.arrivalTargets[task.id]={lat:p.lat,lng:p.lng};}this.targetsLocked=TASKS.every(t=>this.arrivalTargets[t.id]);}}catch{}}
 saveTargets(){try{localStorage.setItem('dream-mender:fixed-sim-targets:v2',JSON.stringify({reference:JSON.stringify(TASKS.map(t=>t.official)),targets:this.arrivalTargets}));}catch{}}
 simulationRoadTargets(tasks){
  if(this.targetsLocked)return this.arrivalTargets;
  this.prepareRoad();
  if(this.rasterReady&&this.roadMap&&!this.roadMap.destroyed&&this.roadMap.initialTilesLoaded){const reachable=this.roadMap.reachableRoadTargets(tasks,this.position);let changed=false;for(const task of tasks)if(!this.arrivalTargets[task.id]&&reachable[task.id]){this.arrivalTargets[task.id]={...reachable[task.id]};changed=true;}this.targetsLocked=tasks.every(t=>this.arrivalTargets[t.id]);if(changed)this.saveTargets();}
  return this.arrivalTargets;
 }

 get sourceLabel(){return this.scene?(this.scene.source?.kind==='packaged'?'內建道路':'已固定道路快照'):'地圖道路備援';}
 get ready(){this.prepareRoad();return !!this.walker||this.rasterReady;}
 read(){this.prepareRoad();return {...(this.walker?this.walker.read():this.position),onRoad:!!this.walker||this.rasterReady,accuracy:0,timestamp:Date.now()};}
 move(x,y,seconds){
  this.prepareRoad();const meters=SETTINGS.speedMetersPerSecond*Math.max(0,seconds);
  if(this.walker){this.walker.move(x,y,meters);this.position=this.walker.read();}
  else if(this.rasterReady&&this.roadMap&&!this.roadMap.destroyed)this.position=this.roadMap.roadStep(this.position,x,y,meters);
  return this.read();
 }
}
export function geographicSimulationTasks(tasks,targets=null){return tasks.map(t=>({...t,test:{...(targets?.[t.id]||t.official)},simTargetReady:targets===null||!!targets[t.id],simRoadTarget:!!targets?.[t.id],entranceNode:null,requiresRoad:true}));}
