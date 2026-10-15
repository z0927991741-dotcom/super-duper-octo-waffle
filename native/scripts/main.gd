extends Control
var data:Dictionary
var save:=DreamSave.new()
var walker:DreamWalker
var mode:="sim"
var screen:="home"
var column:VBoxContainer
var content:ScrollContainer
var map_view:DreamMap
var stick:DreamJoystick
var info:Label
var action:Button
var status:Label
var task:Dictionary={}
var gps_fix:Dictionary={}
var gps_message:="尚未啟用定位"
var gps:Object
var awaiting_gps:=false
var request_started:=0.0
var poll:=0.0
var game:DreamChallenge
var pads:Array[Button]=[]
var epoch:=0
var dialogue_page:=-1
var npc:DreamArt
var npc_clock:=0.0
var shot:=Rect2()
var shot_target:=Rect2()
var npc_stage:Control
var chosen:="male"
var tone:AudioStreamPlayer
var banner:Label

func _ready():
 data=JSON.parse_string(FileAccess.get_file_as_string("res://data/game.json"));walker=DreamWalker.new(data)
 mode="real" if OS.get_name()=="Android" else "sim"
 if Engine.has_singleton("DreamLocation"):gps=Engine.get_singleton("DreamLocation")
 tone=AudioStreamPlayer.new();add_child(tone)
 chosen=save.state.player;show_home()
 if "--self-test" in OS.get_cmdline_user_args():run_self_test()
 if "--ui-test" in OS.get_cmdline_user_args():ui_test()

func clear(title:String):
 epoch+=1
 if is_instance_valid(content):content.queue_free();remove_child(content)
 map_view=null;stick=null;npc=null;npc_stage=null;info=null;action=null;status=null
 content=ScrollContainer.new();content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);add_child(content)
 column=VBoxContainer.new();column.size_flags_horizontal=Control.SIZE_EXPAND_FILL;column.add_theme_constant_override("separation",12);content.add_child(column)
 var margin=MarginContainer.new();margin.add_theme_constant_override("margin_left",20);margin.add_theme_constant_override("margin_right",20);margin.add_theme_constant_override("margin_top",18)
 content.remove_child(column);content.add_child(margin);margin.size_flags_horizontal=Control.SIZE_EXPAND_FILL;margin.add_child(column)
 var background=StyleBoxFlat.new();background.bg_color=Color("f3eedc");content.add_theme_stylebox_override("panel",background)
 label("✦ 夢境修補員",26)
 var bar=HBoxContainer.new();column.add_child(bar)
 label_to(bar,"真實定位模式" if mode=="real" else "模擬定位模式",16)
 button_to(bar,"♫ 音效："+("開" if save.state.sound else "關"),func():save.state.sound=not save.state.sound;save.persist();refresh())
 label(title,30)
 if save.warning!="":banner=label(save.warning,14)
func label(text:String,font_size:int=20)->Label:return label_to(column,text,font_size)
func label_to(parent:Node,text:String,font_size:int=20)->Label:
 var l=Label.new();l.text=text;l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;l.add_theme_font_size_override("font_size",font_size);l.add_theme_color_override("font_color",Color("53604d"));l.size_flags_horizontal=Control.SIZE_EXPAND_FILL;parent.add_child(l);return l
func button(text:String,callback:Callable)->Button:return button_to(column,text,callback)
func button_to(parent:Node,text:String,callback:Callable)->Button:
 var b=Button.new();b.text=text;b.custom_minimum_size=Vector2(0,52);b.size_flags_horizontal=Control.SIZE_EXPAND_FILL;b.add_theme_font_size_override("font_size",20);b.add_theme_color_override("font_color",Color("fff9e7"));var style=StyleBoxFlat.new();style.bg_color=Color("aa654c");style.set_corner_radius_all(13);style.content_margin_left=12;style.content_margin_right=12;b.add_theme_stylebox_override("normal",style);parent.add_child(b);b.pressed.connect(callback);return b
func refresh():
 match screen:
  "home":show_home()
  "choose":show_choose()
  "explore":show_explore()
  "npc":show_npc()
  "challenge":show_challenge()
  "win":show_win()
  "ending":show_ending()
func footer():label("請停步後再操作，留意周遭環境",16)
func show_home():
 screen="home";clear("夢境修補員")
 label("走進屏東街角，修補三段遺落的記憶。",22)
 for t in data.tasks:
  var r=TextureRect.new();r.texture=load("res://assets/"+t.id+".png");r.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;r.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;r.custom_minimum_size=Vector2(0,100);column.add_child(r)
 button("開始／繼續旅程 →",show_choose);label("完成三個記憶挑戰，收集夢境碎片。素材已內建，可離線遊玩。",18);footer()
func show_choose():
 screen="choose";chosen=save.state.player;render_choose()
func render_choose():
 clear("選擇你的修補員")
 var row=HBoxContainer.new();column.add_child(row)
 for id in ["male","female"]:
  var box=VBoxContainer.new();box.size_flags_horizontal=Control.SIZE_EXPAND_FILL;row.add_child(box)
  var art=DreamArt.new();art.custom_minimum_size=Vector2(0,300);box.add_child(art);art.configure("res://assets/"+id+"-portrait.png",Vector2(1408,768),data.players[id].portraitBox)
  button_to(box,("✓ " if chosen==id else "")+("男性玩家" if id=="male" else "女性玩家"),func():chosen=id;render_choose())
 button("以這個角色出發 →",func():save.state.player=chosen;save.persist();show_explore())
 button("返回首頁",show_home);footer()
func show_explore():
 screen="explore";clear("沿路找回城市記憶")
 
 var modes=HBoxContainer.new();column.add_child(modes)
 button_to(modes,"實地 GPS",func():mode="real";show_explore())
 button_to(modes,"模擬試玩",func():
  mode="sim"
  if gps!=null:gps.stop_fix()
  show_explore())
 label("夢境碎片 %d / 3"%save.state[mode].size(),22)
 if mode=="sim":
  label("Q 版示意圖・非實際導航地圖",16)
  map_view=DreamMap.new();map_view.data=data;map_view.walker=walker;map_view.avatar=save.state.player;map_view.completed=save.state[mode];column.add_child(map_view)
  stick=DreamJoystick.new();map_view.add_child(stick);stick.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT);stick.position=Vector2(-140,-140)
  var row=HBoxContainer.new();column.add_child(row);button_to(row,"−",func():map_view.zoom=maxf(.2,map_view.zoom-.15));button_to(row,"＋",func():map_view.zoom=minf(1.6,map_view.zoom+.15))
 else:
  label("真實模式依 GPS 距離判定，不將位置投影到示意圖。",18)
  button("啟用／重試定位",request_gps)
 info=label("",19);status=label("",17)
 action=button("靠近後開始修補",start_npc)
 if mode=="sim":
  label("WASD／方向鍵或圓形搖桿移動・沿路前進",16)
 for t in data.tasks:
  button(("✓ " if t.id in save.state[mode] else "◇ ")+t.place+" · 記憶 %d 個"%t.length,func():show_journal(t))
 if save.state[mode].size()==3:button("查看完整夢境",show_ending)
 button("更換角色",show_choose);button("重設目前模式進度",confirm_reset);button("返回首頁",show_home);footer();update_location()
func show_journal(t:Dictionary):
 screen="journal";clear(t.place)
 var art=TextureRect.new();art.texture=load("res://assets/"+t.id+".png");art.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;art.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;art.custom_minimum_size=Vector2(0,200);column.add_child(art)
 label(t.dialogue[1].text if t.id in save.state[mode] else "修補這裡的夢境，解鎖文化故事。",21)
 if t.id in save.state[mode]:button("查閱文化資料來源",func():OS.shell_open(t.dialogue[1].sourceUrl))
 button("查閱地點（外部地圖）",func():OS.shell_open("https://www.google.com/maps/search/?api=1&query="+("屏東 "+t.place).uri_encode()))
 button("返回探索",show_explore)
func request_gps():
 gps_fix={};awaiting_gps=true;request_started=Time.get_ticks_msec();gps_message="正在取得定位…"
 if gps==null:gps_message="此版本未提供原生定位；Windows 請使用模擬定位";awaiting_gps=false;return
 gps.request_fix()
func update_location():
 if not is_instance_valid(info):return
 var fix=walker.fix() if mode=="sim" else gps_fix
 var best:Dictionary={};var distance=INF;var allowed=false
 for t in data.tasks:
  var result=DreamRules.arrival(t,fix,data.settings,mode=="real",walker.route(t.id) if mode=="sim" else -1)
  var d=float(result.distance) if result.distance>=0 else INF
  if best.is_empty() or (result.allowed and not allowed) or (result.allowed==allowed and d<distance):best={"task":t,"result":result};distance=d;allowed=result.allowed
 task=best.task;action.disabled=not allowed
 action.text=("再次修補 ↻" if task.id in save.state[mode] else "修補夢境 ✦") if allowed else "靠近後開始修補"
 info.text=task.place+"\n"+("距離 %d 公尺"%ceil(distance) if is_finite(distance) else "距離尚無有效資料")+"\n"+best.result.reason
 if mode=="real":
  var accuracy="精度 ±%d 公尺"%float(fix.accuracy) if fix.has("accuracy") else "尚無定位精度"
  var age="，資料 %d 秒前"%maxf(0,(Time.get_unix_time_from_system()*1000-float(fix.get("timestamp",0)))/1000) if fix.has("timestamp") else ""
  status.text=gps_message+"\n"+accuracy+age
 else:status.text="抵達後可修補・完成挑戰才獲得碎片"
func _process(dt):
 if screen=="explore":
  if mode=="sim" and is_instance_valid(map_view):
   var input=Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
   if is_instance_valid(stick) and stick.value.length()>.1:input=stick.value
   var previous=walker.position();walker.move(input,dt);var delta=walker.position()-previous
   if walker.moving:map_view.facing=("right" if delta.x>0 else "left") if absf(delta.x)>absf(delta.y) else ("down" if delta.y>0 else "up")
  poll+=dt
  if poll>.25:
   poll=0
   if mode=="real" and gps!=null and awaiting_gps:
    var result=JSON.parse_string(gps.get_fix_json())
    if result is Dictionary:
     gps_message=result.get("message","等待定位")
     if result.has("lat"):gps_fix=result
     else:gps_fix={}
    if gps_fix.is_empty() and Time.get_ticks_msec()-request_started>20000:gps_message="定位逾時，請到空曠處重試";awaiting_gps=false;gps.stop_fix()
   update_location()
 if screen=="npc" and is_instance_valid(npc):
  if dialogue_page<0:
   npc_clock+=dt;var time=fmod(npc_clock,20);var returning=time>=10;var travel=time-11 if returning else time-1
   var frame=1+int(maxf(0,travel)/.18)%4 if travel>0 and travel<8 else 0
   var progress=clampf(travel/8,0,1);if returning:progress=1-progress
   npc.position=Vector2(12+progress*(npc_stage.size.x-152),10);npc.flip=returning;var box:Array=task.frames[frame];npc.crop=Rect2(box[0],box[1],box[2],box[3]);npc.queue_redraw()
  else:
   shot=Rect2(shot.position.lerp(shot_target.position,minf(dt*8,1)),shot.size.lerp(shot_target.size,minf(dt*8,1)));npc.crop=shot;npc.queue_redraw()
func start_npc():
 var result=DreamRules.arrival(task,walker.fix() if mode=="sim" else gps_fix,data.settings,mode=="real",walker.route(task.id) if mode=="sim" else -1)
 if not result.allowed:update_location();return
 dialogue_page=-1;show_npc()
func show_npc():
 screen="npc";clear(task.name+" · "+task.place)
 npc_stage=Control.new();npc_stage.clip_contents=true;npc_stage.custom_minimum_size=Vector2(0,300);column.add_child(npc_stage)
 var bg=TextureRect.new();bg.texture=load("res://assets/"+task.id+".png");bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);bg.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;bg.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;npc_stage.add_child(bg);bg.modulate=Color(1,1,1,.45 if dialogue_page>=0 else 1)
 npc=DreamArt.new();npc_stage.add_child(npc)
 var a:Dictionary=task.art.sheet if dialogue_page<0 else task.art.portrait
 npc.configure("res://assets/"+task.id+("-sheet.png" if dialogue_page<0 else "-portrait.png"),Vector2(a.size[0],a.size[1]),task.frames[0] if dialogue_page<0 else a.box)
 if dialogue_page<0:npc.size=Vector2(140,270)
 else:
  npc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);var box:Array=task.shots[dialogue_page];shot_target=Rect2(box[0],box[1],box[2],box[3]);if dialogue_page==0:shot=npc.crop
 label(task.npc.name,20)
 if dialogue_page<0:
  button("談話 💬",func():dialogue_page=0;show_npc())
  if (mode+":"+task.id) in save.state.heard:button("已聽過，直接開始挑戰",start_memory)
 else:
  label("%d／3 · "%[dialogue_page+1]+task.dialogue[dialogue_page].title,21);label(task.dialogue[dialogue_page].text,22)
  if dialogue_page>0:button("上一段",func():dialogue_page-=1;show_npc())
  button("開始記憶挑戰 ✦" if dialogue_page==2 else "繼續聽 →",func():
   if dialogue_page==2:
    if not (mode+":"+task.id) in save.state.heard:save.state.heard.append(mode+":"+task.id);save.persist()
    start_memory()
   else:dialogue_page+=1;show_npc())
 button("返回探索",show_explore);footer()
func start_memory():game=DreamChallenge.new(int(task.length));show_challenge()
func show_challenge():
 screen="challenge";clear(task.name);status=label("請記住閃爍順序",22);pads=[]
 var grid=GridContainer.new();grid.columns=2;grid.add_theme_constant_override("h_separation",14);grid.add_theme_constant_override("v_separation",14);column.add_child(grid)
 for i in range(4):
  var b=button_to(grid,task.symbols[i],func():press_pad(i));b.custom_minimum_size.y=135;b.add_theme_font_size_override("font_size",56);var pad_style=StyleBoxFlat.new();pad_style.bg_color=Color(["c47d88","7099bc","b39351","9378b5"][i]);pad_style.set_corner_radius_all(18);pad_style.border_color=Color("fff0c9");pad_style.set_border_width_all(3);b.add_theme_stylebox_override("normal",pad_style);b.add_theme_stylebox_override("disabled",pad_style);pads.append(b)
 button("重新觀看順序",func():if game.phase!="show":play_sequence())
 button("離開挑戰",show_explore);footer();play_sequence()
func beep(index:int):
 if not save.state.sound:return
 var stream=AudioStreamWAV.new();stream.mix_rate=22050;stream.format=AudioStreamWAV.FORMAT_16_BITS
 var bytes=PackedByteArray();bytes.resize(4400*2)
 for i in range(4400):bytes.encode_s16(i*2,int(sin(TAU*[392,494,587,784][index]*i/22050.0)*5000*(1-i/4400.0)))
 stream.data=bytes;tone.stream=stream;tone.play()
func play_sequence():
 game.phase="show";game.cursor=0;var token=epoch
 for b in pads:b.disabled=true;b.modulate=Color.WHITE
 status.text="先看順序，展示時不能輸入"
 await get_tree().create_timer(.6).timeout
 for i in range(game.sequence.size()):
  if token!=epoch:return
  var index=game.sequence[i];status.text="觀看第 %d／%d 個"%[i+1,game.sequence.size()];pads[index].modulate=Color(1.7,1.7,.6);pads[index].scale=Vector2(1.06,1.06);beep(index)
  await get_tree().create_timer(.65).timeout
  if token!=epoch:return
  pads[index].modulate=Color.WHITE;pads[index].scale=Vector2.ONE
  await get_tree().create_timer(.3).timeout
 if token!=epoch:return
 game.ready();for b in pads:b.disabled=false
 status.text="換你了！第 1／%d 個"%game.sequence.size()
func press_pad(index:int):
 var result=game.press(index);if result=="ignored":return
 beep(index)
 match result:
  "wrong":
   status.text="順序有一點不同，別擔心！按重新觀看即可重試。";for b in pads:b.disabled=true
  "correct":status.text="記住了！下一個：%d／%d"%[game.cursor+1,game.sequence.size()]
  "won":save.award(mode,task.id);show_win()
func show_win():
 screen="win";clear("✦ 夢境恢復色彩！");label("已收藏 %d／3 塊碎片"%save.state[mode].size(),26)
 var art=TextureRect.new();art.texture=load("res://assets/"+task.id+".png");art.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;art.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;art.custom_minimum_size=Vector2(0,240);column.add_child(art);art.modulate=Color(.3,.3,.3);create_tween().tween_property(art,"modulate",Color.WHITE,1.1)
 label(task.npc.name+"：謝謝你，這段記憶又有了色彩。",23)
 for t in data.tasks:
  if not t.id in save.state[mode]:
   var result=DreamRules.arrival(t,walker.fix() if mode=="sim" else gps_fix,data.settings,mode=="real",walker.route(t.id) if mode=="sim" else -1)
   label("下一段記憶："+t.place+(" · %d 公尺"%ceil(result.distance) if result.distance>=0 else ""),19)
 button("查看完整夢境" if save.state[mode].size()==3 else "繼續探索 →",show_ending if save.state[mode].size()==3 else show_explore)
func show_ending():
 screen="ending";clear("三段記憶，一座完整的夢")
 for t in data.tasks:
  var art=TextureRect.new();art.texture=load("res://assets/"+t.id+".png");art.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;art.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;art.custom_minimum_size=Vector2(0,145);column.add_child(art)
 label("你讓屏東的三段夢境，再次亮起色彩。",24);button("返回探索",show_explore)
func confirm_reset():
 var dialog=ConfirmationDialog.new();dialog.dialog_text="確定清除目前模式的三塊碎片與談話紀錄？另一模式不受影響。";dialog.title="重設進度";dialog.ok_button_text="確認重設";dialog.cancel_button_text="保留進度";add_child(dialog);dialog.confirmed.connect(func():save.reset(mode);show_explore());dialog.popup_centered(Vector2i(400,200))
func _notification(what):
 if what==NOTIFICATION_APPLICATION_PAUSED:
  if gps!=null and gps.is_requesting_permission():return
  if gps!=null:gps.stop_fix();awaiting_gps=false;gps_fix={};gps_message="已暫停定位，回到探索後請按重試"
func run_self_test():
 assert(DreamRules.distance({"lat":0,"lng":0},{"lat":0,"lng":.001})>110)
 for t in data.tasks:assert(walker.route(t.id)<INF)
 var c=DreamChallenge.new(4);assert(c.press(0)=="ignored");c.ready();for i in c.sequence:c.press(i)
 assert(c.phase=="won");assert(c.press(0)=="ignored")
 print("DREAM_NATIVE_SELF_TEST_OK");get_tree().quit()

func ui_test():
 await get_tree().create_timer(.4).timeout
 await screenshot("home")
 show_choose();await screenshot("choose")
 chosen="female";save.state.player=chosen;show_explore();await screenshot("explore")
 assert(action.disabled)
 var start=walker.position();walker.move(Vector2(0,-1),.5);assert(walker.position()!=start)
 for id in ["color","gate","book"]:
  walker.edge={};walker.node=id;update_location();assert(not action.disabled);assert(task.id==id)
  start_npc();await screenshot(id+"-npc")
  dialogue_page=0;show_npc();await screenshot(id+"-dialogue")
  dialogue_page=2;show_npc();await get_tree().create_timer(.8).timeout;await screenshot(id+"-face")
  start_memory();await get_tree().create_timer(1+task.length*.95).timeout
  assert(game.phase=="input")
  press_pad((game.sequence[0]+1)%4);assert(game.phase=="wrong")
  play_sequence();await get_tree().create_timer(1+task.length*.95).timeout
  var seq=game.sequence.duplicate();for i in seq:press_pad(i)
  assert(screen=="win");assert(not save.award(mode,id));show_explore()
 assert(save.state.sim.size()==3);show_ending();await screenshot("ending")
 var persisted=DreamSave.new();assert(persisted.state.sim.size()==3)
 mode="real";show_explore();assert(action.disabled);assert(save.state.real.size()==0)
 save.reset("sim");assert(save.state.sim.size()==0)
 print("DREAM_NATIVE_UI_TEST_OK: movement, arrival, retry, 3 wins, unique rewards, persistence, mode isolation")
 get_tree().quit()
func screenshot(name:String):
 await get_tree().process_frame;await RenderingServer.frame_post_draw
 get_viewport().get_texture().get_image().save_png("/tmp/dream-native-"+name+".png")
