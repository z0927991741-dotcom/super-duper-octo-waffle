class_name DreamArt
extends Control
var texture:Texture2D
var logical:=Vector2.ONE
var crop:=Rect2()
var flip:=false
func configure(path:String,source_size:Vector2,box:Array):
 texture=load(path);logical=source_size;crop=Rect2(box[0],box[1],box[2],box[3]);queue_redraw()
func _draw():
 if texture==null or crop.size.x<=0:return
 var scale_factor=minf(size.x/crop.size.x,size.y/crop.size.y)
 var dest_size=crop.size*scale_factor
 var dest=Rect2((size-dest_size)/2,dest_size)
 var source=Rect2(crop.position*Vector2(texture.get_width(),texture.get_height())/logical,crop.size*Vector2(texture.get_width(),texture.get_height())/logical)
 if flip:draw_set_transform(Vector2(size.x,0),0,Vector2(-1,1))
 draw_texture_rect_region(texture,dest,source)
 draw_set_transform(Vector2.ZERO)
