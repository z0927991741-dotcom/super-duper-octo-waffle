class_name DreamRules
extends RefCounted

static func distance(a: Dictionary, b: Dictionary) -> float:
 var r := PI / 180.0
 var h := pow(sin((b.lat-a.lat)*r/2),2)+cos(a.lat*r)*cos(b.lat*r)*pow(sin((b.lng-a.lng)*r/2),2)
 return 6371000.0*2*atan2(sqrt(h),sqrt(maxf(0,1-h)))

static func issue(fix: Dictionary, settings: Dictionary, now: float) -> String:
 if fix.get("mock",false): return "目前為裝置測試定位，不能記錄實地完成"
 if not fix.has("lat") or not fix.has("lng"): return "尚未取得定位，請按啟用／重試定位"
 if not is_finite(float(fix.lat)) or not is_finite(float(fix.lng)) or absf(float(fix.lat))>90 or absf(float(fix.lng))>180: return "位置資料無效，請重試"
 if now-float(fix.get("timestamp",0))>settings.maxAgeMs or now<float(fix.get("timestamp",0))-1000: return "定位已過期，請重試"
 if float(fix.get("accuracy",9999))>settings.maxAccuracyMeters or float(fix.get("accuracy",-1))<0: return "定位精度不足，請移至空曠處重試"
 return ""

static func ready(task: Dictionary) -> bool:
 if not task.get("verified",false) or not task.get("official") is Dictionary or str(task.get("source", "")) in ["", "<null>"]:return false
 var p:Dictionary=task.official
 return p.has("lat") and p.has("lng") and is_finite(float(p.lat)) and is_finite(float(p.lng)) and absf(float(p.lat))<=90 and absf(float(p.lng))<=180

static func arrival(task: Dictionary, fix: Dictionary, settings: Dictionary, real: bool, route_meters: float=-1) -> Dictionary:
 if real and not ready(task): return {"allowed":false,"distance":-1.0,"reason":"正式座標尚未查證，實地任務暫不開放"}
 var problem := issue(fix,settings,Time.get_unix_time_from_system()*1000)
 if problem!="": return {"allowed":false,"distance":-1.0,"reason":problem}
 var d := distance(fix,task.official if real else task.test)
 if not real: d=maxf(d,route_meters)
 var arrived := d<=float(task.radiusMeters)
 return {"allowed":arrived,"distance":d,"reason":"已抵達，停步後開始修補" if arrived else "沿路靠近這段記憶"}
