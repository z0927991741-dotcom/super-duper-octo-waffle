import {SETTINGS,TASKS} from './config.js';
const FIELD_KEY='dream-mender:field-points:v1';
export function fieldPointReady(p){return !!p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=SETTINGS.maxAccuracyMeters&&Number.isFinite(p.timestamp)&&p.timestamp>0;}
export function readFieldPoints(storage){try{const raw=JSON.parse(storage.getItem(FIELD_KEY)||'{}');return Object.fromEntries(TASKS.filter(t=>fieldPointReady(raw?.[t.id])).map(t=>[t.id,raw[t.id]]));}catch{return {};}}
export function writeFieldPoints(storage,points){storage.setItem(FIELD_KEY,JSON.stringify(points));}
export function fieldTasks(points){return TASKS.map(t=>({...t,place:t.name+'・私人測試點',official:null,verified:false,source:null,entrance:null,fieldPoint:fieldPointReady(points[t.id])?points[t.id]:null}));}
