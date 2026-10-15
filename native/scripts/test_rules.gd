extends SceneTree
func _initialize():
 var data:Dictionary=JSON.parse_string(FileAccess.get_file_as_string("res://data/game.json"))
 var settings:Dictionary=data.settings
 var now=Time.get_unix_time_from_system()*1000
 var fix={"lat":22.6,"lng":120.4,"accuracy":5,"timestamp":now}
 assert(DreamRules.issue(fix,settings,now)=="")
 var bad=fix.duplicate();bad.accuracy=100;assert(DreamRules.issue(bad,settings,now).contains("精度"))
 bad=fix.duplicate();bad.timestamp=now-16000;assert(DreamRules.issue(bad,settings,now).contains("過期"))
 bad=fix.duplicate();bad.mock=true;assert(DreamRules.issue(bad,settings,now).contains("測試定位"))
 var t:Dictionary=data.tasks[0].duplicate(true)
 assert(not DreamRules.arrival(t,fix,settings,true).allowed)
 # Fictional fixture for the same real-mode rule, never written to mission data.
 t.official={"lat":fix.lat,"lng":fix.lng};t.verified=true;t.source="test fixture"
 assert(DreamRules.arrival(t,fix,settings,true).allowed)
 bad=fix.duplicate();bad.lng+=.001;assert(not DreamRules.arrival(t,bad,settings,true).allowed)
 var c=DreamChallenge.new(6);assert(c.press(0)=="ignored");c.ready();assert(c.press((c.sequence[0]+1)%4)=="wrong");c.ready()
 for i in c.sequence:c.press(i)
 assert(c.phase=="won");assert(c.press(0)=="ignored")
 var walker=DreamWalker.new(data);var start=walker.position();walker.move(Vector2.ZERO,1);assert(walker.position()==start);walker.move(Vector2(0,-1),1);assert(walker.moving)
 print("DREAM_NATIVE_RULES_OK: location validation, real boundary, input locking, retry, unique completion, road movement")
 quit()
