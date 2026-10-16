// Repaint OSM raster tiles in the game's illustrated palette without moving geometry.
// Keep the original OSM labels; overzoom the overview tiles so detailed address numbers are not introduced.
export function chibiTileLayer(L){
 const Layer=L.TileLayer.extend({
  createTile(coords,done){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
   canvas.setAttribute('role','presentation');
   const image=new Image();image.crossOrigin='anonymous';image.referrerPolicy='strict-origin-when-cross-origin';
   image.onload=()=>{
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,256,256);
    try{
     const pixels=ctx.getImageData(0,0,256,256),data=pixels.data,types=new Uint8Array(256*256);

     for(let i=0;i<data.length;i+=4){
      const r=data[i],g=data[i+1],b=data[i+2];let color,type;
      if(Math.max(r,g,b)<145){color=[102,91,78];type=0;}
      else if(b>r+8&&b>g-12){color=[172,214,224];type=1;}
      else if(g>r+6&&g>b+6){color=[185,211,155];type=2;}
      else if(r>245&&g>242&&b>237){color=[255,251,224];type=3;}
      else if(r>g+12&&r>b+18){color=[239,206,165];type=4;}
      else if(Math.abs(r-g)<14&&Math.abs(g-b)<20&&r<235){color=[225,204,181];type=4;}
      else {color=[242,232,200];type=5;}
      types[i/4]=type;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];
     }
     // Fine ink edges around actual mapped buildings, greenery and water.
     for(let y=1;y<255;y++)for(let x=1;x<255;x++){
      const n=y*256+x,t=types[n];
      if((t===1||t===2||t===4)&&(types[n-1]!==t||types[n-256]!==t)){
       const i=n*4;data[i]=Math.round(data[i]*.84);data[i+1]=Math.round(data[i+1]*.84);data[i+2]=Math.round(data[i+2]*.84);
      }
     }
     ctx.putImageData(pixels,0,0);
     // Small round tree canopies only inside mapped green space.
     for(let y=18;y<244;y+=27)for(let x=16;x<244;x+=31){
      const xx=x+((y*7)%11),n=y*256+xx;
      if(types[n]!==2||types[n-5]!==2||types[n+5]!==2||types[n-5*256]!==2||types[n+5*256]!==2)continue;
      ctx.fillStyle='#9b825e';ctx.fillRect(xx-1,y+2,3,7);ctx.strokeStyle='#7caa73';ctx.lineWidth=1.2;
      ctx.fillStyle='#a6c88c';ctx.beginPath();ctx.arc(xx,y,6,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#c4dda6';ctx.beginPath();ctx.arc(xx-2,y-2,2.5,0,Math.PI*2);ctx.fill();
     }
    }catch{canvas.classList.add('chibi-color-fallback');}
    done(null,canvas);
   };
   image.onerror=()=>done(new Error('Map tile unavailable'),canvas);
   image.src=this.getTileUrl(coords);return canvas;
  }
 });
 return new Layer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:16,keepBuffer:0,updateWhenIdle:true});
}
