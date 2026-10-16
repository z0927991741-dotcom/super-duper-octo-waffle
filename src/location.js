import {SETTINGS} from './config.js';
import {RoadWalker} from './roads.js';
export class SimLocation {constructor(){this.walker=new RoadWalker();}read(){return {...this.walker.read(),accuracy:0,timestamp:Date.now()};}move(x,y,seconds){this.walker.move(x,y,SETTINGS.speedMetersPerSecond*seconds);return this.read();}}
export class RealLocation {constructor(){this.id=null;this.generation=0;}stop(){this.generation++;if(this.id!==null)navigator.geolocation?.clearWatch(this.id);this.id=null;}start(onPosition,onError){this.stop();const generation=this.generation;if(!window.isSecureContext)return onError('真實定位需要 HTTPS 或 localhost。');if(!navigator.geolocation)return onError('此裝置或瀏覽器不支援定位。');this.id=navigator.geolocation.watchPosition(p=>{if(generation===this.generation)onPosition({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp});},e=>{if(generation===this.generation)onError(({1:'定位權限遭拒，請在瀏覽器設定允許後重試。',2:'無法取得位置，請檢查裝置定位功能。',3:'定位逾時，請至空曠處重試。'})[e.code]||'定位失敗，請重試。');},{enableHighAccuracy:true,timeout:10000,maximumAge:0});}}

// Virtual movement on the geographic map; no claim of pedestrian routing.
export class GeographicSimLocation {
 constructor(start){this.position={...start};}
 read(){return {...this.position,accuracy:0,timestamp:Date.now()};}
 move(x,y,seconds){const meters=SETTINGS.speedMetersPerSecond*Math.max(0,seconds),norm=Math.max(1,Math.hypot(x,y));this.position.lat+=y/norm*meters/111195;this.position.lng+=x/norm*meters/(111195*Math.cos(this.position.lat*Math.PI/180));return this.read();}
}
export function geographicSimulationTasks(tasks){return tasks.map(t=>({...t,test:{...t.official},entranceNode:null}));}
