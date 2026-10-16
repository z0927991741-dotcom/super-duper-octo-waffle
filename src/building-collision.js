// Collision geometry comes from OSM footprints, not raster colors or decoration sprites.
function collisionCross(a,b,c){return (b.lng-a.lng)*(c.lat-a.lat)-(b.lat-a.lat)*(c.lng-a.lng);}
function collisionOn(a,b,p){return Math.abs(collisionCross(a,b,p))<1e-14&&p.lat>=Math.min(a.lat,b.lat)-1e-12&&p.lat<=Math.max(a.lat,b.lat)+1e-12&&p.lng>=Math.min(a.lng,b.lng)-1e-12&&p.lng<=Math.max(a.lng,b.lng)+1e-12;}
function collisionEdges(a,b,c,d){const x=collisionCross(a,b,c),y=collisionCross(a,b,d),u=collisionCross(c,d,a),v=collisionCross(c,d,b);return (x*y<0&&u*v<0)||collisionOn(a,b,c)||collisionOn(a,b,d)||collisionOn(c,d,a)||collisionOn(c,d,b);}
function collisionRingContains(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];if(collisionOn(a,b,point))return true;if((a.lat>point.lat)!==(b.lat>point.lat)&&point.lng<(b.lng-a.lng)*(point.lat-a.lat)/(b.lat-a.lat)+a.lng)inside=!inside;}return inside;}
function collisionRing(raw){if(!Array.isArray(raw)||raw.length<4)return null;const ring=raw.map(p=>({lat:p.lat,lng:p.lon??p.lng}));if(ring.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lng)))return null;const a=ring[0],b=ring.at(-1);return a.lat===b.lat&&a.lng===b.lng?ring:null;}
function joinBuildingRings(members){const remaining=members.map(m=>m.geometry).filter(g=>Array.isArray(g)&&g.length>1).map(g=>g.slice()),rings=[];const same=(a,b)=>a?.lat===b?.lat&&a?.lon===b?.lon;while(remaining.length){let chain=remaining.pop();while(!same(chain[0],chain.at(-1))){const i=remaining.findIndex(g=>same(chain.at(-1),g[0])||same(chain.at(-1),g.at(-1)));if(i<0)throw Error('建築物輪廓不完整，請重新取得資料');let piece=remaining.splice(i,1)[0];if(!same(chain.at(-1),piece[0]))piece.reverse();chain.push(...piece.slice(1));}const ring=collisionRing(chain);if(ring)rings.push(ring);}return rings;}
export function buildingFootprints(elements){
 const polygons=[],relationWays=new Set();
 for(const element of elements){if(element.type!=='relation'||!element.tags?.building||element.tags.building==='no'||element.tags.type!=='multipolygon')continue;const members=element.members||[],outer=joinBuildingRings(members.filter(m=>m.type==='way'&&(m.role==='outer'||!m.role))),holes=joinBuildingRings(members.filter(m=>m.type==='way'&&m.role==='inner'));if(!outer.length)throw Error('建築物外框缺失，請重新取得資料');for(const ring of outer)polygons.push({outer:ring,holes:holes.filter(h=>collisionRingContains(h[0],ring))});for(const m of members)if(m.type==='way')relationWays.add(m.ref);}
 for(const element of elements){if(element.type!=='way'||!element.tags?.building||element.tags.building==='no'||relationWays.has(element.id))continue;const outer=collisionRing(element.geometry);if(!outer)throw Error('建築物輪廓不完整，請重新取得資料');polygons.push({outer,holes:[]});}
 for(const polygon of polygons){const p=polygon.outer;polygon.bounds={minLat:Math.min(...p.map(x=>x.lat)),maxLat:Math.max(...p.map(x=>x.lat)),minLng:Math.min(...p.map(x=>x.lng)),maxLng:Math.max(...p.map(x=>x.lng))};}
 return polygons;
}
export function segmentHitsBuilding(a,b,polygons){
 const minLat=Math.min(a.lat,b.lat),maxLat=Math.max(a.lat,b.lat),minLng=Math.min(a.lng,b.lng),maxLng=Math.max(a.lng,b.lng);
 for(const polygon of polygons){const box=polygon.bounds;if(maxLat<box.minLat||minLat>box.maxLat||maxLng<box.minLng||minLng>box.maxLng)continue;
  const inside=p=>collisionRingContains(p,polygon.outer)&&!polygon.holes.some(h=>collisionRingContains(p,h));if(inside(a)||inside(b))return true;
  for(const ring of [polygon.outer,...polygon.holes])for(let i=1;i<ring.length;i++)if(collisionEdges(a,b,ring[i-1],ring[i]))return true;
 }return false;
}
