import {ROAD_NODES,ROAD_EDGES} from './roads.js';
// Pure camera overlay geometry: screen pixels, separate from GPS arrival rules.
export function destinationIndicator(camera,target,width,height){
 const x=camera.x+target.x/100*camera.worldWidth,y=camera.y+target.y/100*camera.worldHeight;
 const bounds={left:38,right:Math.max(39,width-100),top:155,bottom:Math.max(156,height-210)};
 if(x>=bounds.left&&x<=bounds.right&&y>=bounds.top&&y<=bounds.bottom)return null;
 const cx=(bounds.left+bounds.right)/2,cy=(bounds.top+bounds.bottom)/2,dx=x-cx,dy=y-cy;
 const scale=Math.min(dx?((bounds.right-bounds.left)/2)/Math.abs(dx):Infinity,dy?((bounds.bottom-bounds.top)/2)/Math.abs(dy):Infinity,1);
 return {x:cx+dx*scale,y:cy+dy*scale,angle:Math.atan2(dy,dx)*180/Math.PI};
}
export function routeChevrons(points,spacing=55){
 const out=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);for(let at=Math.min(22,length/2);at<length;at+=spacing)out.push({x:a[0]+dx*at/length,y:a[1]+dy*at/length,angle:Math.atan2(dy,dx)*180/Math.PI});}return out;
}
export function nearbyJunction(position,radius=12){
 if(!position)return null;
 const candidates=Object.values(ROAD_NODES).map(node=>({node,distance:Math.hypot(node.lat-position.lat,node.lng-position.lng)*111195})).filter(v=>v.distance<=radius).sort((a,b)=>a.distance-b.distance);
 for(const entry of candidates){const edges=ROAD_EDGES.filter(e=>e.a===entry.node.id||e.b===entry.node.id);if(edges.length<3)continue;
  return {...entry,branches:edges.map(edge=>{const other=ROAD_NODES[edge.a===entry.node.id?edge.b:edge.a];return {name:edge.name,dx:(other.lng-entry.node.lng)/.0000025,dy:-(other.lat-entry.node.lat)/.000003};})};
 }return null;
}

// Reserve the full sprite and its label, not just the player's ground point.
export function avoidPlayerIndicator(hint,player,width,height){
 if(!hint)return null;
 const fits=p=>p.x>=78&&p.x<=width-78&&p.y>=145&&p.y<=height-165;
 const clear=p=>p.x+76<player.x-34||p.x-76>player.x+34||p.y+27<player.y-82||p.y-27>player.y+24;
 const options=[hint,{...hint,y:player.y-116},{...hint,y:player.y+60},{...hint,x:player.x-116},{...hint,x:player.x+116}];
 return options.find(p=>fits(p)&&clear(p))||null;
}
