class_name DreamMap
extends Control
var data:Dictionary
var walker:DreamWalker
var completed:Array=[]
var avatar:="male"
var facing:="down"
var zoom:=.6
var textures:Dictionary={}
var tick:=0.0
func _ready():clip_contents=true;custom_minimum_size=Vector2(0,240);mouse_filter=MOUSE_FILTER_IGNORE
func screen(p:Vector2)->Vector2:return size*Vector2(.5,.63)+(p-walker.position())*zoom
func _process(dt):tick+=dt;queue_redraw()
func _draw():
 if walker==null:return
 draw_rect(Rect2(Vector2.ZERO,size),Color("ede8d3"))
 for id in ["color","gate","book"]:
  var p=screen(walker.point(id));draw_circle(p,95*zoom,Color("c9dfb7") if id in completed else Color("d7d6d0"))
 for e in data.edges:
  var a=screen(walker.point(e.a));var b=screen(walker.point(e.b));draw_line(a,b,Color("c5bfae"),15*zoom,true);draw_line(a,b,Color("fff9e9"),10*zoom,true)
 for task in data.tasks:
  var p=screen(walker.point(task.id))
  if not textures.has(task.id):textures[task.id]=load("res://assets/"+task.id+".png")
  var image_size=Vector2(84,57);draw_texture_rect(textures[task.id],Rect2(p-image_size*Vector2(.5,1),image_size),false,Color.WHITE if task.id in completed else Color(.7,.7,.7))
  draw_string(ThemeDB.fallback_font,p+Vector2(-40,14),task.place,HORIZONTAL_ALIGNMENT_LEFT,150,14,Color("53604d"))
 if not textures.has(avatar):textures[avatar]=load("res://assets/"+avatar+"-sheet.png")
 var frame=1+int(tick/.13)%4 if walker.moving else 0
 var row=2 if facing=="up" else (1 if facing=="down" else 0)
 var center=float(data.players[avatar].centers[frame]);var sheet:Texture2D=textures[avatar]
 var source=Rect2(Vector2(center-90,row*256)*Vector2(sheet.get_width(),sheet.get_height())/Vector2(1408,768),Vector2(180,256)*Vector2(sheet.get_width(),sheet.get_height())/Vector2(1408,768))
 var foot=screen(walker.position());draw_circle(foot,13,Color("a9b792"))
 if facing=="left":draw_set_transform(foot,0,Vector2(-1,1));draw_texture_rect_region(sheet,Rect2(-23,-65,46,65),source);draw_set_transform(Vector2.ZERO)
 else:draw_texture_rect_region(sheet,Rect2(foot-Vector2(23,65),Vector2(46,65)),source)
