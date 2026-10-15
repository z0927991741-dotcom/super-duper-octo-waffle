// 純玩法測試座標，位於赤道附近；不是屏東地標位置。正式資料必須附可查證來源。
export const MAP_ANCHORS={nw:[268,370],book:[430,340],bookRoad:[410,405],freeMid:[790,800],freeSouth:[660,1120],libraryEntry:[1090,430],library:[1130,110],temple:[-65,1215],ne:[855,535],west:[230,573],gate:[355,613],east:[545,697],color:[180,775],park:[365,870],southeast:[480,925],start:[120,960],farwest:[-250,735],westnorth:[-115,410],northwest:[80,20],north:[480,70],northeast:[1100,40],fareast:[1120,700],eastpark:[1050,1180],south:[400,1320],southwest:[-160,1190]};
export function mapTestPoint(id){const [x,y]=MAP_ANCHORS[id];return {lat:(1000-y)*.000003,lng:x*.0000025};}
export const SETTINGS = { radiusMeters:30, missionSwitchMarginMeters:8, mapDetailZoom:2, maxAccuracyMeters:25, maxAgeMs:15000, speedMetersPerSecond:20, turnBufferMeters:12, turnCorrectionMeters:3, reverseDotThreshold:.85, minimumTurnDot:.25, start:{lat:0.00012,lng:0.0003}, bounds:{minLat:-0.00135,maxLat:0.00375,minLng:-0.001,maxLng:0.0035} };
export const TASKS = [
 {id:'color',name:'色彩之夢',place:'屏東美術館外',length:4,radiusMeters:SETTINGS.radiusMeters,entranceNode:'color',test:mapTestPoint('color'),official:null,verified:false,source:null,entrance:null,icon:'✿',symbols:['✿','☀','♥','✦'],label:'讓沉睡的花園，再次盛開。'},
 {id:'gate',name:'古城之夢',place:'阿猴城門（朝陽門）',length:5,radiusMeters:SETTINGS.radiusMeters,entranceNode:'gate',test:mapTestPoint('gate'),official:null,verified:false,source:null,entrance:null,icon:'♜',symbols:['♜','☾','✧','⚑'],label:'找回古城裡，遺忘的星光。'},
 {id:'book',name:'書本之夢',place:'屏東書院外',length:6,radiusMeters:SETTINGS.radiusMeters,entranceNode:'book',test:mapTestPoint('book'),official:null,verified:false,source:null,entrance:null,icon:'▤',symbols:['▤','✎','❀','★'],label:'把散落的故事，一頁頁接回。'}
];
const validCoordinate = point => Number.isFinite(point?.lat) && Math.abs(point.lat)<=90 && Number.isFinite(point?.lng) && Math.abs(point.lng)<=180;
export const entranceReady = task => task.entrance?.verified === true && typeof task.entrance.source === 'string' && /^https:\/\//.test(task.entrance.source) && validCoordinate(task.entrance);
export const officialReady = task => task.verified === true && !!task.source && Number.isFinite(task.official?.lat) && Math.abs(task.official.lat)<=90 && Number.isFinite(task.official?.lng) && Math.abs(task.official.lng)<=180;
