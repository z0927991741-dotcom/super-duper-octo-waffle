class_name DreamChallenge
extends RefCounted
var sequence: Array[int]=[]
var cursor:=0
var phase:="show"
func _init(count: int):
 for i in range(count):sequence.append(randi_range(0,3))
func ready():cursor=0;phase="input"
func press(index: int) -> String:
 if phase!="input":return "ignored"
 if sequence[cursor]!=index:phase="wrong";return "wrong"
 cursor+=1
 if cursor==sequence.size():phase="won";return "won"
 return "correct"
