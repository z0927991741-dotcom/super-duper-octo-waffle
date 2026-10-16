import {StreetWalker} from './street-network.js';
import {routeOnStreets,streetDistance} from './street-plan.js';
import {segmentHitsBuilding} from './building-collision.js';
export function auditMissionRoads(scene,tasks){
 const origin=scene.targets[tasks[0].id],walker=new StreetWalker(scene.graph,origin),legs=[];
 for(const task of tasks){
  const route=routeOnStreets(scene,walker,task.id);if(!route)throw Error('道路不連通：'+task.place);
  let moved=0;
  for(const destination of route.points.slice(1)){
   for(let guard=0;guard<10000;guard++){
    const before=walker.read(),distance=streetDistance(before,destination);if(distance<.08)break;
    const dx=(destination.lng-before.lng)*Math.cos(before.lat*Math.PI/180),dy=destination.lat-before.lat;
    walker.move(dx,dy,Math.min(distance,2));const after=walker.read(),step=streetDistance(before,after);
    if(step<.00001)throw Error('道路轉角無法通過：'+task.place);
    if(segmentHitsBuilding(before,after,scene.graph.buildings||[]))throw Error('路線穿過建築物：'+task.place);
    moved+=step;if(guard===9999)throw Error('路線驗證超出步數限制');
   }
  }
  const distance=streetDistance(walker.read(),scene.targets[task.id]);if(distance>task.radiusMeters)throw Error('無法進入抵達範圍：'+task.place);
  legs.push({id:task.id,routeMeters:Math.round(moved),withinArrivalRadius:true});
 }
 return {kind:'data-simulation-only',fieldVerified:false,connected:true,buildingCrossings:0,nodes:scene.graph.nodes.size,edges:scene.graph.edges.length,buildingCount:scene.graph.buildings?.length||0,legs};
}
