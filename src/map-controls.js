// Map gestures affect only the camera; the road walker owns player movement.
export function attachMapZoom(element,readZoom,setZoom){
 const pointers=new Map();let lastDistance=0,suppressClick=false;
 const distance=()=>{const [a,b]=[...pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
 element.addEventListener('wheel',e=>{if(e.target.closest('.map-controls'))return;e.preventDefault();setZoom(readZoom()*Math.exp(-e.deltaY*.002));},{passive:false});
 element.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest('.map-controls,.camera-mode'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){suppressClick=true;lastDistance=distance();for(const id of pointers.keys())element.setPointerCapture(id);}});
 element.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){e.preventDefault();const next=distance();if(lastDistance>0&&next>0)setZoom(readZoom()*next/lastDistance);lastDistance=next;}});
 const release=e=>{pointers.delete(e.pointerId);lastDistance=0;if(!pointers.size)setTimeout(()=>suppressClick=false,0);};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,release);
 element.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
}
