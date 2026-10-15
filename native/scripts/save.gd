class_name DreamSave
extends RefCounted
var state := {"player":"male","sim":[],"real":[],"heard":[],"sound":false}
var warning := ""
func _init():
 if FileAccess.file_exists("user://progress.json"):
  var parsed=JSON.parse_string(FileAccess.get_file_as_string("user://progress.json"))
  if parsed is Dictionary:
   if parsed.get("player") in ["male","female"]: state.player=parsed.player
   state.sound=parsed.get("sound",false)==true
   for mode in ["sim","real"]:
    if parsed.get(mode) is Array:
     for id in parsed[mode]:
      if id in ["color","gate","book"] and not id in state[mode]: state[mode].append(id)
   if parsed.get("heard") is Array: state.heard=parsed.heard
  else: warning="存檔無法讀取，已開啟新旅程"
func persist():
 var f=FileAccess.open("user://progress.tmp",FileAccess.WRITE)
 if f==null: warning="無法儲存，離開遊戲後進度可能遺失";return
 f.store_string(JSON.stringify(state));f.close()
 var err=DirAccess.rename_absolute("user://progress.tmp","user://progress.json")
 if err!=OK: warning="存檔寫入失敗，本次進度仍保留"
func award(mode: String,id: String) -> bool:
 if id in state[mode]:return false
 state[mode].append(id);persist();return true
func reset(mode: String):
 state[mode]=[]
 state.heard=state.heard.filter(func(v):return not str(v).begins_with(mode+":"))
 persist()
