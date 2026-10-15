import test from 'node:test';
import assert from 'node:assert/strict';
import {arrival} from '../src/geo.js';
import {RealLocation} from '../src/location.js';
const now=1700000000000;
const task={verified:true,source:'https://example.org/center-fixture',official:{lat:0,lng:0},radiusMeters:30,entrance:{lat:0.001,lng:0,verified:true,source:'https://example.org/entrance-fixture'}};
const pos=(lat,accuracy=5,timestamp=now)=>({lat,lng:0,accuracy,timestamp});
test('real arrival uses independently verified entrance, never center',()=>{
 assert.equal(arrival(task,pos(0),'real',now).allowed,false);
 assert.equal(arrival(task,pos(.001),'real',now).allowed,true);
 for(const entrance of [null,{...task.entrance,verified:false},{...task.entrance,source:null},{...task.entrance,lat:91}]) assert.equal(arrival({...task,entrance},pos(.001),'real',now).allowed,false);
 assert.equal(arrival(task,pos(.001+29/111195),'real',now).allowed,true);
 assert.equal(arrival(task,pos(.001+31/111195),'real',now).allowed,false);
 for(const p of [pos(.001,26),pos(.001,5,now-15001),pos(.001,5,now+1001)])assert.equal(arrival(task,p,'real',now).allowed,false);
});
test('GPS permission errors, retry, stopped callbacks and watch options',()=>{
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const watches=[],cleared=[],positions=[],errors=[];
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{watchPosition(ok,error,options){watches.push({ok,error,options});return watches.length;},clearWatch(id){cleared.push(id);}}}});
 try{
  const gps=new RealLocation();gps.start(p=>positions.push(p),e=>errors.push(e));
  assert.deepEqual(watches[0].options,{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  for(const code of [1,2,3])watches[0].error({code});
  assert.match(errors[0],/權限遭拒/);assert.match(errors[1],/無法取得位置/);assert.match(errors[2],/逾時/);
  gps.start(p=>positions.push(p),e=>errors.push(e));
  const sample={coords:{latitude:22,longitude:120,accuracy:10},timestamp:now};
  watches[0].ok(sample);assert.equal(positions.length,0);
  watches[1].ok(sample);assert.equal(positions.length,1);
  gps.stop();watches[1].ok(sample);watches[1].error({code:1});
  assert.equal(positions.length,1);assert.equal(errors.length,3);assert.deepEqual(cleared,[1,2]);
  window.isSecureContext=false;gps.start(()=>{},e=>errors.push(e));assert.match(errors.at(-1),/HTTPS/);
 }finally{
  if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else delete globalThis.window;
 }
});
