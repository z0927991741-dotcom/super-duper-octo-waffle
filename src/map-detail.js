// Screenshot-inspired schematic blocks, not surveyed street or building geometry.
export function refineStreetLayout(layout){
 const blocks=[],roads=layout.links.map(([a,b,name])=>({a:layout.nodes[a],b:layout.nodes[b],name,kind:'street'}));
 const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const quad=(p,u,v)=>lerp(lerp(p[0],p[1],u),lerp(p[3],p[2],u),v);
 const segment=(a,b,name='街區巷道',kind='lane')=>roads.push({a,b,name,kind});
 // Each block's alley ends connect to an existing road; no painted, inaccessible streets.
 const districts=[
  ['northwest','north','book','nw',3,2],
  ['north','northeast','ne','book',3,2],
  ['northwest','nw','west','westnorth',2,3],
  ['westnorth','west','color','farwest',3,3],
  ['farwest','color','start','southwest',3,2],
  ['start','park','south','southwest',3,3],
  ['ne','northeast','fareast','east',3,3],
  ['east','fareast','eastpark','southeast',3,4],
  ['southeast','eastpark','south','park',3,2],
  ['nw','book','gate','west',2,3]
 ];
 for(const [a,b,c,d,cols,rows] of districts){const p=[a,b,c,d].map(id=>layout.nodes[id]);
  // Complete district borders, including the southern cross street and 長春街.
  for(let i=0;i<4;i++)segment(p[i],p[(i+1)%4],'街區連接道');
  for(let i=1;i<cols;i++)segment(quad(p,i/cols,0),quad(p,i/cols,1));
  for(let i=1;i<rows;i++)segment(quad(p,0,i/rows),quad(p,1,i/rows));
  for(let x=0;x<cols;x++)for(let y=0;y<rows;y++)blocks.push([quad(p,x/cols,y/rows),quad(p,(x+1)/cols,y/rows),quad(p,(x+1)/cols,(y+1)/rows),quad(p,x/cols,(y+1)/rows)]);
 }
 // Park paths join the surrounding streets; ponds and lawns remain impassable.
 const parkPoints={garden:[365,686],pondWest:[410,768],pondEast:[562,796],gardenEast:[645,730]};
 Object.assign(layout.nodes,parkPoints);
 for(const [a,b] of [['gate','garden'],['color','garden'],['garden','pondWest'],['pondWest','park'],['garden','gardenEast'],['gardenEast','east'],['gardenEast','pondEast'],['pondEast','park'],['pondEast','southeast']])segment(layout.nodes[a],layout.nodes[b],'公園步道','path');
 // Split every intersection, including T junctions, so walker and drawing share geometry.
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const cuts=roads.map(()=>[0,1]);
 for(let i=0;i<roads.length;i++)for(let j=i+1;j<roads.length;j++){
  const a=roads[i],b=roads[j],r=sub(a.b,a.a),s=sub(b.b,b.a),delta=sub(b.a,a.a),den=cross(r,s);
  if(Math.abs(den)>1e-7){const t=cross(delta,s)/den,u=cross(delta,r)/den;if(t>=-1e-8&&t<=1+1e-8&&u>=-1e-8&&u<=1+1e-8){cuts[i].push(Math.max(0,Math.min(1,t)));cuts[j].push(Math.max(0,Math.min(1,u)));}}
  else if(Math.abs(cross(delta,r))<1e-6){
   for(const [road,other,index] of [[a,b,i],[b,a,j]]){const v=sub(road.b,road.a),length=v[0]**2+v[1]**2;for(const p of [other.a,other.b]){const q=sub(p,road.a),t=(q[0]*v[0]+q[1]*v[1])/length;if(t>0&&t<1)cuts[index].push(t);}}
  }
 }
 const nodeAt=p=>{const match=Object.entries(layout.nodes).find(([,q])=>Math.hypot(p[0]-q[0],p[1]-q[1])<.001);if(match)return match[0];const id='junction-'+Object.keys(layout.nodes).length;layout.nodes[id]=p;return id;};
 const links=[],seen=new Set();
 roads.forEach((road,i)=>{const ts=[...new Set(cuts[i].map(t=>Math.round(t*1e9)/1e9))].sort((a,b)=>a-b);for(let k=1;k<ts.length;k++){const a=nodeAt(lerp(road.a,road.b,ts[k-1])),b=nodeAt(lerp(road.a,road.b,ts[k]));if(a===b)continue;const key=[a,b].sort().join('/');if(seen.has(key))continue;seen.add(key);links.push([a,b,road.name,road.kind]);}});
 layout.links=links;return blocks;
}
