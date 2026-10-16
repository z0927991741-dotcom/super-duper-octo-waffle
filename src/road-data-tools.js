import {STREET_SNAPSHOT} from './street-snapshot.js';
import {streetGraph,GEOMETRY_BOUNDS} from './street-network.js';
import {prepareStreetScene} from './street-plan.js';
import {auditMissionRoads} from './road-audit.js';
import {TASKS} from './config.js';
export function validateRoadDataset(raw){
 if(!Array.isArray(raw?.elements)||raw.elements.length>80000||raw.remark||!raw.elements.some(e=>e.tags?.building&&e.tags.building!=='no'))throw Error('需要包含道路及建築物的完整 OSM 匯出資料。');
 if(!raw.osm3s?.timestamp_osm_base&&!(raw.apiExport&&/^https:\/\/api.openstreetmap.org\//.test(raw.source||''))&&!(raw.geometryVersion===3&&raw.capturedAt&&/^https:\/\/(overpass-api.de|overpass.kumi.systems|www.openstreetmap.org|api.openstreetmap.org)\//.test(raw.source||'')))throw Error('資料缺少 OSM 來源或時間資訊。');
 const graph=streetGraph(raw.elements,GEOMETRY_BOUNDS),scene=prepareStreetScene(graph,TASKS),audit=auditMissionRoads(scene,TASKS);
 return {version:1,geometryVersion:3,bounds:GEOMETRY_BOUNDS,status:'packaged',source:raw.source||'https://www.openstreetmap.org/copyright',license:'ODbL-1.0',capturedAt:raw.osm3s?.timestamp_osm_base||raw.capturedAt,apiExport:!!raw.apiExport,osm3s:raw.osm3s||null,elements:raw.elements,audit};
}
function saveRoadDownload(data,type,name){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function packageRoadHtml(raw,documentRoot=document.documentElement){
 const snapshot=validateRoadDataset(raw),clone=documentRoot.cloneNode(true),script=[...clone.querySelectorAll('script')].find(s=>/^const STREET_SNAPSHOT=/m.test(s.textContent));
 if(!script)throw Error('請從公開的單檔網頁版下載內建道路版本。');
 const json=JSON.stringify(snapshot).replace(/</g,'\\u003c');script.textContent=script.textContent.replace(/^const STREET_SNAPSHOT=.*;\s*$/m,()=> 'const STREET_SNAPSHOT='+json+';');
 clone.querySelector('#app')?.replaceChildren();clone.querySelectorAll('dialog').forEach(d=>d.remove());
 return '<!doctype html>\n'+clone.outerHTML;
}
export function mountRoadDataTools(host,storage){
 const panel=document.createElement('details');panel.className='road-data-tools';panel.innerHTML='<summary>道路資料與內建道路網頁</summary><p>成功取得道路與建築物後，可下載內建資料的網頁，減少對道路服務的依賴。底圖圖塊仍可能需要網路；道路資料驗證不等於戶外實測。</p><button type="button" class="secondary" id="download-road-game">下載內建道路網頁</button><label>匯入 OSM 道路與建築物 JSON<input id="import-road-json" type="file" accept="application/json,.json"></label><button type="button" id="apply-road-json" class="secondary" hidden>套用並重新整理</button><p id="road-tool-feedback" role="status"></p>';host.append(panel);
 const feedback=panel.querySelector('#road-tool-feedback');
 panel.querySelector('#download-road-game').onclick=()=>{try{const raw=STREET_SNAPSHOT.elements?.length?STREET_SNAPSHOT:JSON.parse(storage.getItem('dream-mender:osm-geometry:v3')||'null');if(!raw)throw Error('請先成功載入道路資料，或匯入 OSM JSON。');saveRoadDownload(packageRoadHtml(raw),'text/html;charset=utf-8','DreamMender-road-ready.html');feedback.textContent='已下載內建道路網頁；三景點資料連通及碰撞檢查通過，仍需戶外實測。';}catch(error){feedback.textContent=error.message;}};
 panel.querySelector('#import-road-json').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>12*1024*1024)throw Error('資料檔超過 12 MB，請只匯出遊戲區域。');const raw=JSON.parse(await file.text()),snapshot=validateRoadDataset(raw);storage.setItem('dream-mender:osm-geometry:v3',JSON.stringify(snapshot));feedback.textContent='已保存資料，三景點路網驗證通過；角色與任務存檔不會清除。';panel.querySelector('#apply-road-json').hidden=false;}catch(error){feedback.textContent=error.message;}};
 panel.querySelector('#apply-road-json').onclick=()=>location.reload();
}
