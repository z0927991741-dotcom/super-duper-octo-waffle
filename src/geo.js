import {fieldPointReady} from './field-points.js';
import {roadRoute} from './roads.js';
import {SETTINGS,officialReady,entranceReady} from './config.js';
export function distanceMeters(a,b){const r=Math.PI/180;const dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
export function positionIssue(pos,now=Date.now()){if(!pos||!Number.isFinite(pos.lat)||!Number.isFinite(pos.lng)||Math.abs(pos.lat)>90||Math.abs(pos.lng)>180)return '尚未取得定位';if(!Number.isFinite(pos.timestamp)||now-pos.timestamp>SETTINGS.maxAgeMs||pos.timestamp>now+1000)return '位置資料已過期，請重新定位';if(!Number.isFinite(pos.accuracy)||pos.accuracy>SETTINGS.maxAccuracyMeters||pos.accuracy<0)return '定位精度不足，請移至空曠處重試';return '';}
export function arrival(task,pos,mode,now=Date.now()){if(!['sim','real','field'].includes(mode))return {allowed:false,distance:null,reason:'無效模式'};if(mode==='field'&&!fieldPointReady(task.fieldPoint))return {allowed:false,distance:null,reason:'請先用目前 GPS 設定私人測試點'};if(mode==='real'&&!officialReady(task))return {allowed:false,distance:null,reason:'正式座標尚未查證，實地任務暫不開放'};if(mode==='real'&&!entranceReady(task))return {allowed:false,distance:positionIssue(pos,now)?null:distanceMeters(pos,task.official),reason:'顯示至景點參考點的直線距離；安全入口待查證，尚不解鎖'};if(mode==='sim'&&task.requiresRoad&&!pos?.onRoad)return {allowed:false,distance:null,reason:'道路資料尚未就緒，請稍候或重試'};const issue=positionIssue(pos,now);if(issue)return {allowed:false,distance:null,reason:issue};const straightDistance=distanceMeters(pos,mode==='sim'?task.test:mode==='field'?task.fieldPoint:task.entrance);const route=mode==='sim'&&task.entranceNode?roadRoute(pos,task.entranceNode):null;if(mode==='sim'&&task.entranceNode&&!route)return {allowed:false,distance:null,reason:'目前不在可通行路網，無法抵達'};const distance=route?Math.max(straightDistance,route.distance):straightDistance;return {distance,allowed:distance<=task.radiusMeters,reason:distance<=task.radiusMeters?'已抵達・可以修補夢境':'走近夢境，讓記憶甦醒'};}
// Nearby missions are ranked by the same arrival rules as the start button.
// In-range missions win over out-of-range ones; ties keep the configured order.
export function nearbyDream(tasks,pos,mode,now=Date.now()){
 return tasks.map((task,index)=>({task,index,result:arrival(task,pos,mode,now)})).sort((a,b)=>Number(b.result.allowed)-Number(a.result.allowed)||(a.result.distance??Infinity)-(b.result.distance??Infinity)||a.index-b.index)[0]??null;
}

// Hysteresis never keeps a mission that has left its arrival radius.
export function stableNearbyDream(tasks,pos,mode,previousId,now=Date.now()){
 const nearest=nearbyDream(tasks,pos,mode,now);
 const previous=tasks.find(t=>t.id===previousId);
 if(!previous||!nearest)return nearest;
 const result=arrival(previous,pos,mode,now);
 if(result.allowed===nearest.result.allowed&&result.distance!==null&&nearest.result.distance!==null&&result.distance-nearest.result.distance<SETTINGS.missionSwitchMarginMeters)return {task:previous,result};
 return nearest;
}
