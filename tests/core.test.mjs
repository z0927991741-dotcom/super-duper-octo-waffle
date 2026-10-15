import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceMeters,arrival,positionIssue} from '../src/geo.js';
import {TASKS,SETTINGS} from '../src/config.js';
import {SimLocation} from '../src/location.js';
import {MemoryChallenge} from '../src/challenge.js';
import {ProgressStore} from '../src/storage.js';
const p=(lat=0,lng=0,accuracy=5,timestamp=Date.now())=>({lat,lng,accuracy,timestamp});
test('Haversine distance and 30m arrival boundary',()=>{assert.ok(Math.abs(distanceMeters(p(),p(.001))-111.195)<.01);const t={...TASKS[0],entranceNode:null,test:{lat:0,lng:0}};assert.equal(arrival(t,p(29/111195),'sim').allowed,true);assert.equal(arrival(t,p(31/111195),'sim').allowed,false);});
test('all tasks start outside radius; movement uses geographic position',()=>{const sim=new SimLocation();TASKS.forEach(t=>assert.equal(arrival(t,sim.read(),'sim').allowed,false));const before=sim.read();sim.move(0,1,1);assert.ok(Math.abs(distanceMeters(before,sim.read())-20)<.01);});
test('unverified real tasks locked; valid official location shares arrival rule',()=>{const t=TASKS[0];assert.equal(arrival(t,{...t.test,...p()},'real').allowed,false);const official={...t,verified:true,source:'verified reference',official:{lat:0,lng:0},entrance:{lat:0,lng:0,verified:true,source:'https://example.org/test-fixture'}};assert.equal(arrival(official,p(),'real').allowed,true);assert.equal(arrival(official,p(.001),'real').allowed,false);assert.equal(arrival(official,p(0,0,100),'real').allowed,false);assert.equal(arrival(official,p(0,0,5,Date.now()-16000),'real').allowed,false);});
test('bad, stale, future and inaccurate locations rejected',()=>{assert.ok(positionIssue(null));assert.ok(positionIssue(p(91)));assert.ok(positionIssue(p(0,0,26)));assert.ok(positionIssue(p(0,0,1,Date.now()-SETTINGS.maxAgeMs-1)));assert.ok(positionIssue(p(0,0,1,Date.now()+5000)));assert.equal(positionIssue(p()),'');});
test('sequence input locked during playback, wrong answer retry and win only once',()=>{let n=0;const c=new MemoryChallenge(4,()=>n++/4);assert.deepEqual(c.show(),[0,1,2,3]);assert.equal(c.press(0),'ignored');c.ready();assert.equal(c.press(1),'wrong');assert.equal(c.press(0),'ignored');assert.deepEqual(c.show(),[0,1,2,3]);c.ready();[0,1,2].forEach(i=>assert.equal(c.press(i),'correct'));assert.equal(c.press(3),'won');assert.equal(c.press(3),'ignored');});
test('separate progress, idempotent rewards, reload, reset and all three fragments',()=>{const m=new Map();const storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};let s=new ProgressStore(storage);assert.equal(s.award('sim','color'),true);assert.equal(s.award('sim','color'),false);assert.deepEqual(s.read('real'),[]);s=new ProgressStore(storage);assert.deepEqual(s.read('sim'),['color']);assert.equal(s.award('sim','unknown'),false);s.award('sim','gate');s.award('sim','book');assert.equal(s.read('sim').length,3);s.award('real','color');s.reset('sim');assert.deepEqual(s.read('sim'),[]);assert.deepEqual(s.read('real'),['color']);});
test('storage failure retains session progress and warns',()=>{let warnings=0;const s=new ProgressStore({getItem(){return null},setItem(){throw Error('disabled')}},()=>warnings++);s.award('sim','color');assert.deepEqual(s.read('sim'),['color']);assert.equal(s.award('sim','color'),false);assert.equal(warnings,1);});
test('malformed save normalizes known unique IDs',()=>{assert.deepEqual(new ProgressStore({getItem:()=>JSON.stringify(['color','color','bad'])}).read('sim'),['color']);});

import {RoadWalker,roadRoute,ROAD_NODES} from '../src/roads.js';
test('all joystick directions remain on the road network',()=>{const w=new RoadWalker();for(let i=0;i<500;i++){const p=w.move(Math.sin(i*.1),Math.cos(i*.1),2);assert.ok(roadRoute(p,'gate'));}});
test('turning cannot cut off a road segment',()=>{const w=new RoadWalker();w.move(0,1,10);const before=w.read();w.move(1,0,10);const after=w.read();assert.ok(roadRoute(after,'gate'));assert.ok(after.lat>before.lat);assert.ok(after.lng>before.lng);});
test('off-road positions cannot unlock and routes connect all three landmarks',()=>{const off={lat:.0018,lng:.0013,accuracy:0,timestamp:Date.now()};assert.equal(roadRoute(off,'gate'),null);assert.equal(arrival(TASKS[0],off,'sim').allowed,false);for(const t of TASKS){const route=roadRoute(ROAD_NODES.start,t.entranceNode);assert.ok(route.distance>30);assert.ok(route.points.length>=2);assert.equal(arrival(t,{...ROAD_NODES[t.entranceNode],accuracy:0,timestamp:Date.now()},'sim').allowed,true);}});

import {cameraFrame} from '../src/camera.js';
test('memory task difficulty is four, five and six',()=>assert.deepEqual(TASKS.map(t=>t.length),[4,5,6]));
test('camera follows the player, clamps at world edges and supports overview',()=>{const a=cameraFrame(390,600,{x:30,y:30}),b=cameraFrame(390,600,{x:50,y:60});assert.ok(b.x<a.x&&b.y<a.y);for(const p of [{x:0,y:0},{x:100,y:100}]){const c=cameraFrame(390,600,p);assert.ok(c.x<=0&&c.x>=390-c.worldWidth);assert.ok(c.y<=0&&c.y>=600-c.worldHeight);}const overview=cameraFrame(390,600,{x:50,y:50},{overview:true});assert.ok(overview.worldWidth<=390&&overview.worldHeight<=600);});
test('expanded streets are reachable from the starting position',()=>{for(const id of Object.keys(ROAD_NODES))assert.ok(roadRoute(ROAD_NODES.start,id));assert.ok(Object.keys(ROAD_NODES).length>=19);});

import {destinationIndicator,routeChevrons,nearbyJunction} from '../src/navigation.js';
import {ROAD_EDGES} from '../src/roads.js';
test('off-screen destination indicator stays in unobstructed screen bounds',()=>{
 const camera={x:-400,y:-500,worldWidth:1400,worldHeight:1300};
 const marker=destinationIndicator(camera,{x:90,y:10},390,680);assert.ok(marker);assert.ok(marker.x>=38&&marker.x<=290);assert.ok(marker.y>=155&&marker.y<=470);
 assert.equal(destinationIndicator({x:0,y:0,worldWidth:390,worldHeight:680},{x:50,y:50},390,680),null);
 const arrows=routeChevrons([[0,0],[100,0],[100,100]]);assert.ok(arrows.length>=4);assert.ok(arrows.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));assert.ok(arrows.some(p=>p.angle===90));
});
test('early turn enters the chosen connected path without cutting a corner',()=>{
 const w=new RoadWalker();w.node='color';const a=ROAD_NODES.color,b=ROAD_NODES.garden,c=ROAD_NODES.pondWest;
 const length=Math.hypot(b.lat-a.lat,b.lng-a.lng)*111195;
 w.move(b.lng-a.lng,b.lat-a.lat,length-3);const before=w.read();w.move(c.lng-b.lng,c.lat-b.lat,6);
 assert.ok(w.edge.a==='garden'||w.edge.b==='garden');assert.ok(w.edge.a==='pondWest'||w.edge.b==='pondWest');assert.ok(roadRoute(w.read(),'gate'));assert.ok(Math.hypot(w.read().lat-before.lat,w.read().lng-before.lng)*111195<=6.01);
 assert.ok(nearbyJunction(b).branches.length>=3);w.move(0,0,10);assert.equal(w.turnIntent,null);
});
test('reverse request still permits retracing the same street',()=>{
 const w=new RoadWalker();const initial=w.read();w.move(0,1,8);const forward=w.read();w.move(initial.lng-forward.lng,initial.lat-forward.lat,4);assert.ok(Math.hypot(w.read().lng-initial.lng,w.read().lat-initial.lat)<Math.hypot(forward.lng-initial.lng,forward.lat-initial.lat));assert.ok(roadRoute(w.read(),'color'));
});
test('changed diagonal input corrects a just-entered wrong branch via its junction',()=>{
 const w=new RoadWalker();w.node='color';w.move(1,-.7,.5);assert.ok(w.edge.a==='park'||w.edge.b==='park');const before=w.read();w.move(1,1,3);assert.ok(w.edge.a==='garden'||w.edge.b==='garden');assert.ok(roadRoute(w.read(),'gate'));assert.ok(Math.hypot(w.read().lng-before.lng,w.read().lat-before.lat)*111195<=3.01);
});

import {nearbyDream} from '../src/geo.js';
test('nearest eligible dream is discovered from position, with stable overlap ties',()=>{
 const tasks=[{id:'a',test:{lat:0,lng:0},radiusMeters:30},{id:'b',test:{lat:0,lng:.0002},radiusMeters:30}];
 assert.equal(nearbyDream(tasks,p(0,.00019),'sim').task.id,'b');assert.equal(nearbyDream(tasks,p(0,0),'sim').task.id,'a');
 assert.equal(nearbyDream([{...tasks[0],radiusMeters:1},tasks[1]],p(0,.00002),'sim').task.id,'b');
 assert.equal(nearbyDream([tasks[0],{...tasks[0],id:'same'}],p(),'sim').task.id,'a');
 assert.equal(nearbyDream(tasks,p(.01),'sim').result.allowed,false);assert.equal(nearbyDream(TASKS,p(),'real').result.allowed,false);
 for(const task of TASKS)assert.equal(nearbyDream(TASKS,{...ROAD_NODES[task.id],accuracy:0,timestamp:Date.now()},'sim').task.id,task.id);
});

import {stableNearbyDream} from '../src/geo.js';
test('nearby hysteresis prevents boundary flicker but never blocks an eligible arrival',()=>{
 const tasks=[{id:'a',test:{lat:0,lng:0},radiusMeters:30},{id:'b',test:{lat:0,lng:.0004},radiusMeters:30}];
 assert.equal(stableNearbyDream(tasks,p(0,.00021),'sim','a').task.id,'a');
 assert.equal(stableNearbyDream(tasks,p(0,.00025),'sim','a').task.id,'b');
 assert.equal(stableNearbyDream(tasks,p(0,.00028),'sim','a').task.id,'b');
 assert.equal(stableNearbyDream(tasks,p(),'real','a').result.allowed,false);
});

import {npcPatrolPose,npcDialogue} from '../src/npc.js';
test('NPC pauses before turning and keeps culture separate from challenge instructions',()=>{
 assert.equal(npcPatrolPose(500).walking,false);assert.equal(npcPatrolPose(3000).walking,true);
 assert.equal(npcPatrolPose(9500).walking,false);assert.equal(npcPatrolPose(9500).returning,false);
 assert.equal(npcPatrolPose(10500).walking,false);assert.equal(npcPatrolPose(10500).returning,true);
 assert.equal(npcPatrolPose(15000).walking,true);assert.equal(npcPatrolPose(19500).walking,false);
 assert.deepEqual(npcPatrolPose(3000),npcPatrolPose(23000));
 for(const task of TASKS){const pages=npcDialogue(task);assert.equal(pages.length,3);assert.ok(pages[1].sourceUrl);assert.ok(pages[2].text.includes(task.length+' 次'));assert.ok(pages.every(p=>p.text.length<100));}
});

test('reference-map landmarks share map coordinates and new districts are connected',()=>{
 const museum=ROAD_NODES.color,gate=ROAD_NODES.gate,book=ROAD_NODES.book;
 assert.ok(book.lat>gate.lat&&gate.lat>museum.lat);assert.ok(museum.lng<gate.lng&&gate.lng<book.lng);
 for(const task of TASKS){assert.equal(task.test.lat,ROAD_NODES[task.id].lat);assert.equal(task.test.lng,ROAD_NODES[task.id].lng);}
 for(const id of ['library','libraryEntry','freeMid','freeSouth','temple'])assert.ok(roadRoute(ROAD_NODES.start,id)?.distance>0);
});

test('destination overlay avoids the full player sprite or yields when space is tight',async()=>{
 const {avoidPlayerIndicator}=await import('../src/navigation.js');
 for(const width of [320,390,900])for(const height of [380,550,700])for(const x of [80,width/2,width-80])for(const y of [180,height/2,height-180]){
  const player={x,y},hint={x,y:y-35,angle:0};const safe=avoidPlayerIndicator(hint,player,width,height);
  if(safe)assert.ok(safe.x+76<player.x-34||safe.x-76>player.x+34||safe.y+27<player.y-82||safe.y-27>player.y+24);
 }
});
