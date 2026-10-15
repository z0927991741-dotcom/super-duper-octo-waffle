// Pointer capture supports mouse, touch and pen. Releasing or leaving the app always stops.
export function attachJoystick(element,onChange){
 let pointer=null;
 const knob=element.querySelector('.joystick-knob');
 const reset=()=>{pointer=null;knob.style.transform='translate(0px,0px)';element.classList.remove('dragging');onChange(null);};
 const update=e=>{const b=element.getBoundingClientRect();const radius=b.width*.3;const dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2;const magnitude=Math.hypot(dx,dy);const ratio=magnitude>radius?radius/magnitude:1;knob.style.transform=`translate(${dx*ratio}px,${dy*ratio}px)`;onChange(magnitude<radius*.18?null:{x:dx/magnitude,y:-dy/magnitude,strength:Math.min(1,Math.max(.2,(magnitude/radius-.18)/.82))});};
 element.onpointerdown=e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;element.setPointerCapture(pointer);element.classList.add('dragging');update(e);};
 element.onpointermove=e=>{if(pointer===e.pointerId){e.preventDefault();update(e);}};
 element.onpointerup=element.onpointercancel=e=>{if(pointer===e.pointerId){const id=pointer;reset();if(element.hasPointerCapture(id))element.releasePointerCapture(id);}};
 element.onlostpointercapture=reset;
 return reset;
}
