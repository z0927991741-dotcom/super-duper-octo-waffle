class_name DreamJoystick
extends Control
var value:=Vector2.ZERO
var pointer:=-1
func _ready():custom_minimum_size=Vector2(130,130);mouse_filter=MOUSE_FILTER_STOP
func _gui_input(event):
 if event is InputEventScreenTouch:
  if event.pressed and pointer<0:pointer=event.index;update_value(event.position)
  elif event.index==pointer:pointer=-1;value=Vector2.ZERO;queue_redraw()
 elif event is InputEventScreenDrag and event.index==pointer:update_value(event.position)
 elif event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
  if event.pressed:pointer=999;update_value(event.position)
  else:pointer=-1;value=Vector2.ZERO;queue_redraw()
 elif event is InputEventMouseMotion and pointer==999:update_value(event.position)
 accept_event()
func update_value(p):value=((p-size/2)/45.0).limit_length();queue_redraw()
func _notification(what):
 if what==NOTIFICATION_APPLICATION_FOCUS_OUT:pointer=-1;value=Vector2.ZERO;queue_redraw()
func _draw():
 draw_circle(size/2,59,Color("e9ddc3"));draw_arc(size/2,59,0,TAU,64,Color("bca67e"),2)
 draw_circle(size/2+value*39,24,Color("b7805b"))
