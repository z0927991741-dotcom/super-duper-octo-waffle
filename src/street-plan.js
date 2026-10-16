// Simulation targets are projections onto published OSM segments, never field-verified entrances.
export function streetDistance(a,b){return Math.hypot((a.lng-b.lng)*Math.cos((a.lat+b.lat)*Math.PI/360),a.lat-b.lat)*111195;}
export function projectToStreet(graph,point){
 let best=null;
 for(const edge of graph.edges){const a=graph.nodes.get(edge.a),b=graph.nodes.get(edge.b),c=Math.cos(point.lat*Math.PI/180),dx=(b.lng-a.lng)*c,dy=b.lat-a.lat,t=Math.max(0,Math.min(1,((point.lng-a.lng)*c*dx+(point.lat-a.lat)*dy)/(dx*dx+dy*dy||1))),p={lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t},distance=streetDistance(point,p);if(!best||distance<best.distance)best={edge,t,point:p,distance};}
 return best;
}
export function prepareStreetScene(graph,tasks){
 const seen=new Set(),components=[];
 for(const node of graph.nodes.keys()){
  if(seen.has(node))continue;const ids=new Set(),queue=[node];
  while(queue.length){const id=queue.pop();if(seen.has(id))continue;seen.add(id);ids.add(id);for(const e of graph.links.get(id)||[])queue.push(e.a===id?e.b:e.a);}
  const edges=graph.edges.filter(e=>ids.has(e.a)&&ids.has(e.b));if(!edges.length)continue;
  const component={nodes:graph.nodes,edges,links:graph.links},projections=tasks.map(t=>projectToStreet(component,t.official));
  if(projections.every(p=>p&&p.distance<=120))components.push({ids,edges,projections,score:projections.reduce((n,p)=>n+p.distance,0)});
 }
 const best=components.sort((a,b)=>a.score-b.score||b.edges.length-a.edges.length)[0];
 if(!best)throw Error('道路資料沒有同時連通三個景點；保留目前可用地圖，請更新道路資料');
 const nodes=new Map([...graph.nodes].filter(([id])=>best.ids.has(id))),edges=[],groups=new Map(),targets={},targetNodes={};
 tasks.forEach((task,i)=>{const p=best.projections[i];if(!groups.has(p.edge))groups.set(p.edge,[]);groups.get(p.edge).push({...p,id:task.id});});
 for(const edge of best.edges){
  const projections=(groups.get(edge)||[]).sort((a,b)=>a.t-b.t);let previous=edge.a,lastT=0;
  for(const p of projections){
   let id=p.t<1e-8?edge.a:p.t>1-1e-8?edge.b:Math.abs(p.t-lastT)<1e-8?previous:'sim-goal-'+p.id;
   if(!nodes.has(id))nodes.set(id,p.point);if(previous!==id)edges.push({...edge,a:previous,b:id});
   previous=id;lastT=p.t;targets[p.id]={...nodes.get(id)};targetNodes[p.id]=id;
  }
  if(previous!==edge.b)edges.push({...edge,a:previous,b:edge.b});
 }
 const links=new Map();for(const e of edges)for(const id of [e.a,e.b]){if(!links.has(id))links.set(id,[]);links.get(id).push(e);}
 const scene={graph:{nodes,edges,links},targets,targetNodes,routeCache:new Map(),source:graph.source||null};
 // Every target must remain connected after segment splitting.
 for(const task of tasks)if(!links.has(targetNodes[task.id]))throw Error('景點未接上道路：'+task.id);
 return scene;
}
export function routeOnStreets(scene,walker,taskId){
 const destination=scene.targetNodes[taskId];if(destination===undefined)return null;
 const {nodes,links}=scene.graph;let tree=scene.routeCache.get(taskId);
 if(!tree){
  const distance=new Map([[destination,0]]),next=new Map(),remaining=new Set(nodes.keys());
  while(remaining.size){let chosen=null,cost=Infinity;for(const id of remaining){const n=distance.get(id)??Infinity;if(n<cost){cost=n;chosen=id;}}if(chosen===null)break;remaining.delete(chosen);
   for(const edge of links.get(chosen)||[]){const other=edge.a===chosen?edge.b:edge.a;if(!remaining.has(other))continue;const n=cost+streetDistance(nodes.get(chosen),nodes.get(other));if(n<(distance.get(other)??Infinity)){distance.set(other,n);next.set(other,{node:chosen,edge});}}
  }tree={distance,next};scene.routeCache.set(taskId,tree);
 }
 const point=walker.read(),choices=walker.node!==null?[{id:walker.node,cost:0}]:[{id:walker.edge.a,cost:streetDistance(point,nodes.get(walker.edge.a))},{id:walker.edge.b,cost:streetDistance(point,nodes.get(walker.edge.b))}];
 choices.forEach(c=>c.total=c.cost+(tree.distance.get(c.id)??Infinity));choices.sort((a,b)=>a.total-b.total);const chosen=choices[0];if(!Number.isFinite(chosen?.total))return null;
 const points=[point],names=[];let id=chosen.id;points.push(nodes.get(id));
 for(let n=0;id!==destination&&n<=nodes.size;n++){const step=tree.next.get(id);if(!step)return null;names.push(step.edge.name);id=step.node;points.push(nodes.get(id));}
 return {points,distance:chosen.total,street:names[0]||walker.edge?.name||'目的地旁道路',taskId};
}
