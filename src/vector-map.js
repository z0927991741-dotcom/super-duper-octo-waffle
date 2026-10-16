import {VECTOR_MAP_STYLE} from './vector-style.js';
export function dreamMapStyle(){
 const style=JSON.parse(JSON.stringify(VECTOR_MAP_STYLE));
 style.layers=style.layers.filter(layer=>layer.source!=='ne2_shaded'&&!/housenumber|house-number|address/i.test(layer.id+' '+(layer['source-layer']||'')+' '+JSON.stringify(layer.layout?.['text-field']||'')));
 delete style.sources.ne2_shaded;
 for(const layer of style.layers){
  const source=layer['source-layer']||'',paint=layer.paint||{};
  if(layer.type==='background')paint['background-color']='#f2e8c8';
  if(layer.type==='fill'&&/building/.test(source)){paint['fill-color']='#e1c8ad';paint['fill-outline-color']='#c5b295';}
  if(layer.type==='fill'&&/landcover|landuse|park/.test(source))paint['fill-color']='#c9d9af';
  if(layer.type==='fill'&&source==='water')paint['fill-color']='#acd6e0';
  if(layer.type==='line'&&source==='transportation'&&!/rail|aerialway/.test(layer.id))paint['line-color']=/casing|outline/.test(layer.id)?'#eadfc8':'#fff8e8';
  if(layer.type==='symbol'&&layer.layout?.['text-field']){
   if(/name/.test(JSON.stringify(layer.layout['text-field'])))layer.layout['text-field']=['coalesce',['get','name:zh-Hant'],['get','name:zh'],['get','name'],['get','name:latin']];
   paint['text-color']='#665b4e';paint['text-halo-color']='#fff9e9';paint['text-halo-width']=1.2;
  }
  layer.paint=paint;
 }
 return style;
}
export function dreamVectorLayer(L){
 let webgl=false;try{const gl=document.createElement('canvas').getContext('webgl2');webgl=!!gl;gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
 if(!webgl||!window.maplibregl?.Map||!L.MaplibreGL){
  const Blank=L.GridLayer.extend({createTile(){const tile=document.createElement('canvas');tile.width=tile.height=256;const ctx=tile.getContext('2d');ctx.fillStyle='#f2e8c8';ctx.fillRect(0,0,256,256);return tile;}});
  const layer=new Blank({maxZoom:19});layer.simplified=true;return layer;
 }
 const Vector=L.MaplibreGL.extend({
  _initGL(){
   L.MaplibreGL.prototype._initGL.call(this);
   const gl=this.getMaplibreMap();this.fire('loading');
   gl.on('style.load',()=>{if(this.scene)this.setStreetScene(this.scene);});
   gl.on('load',()=>{if(this.scene&&!gl.getSource('dream-streets'))this.setStreetScene(this.scene);this.fire('load');});gl.on('error',event=>this.fire('tileerror',{error:event.error}));
  }
  ,setStreetScene(scene){
   this.scene=scene;const gl=this.getMaplibreMap();if(!gl?.getStyle()?.layers)return;
   const features=scene.graph.edges.map(edge=>({type:'Feature',properties:{kind:'road',path:['footway','path','steps','cycleway','pedestrian'].includes(edge.kind)},geometry:{type:'LineString',coordinates:[scene.graph.nodes.get(edge.a),scene.graph.nodes.get(edge.b)].map(p=>[p.lng,p.lat])}}));
   for(const polygon of scene.graph.buildings||[])features.push({type:'Feature',properties:{kind:'building'},geometry:{type:'Polygon',coordinates:[polygon.outer,...polygon.holes].map(r=>r.map(p=>[p.lng,p.lat]))}});
   const data={type:'FeatureCollection',features},existing=gl.getSource('dream-streets');if(existing){existing.setData(data);return;}
   gl.addSource('dream-streets',{type:'geojson',data});const before=gl.getStyle().layers.find(layer=>layer.type==='symbol')?.id;
   gl.addLayer({id:'dream-buildings',source:'dream-streets',type:'fill',filter:['==','kind','building'],paint:{'fill-color':'#e1c8ad','fill-opacity':.6,'fill-outline-color':'#c5b295'}},before);
   gl.addLayer({id:'dream-road-edge',source:'dream-streets',type:'line',filter:['==','kind','road'],layout:{'line-cap':'round'},paint:{'line-color':'#eadfc8','line-width':['case',['get','path'],6,11]}},before);
   gl.addLayer({id:'dream-roads',source:'dream-streets',type:'line',filter:['==','kind','road'],layout:{'line-cap':'round'},paint:{'line-color':'#fff8e8','line-width':['case',['get','path'],3,7]}},before);
  }
 });
 return new Vector({style:dreamMapStyle(),interactive:false,attributionControl:false,renderWorldCopies:false,fadeDuration:0});
}
