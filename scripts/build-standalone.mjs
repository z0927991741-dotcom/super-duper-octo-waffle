import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
// These local modules use named exports and one-line static imports only.
// Concatenate in dependency order; fail if a new unsupported import/export is added.
const modules=['config','map-detail','roads','field-points','geo','street-snapshot','building-collision','street-network','street-plan','location','challenge','storage','joystick','art','camera','navigation','stories','npc','player','map-controls','chibi-map','osm-map','entrance-review','app'];
const chunks=[];
const npcImages={};
for(const id of ['color','gate','book'])for(const kind of ['portrait','sheet']){const file=`./src/assets/npc/${id}-${kind}-cutout.png`;npcImages[file]='data:image/'+(file.endsWith('.png')?'png':'jpeg')+';base64,'+(await readFile(path.join(root,file))).toString('base64');}
for(const id of ['male','female'])for(const kind of ['portrait','sheet']){const file=`./src/assets/player/${id}-${kind}.png`;npcImages[file]='data:image/png;base64,'+(await readFile(path.join(root,file))).toString('base64');}
for(const name of modules){
 const source=await readFile(path.join(root,'src',name+'.js'),'utf8');
 let bundled=source.replace(/^import\s+\{[^\n]+\}\s+from\s+'\.\/[^']+';\s*$/gm,'').replace(/^export\s+(?=(?:const|function|class)\b)/gm,'');
 if(/^\s*(?:import|export)\s/m.test(bundled))throw new Error('Unsupported module syntax in '+name);
 if(name==='player')bundled=bundled.replace(/\.\/src\/assets\/player\/[a-z-]+\.png/g,file=>npcImages[file]);
 if(name==='npc'){
  bundled=bundled.replace(/\.\/src\/assets\/npc\/[a-z-]+\.(?:jpg|png)/g, file=>npcImages[file]);
 }
 if(name==='app'||name==='osm-map'){
  const images={};for(const id of ['color','gate','book'])images[id]='data:image/png;base64,'+(await readFile(path.join(root,'src','assets',id+'.png'))).toString('base64');
  bundled=bundled.replace('src="./src/assets/${task.id}.png"', 'src="${'+JSON.stringify(images)+'[task.id]}"');
 }
 chunks.push('// '+name+'.js\n'+bundled);
}
const css=await readFile(path.join(root,'styles.css'),'utf8');
const script='(()=>{\n'+chunks.join('\n')+'\n})();';
const template=await readFile(path.join(root,'index.html'),'utf8');
const vendorJs=await readFile(path.join(root,'src/vendor/leaflet.js'),'utf8');
const vendorCss=await readFile(path.join(root,'src/vendor/leaflet.css'),'utf8');
const vendorLicense=await readFile(path.join(root,'src/vendor/LEAFLET-LICENSE'),'utf8');
const html=template.replace('<head>',()=>'<head><!-- Leaflet third-party license\n'+vendorLicense+'\n-->').replace('<link rel="stylesheet" href="/src/vendor/leaflet.css">',()=>'<style>'+vendorCss+'</style>').replace('<script src="/src/vendor/leaflet.js"></script>',()=>'<script>'+vendorJs.replace(/<\/script/gi,'<\\/script')+'</script>').replace('<link rel="stylesheet" href="/styles.css">',()=>'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>').replace('<script type="module" src="/src/app.js"></script>',()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist','dream-mender.html'),html);
console.log('Created dist/dream-mender.html — open directly in a browser.');

const revision=createHash('sha256').update(html).digest('hex').slice(0,12);
await writeFile(path.join(root,'dist','sw.js'),`const CACHE='dream-mender-${revision}';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.add('./index.html')).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dream-mender-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html'))));});
`);
