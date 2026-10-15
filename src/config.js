// 純玩法測試座標，位於赤道附近；不是屏東地標位置。正式資料必須附可查證來源。
export const SETTINGS = { radiusMeters:30, maxAccuracyMeters:25, maxAgeMs:15000, speedMetersPerSecond:20, turnBufferMeters:10, turnCorrectionMeters:3, reverseDotThreshold:.85, minimumTurnDot:.25, start:{lat:0.00012,lng:0.0003}, bounds:{minLat:-0.00135,maxLat:0.00375,minLng:-0.001,maxLng:0.0035} };
export const TASKS = [
 {id:'color',name:'色彩之夢',place:'屏東美術館外',length:4,radiusMeters:SETTINGS.radiusMeters,entranceNode:'color',test:{lat:0.000675,lng:0.00045},official:null,verified:false,source:null,icon:'✿',symbols:['✿','☀','♥','✦'],label:'讓沉睡的花園，再次盛開。'},
 {id:'gate',name:'古城之夢',place:'阿猴城門（朝陽門）',length:5,radiusMeters:SETTINGS.radiusMeters,entranceNode:'gate',test:{lat:0.001314,lng:0.001125},official:null,verified:false,source:null,icon:'♜',symbols:['♜','☾','✧','⚑'],label:'找回古城裡，遺忘的星光。'},
 {id:'book',name:'書本之夢',place:'屏東書院外',length:6,radiusMeters:SETTINGS.radiusMeters,entranceNode:'book',test:{lat:0.002415,lng:0.001425},official:null,verified:false,source:null,icon:'▤',symbols:['▤','✎','❀','★'],label:'把散落的故事，一頁頁接回。'}
];
export const officialReady = task => task.verified === true && !!task.source && Number.isFinite(task.official?.lat) && Math.abs(task.official.lat)<=90 && Number.isFinite(task.official?.lng) && Math.abs(task.official.lng)<=180;
