class_name DreamWalker
extends RefCounted
var nodes:Dictionary
var edges:Array
var node:="start"
var edge:Dictionary={}
var t:=0.0
var direction:=1.0
var moving:=false
func _init(data:Dictionary):nodes=data.nodes;edges=data.edges
func point(id:String)->Vector2:
 return Vector2(float(nodes[id].lng)/.0000025,1000-float(nodes[id].lat)/.000003)
func position()->Vector2:
 return point(node) if edge.is_empty() else point(edge.a).lerp(point(edge.b),t)
func fix()->Dictionary:
 var p=position();return {"lat":(1000-p.y)*.000003,"lng":p.x*.0000025,"accuracy":0,"timestamp":Time.get_unix_time_from_system()*1000}
func move(input:Vector2,dt:float):
 var before=position()
 if input.length()<.1:moving=false;return
 var budget=60.0*dt*minf(input.length(),1)
 for loop in range(8):
  if budget<=0:break
  if edge.is_empty():
   var best=.25;var chosen:Dictionary={}
   for e in edges:
    if not e.walkable or (e.a!=node and e.b!=node):continue
    var other:String=e.b if e.a==node else e.a
    var score=input.normalized().dot((point(other)-point(node)).normalized())
    if score>best:best=score;chosen=e
   if chosen.is_empty():break
   edge=chosen;t=0 if edge.a==node else 1;direction=1 if t==0 else -1
  var v=point(edge.b)-point(edge.a)
  if input.normalized().dot(v.normalized()*direction)<-.65:direction=-direction
  var remaining=(1-t if direction>0 else t)*v.length()
  var step=minf(budget,remaining);t+=direction*step/v.length();budget-=step
  if remaining-step<.001:node=edge.b if direction>0 else edge.a;edge={}
  else:break
 moving=position().distance_to(before)>.001
func route(target:String)->float:
 var distances:Dictionary={};var visited:Dictionary={}
 if edge.is_empty():distances[node]=0.0
 else:
  distances[edge.a]=DreamRules.distance(fix(),nodes[edge.a]);distances[edge.b]=DreamRules.distance(fix(),nodes[edge.b])
 while not distances.is_empty():
  var current="";var cost=INF
  for id in distances:
   if not visited.has(id) and distances[id]<cost:current=id;cost=distances[id]
  if current=="":break
  if current==target:return cost
  visited[current]=true
  for e in edges:
   if not e.walkable or (e.a!=current and e.b!=current):continue
   var other:String=e.b if e.a==current else e.a
   var next=cost+DreamRules.distance(nodes[current],nodes[other])
   if next<float(distances.get(other,INF)):distances[other]=next
 return INF
