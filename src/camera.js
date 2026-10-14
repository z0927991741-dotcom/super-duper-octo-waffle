export function cameraFrame(width,height,point,{overview=false,zoom=3.4}={}){
 const ratio=1700/1800;
 const worldWidth=overview?Math.min(width,height/ratio):width*zoom;
 const worldHeight=worldWidth*ratio;
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 const x=worldWidth<=width?(width-worldWidth)/2:clamp(width*.5-point.x/100*worldWidth,width-worldWidth,0);
 const y=worldHeight<=height?(height-worldHeight)/2:clamp(height*.42-point.y/100*worldHeight,height-worldHeight,0);
 return {worldWidth,worldHeight,x,y};
}
