// 純玩法測試座標，位於赤道附近；不是屏東地標位置。正式資料必須附可查證來源。
export const SETTINGS = { radiusMeters:30, maxAccuracyMeters:25, maxAgeMs:15000, speedMetersPerSecond:20, start:{lat:-0.00065,lng:-0.0007}, bounds:{minLat:-0.001,maxLat:0.001,minLng:-0.0013,maxLng:0.0013} };
export const TASKS = [
 {id:'color',name:'色彩之夢',place:'屏東美術館外',length:2,radiusMeters:SETTINGS.radiusMeters,test:{lat:0.00045,lng:-0.00065},official:null,verified:false,source:null,icon:'✿',symbols:['✿','☀','♥','✦'],label:'讓沉睡的花園，再次盛開。'},
 {id:'gate',name:'古城之夢',place:'阿猴城門（朝陽門）',length:3,radiusMeters:SETTINGS.radiusMeters,test:{lat:0.0003,lng:0.0007},official:null,verified:false,source:null,icon:'♜',symbols:['♜','☾','✧','⚑'],label:'找回古城裡，遺忘的星光。'},
 {id:'book',name:'書本之夢',place:'屏東書院外',length:4,radiusMeters:SETTINGS.radiusMeters,test:{lat:-0.0005,lng:0.00055},official:null,verified:false,source:null,icon:'▤',symbols:['▤','✎','❀','★'],label:'把散落的故事，一頁頁接回。'}
];
export const officialReady = task => task.verified === true && !!task.source && Number.isFinite(task.official?.lat) && Math.abs(task.official.lat)<=90 && Number.isFinite(task.official?.lng) && Math.abs(task.official.lng)<=180;
