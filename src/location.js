import {StreetWalker,loadStreetGraph} from './street-network.js';
import {SETTINGS} from './config.js';
import {RoadWalker} from './roads.js';
export class SimLocation {constructor(){this.walker=new RoadWalker();}read(){return {...this.walker.read(),accuracy:0,timestamp:Date.now()};}move(x,y,seconds){this.walker.move(x,y,SETTINGS.speedMetersPerSecond*seconds);return this.read();}}
export class RealLocation {constructor(){this.id=null;this.generation=0;}stop(){this.generation++;if(this.id!==null)navigator.geolocation?.clearWatch(this.id);this.id=null;}start(onPosition,onError){this.stop();const generation=this.generation;if(!window.isSecureContext)return onError('真實定位需要 HTTPS 或 localhost。');if(!navigator.geolocation)return onError('此裝置或瀏覽器不支援定位。');this.id=navigator.geolocation.watchPosition(p=>{if(generation===this.generation)onPosition({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp});},e=>{if(generation===this.generation)onError(({1:'定位權限遭拒，請在瀏覽器設定允許後重試。',2:'無法取得位置，請檢查裝置定位功能。',3:'定位逾時，請至空曠處重試。'})[e.code]||'定位失敗，請重試。');},{enableHighAccuracy:true,timeout:10000,maximumAge:0});}}

// Simulator stays on connected OSM segments; unavailable geometry never permits free movement.
export class GeographicSimLocation {
 constructor(start){this.position={...start};this.walker=null;this.loading=false;this.error='';}
 async loadRoads(){if(this.walker||this.loading)return;this.loading=true;this.error='';try{this.walker=new StreetWalker(await loadStreetGraph(),this.position);}catch(error){this.error=error.message;}finally{this.loading=false;}}
 read(){return {...(this.walker?this.walker.read():this.position),onRoad:!!this.walker,accuracy:0,timestamp:Date.now()};}
 move(x,y,seconds){if(this.walker)this.walker.move(x,y,SETTINGS.speedMetersPerSecond*Math.max(0,seconds));return this.read();}
}
export function geographicSimulationTasks(tasks){return tasks.map(t=>({...t,test:{...t.official},entranceNode:null,requiresRoad:true}));}
