import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
// These local modules use named exports and one-line static imports only.
// Concatenate in dependency order; fail if a new unsupported import/export is added.
const modules=['config','map-detail','roads','geo','location','challenge','storage','joystick','art','camera','navigation','stories','npc','map-controls','app'];
const chunks=[];
const npcImages={};
for(const id of ['color','gate','book'])for(const kind of ['portrait','sheet']){const file=`./src/assets/npc/${id}-${kind}.${id==='book'&&kind==='portrait'?'png':'jpg'}`;npcImages[file]='data:image/'+(file.endsWith('.png')?'png':'jpeg')+';base64,'+(await readFile(path.join(root,file))).toString('base64');}
for(const name of modules){
 const source=await readFile(path.join(root,'src',name+'.js'),'utf8');
 let bundled=source.replace(/^import\s+\{[^\n]+\}\s+from\s+'\.\/[^']+';\s*$/gm,'').replace(/^export\s+(?=(?:const|function|class)\b)/gm,'');
 if(/^\s*(?:import|export)\s/m.test(bundled))throw new Error('Unsupported module syntax in '+name);
 if(name==='npc'){
  bundled=bundled.replace(/\.\/src\/assets\/npc\/[a-z-]+\.(?:jpg|png)/g, file=>npcImages[file]);
 }
 if(name==='app'){
  const images={};for(const id of ['color','gate','book'])images[id]='data:image/png;base64,'+(await readFile(path.join(root,'src','assets',id+'.png'))).toString('base64');
  bundled=bundled.replace('src="./src/assets/${task.id}.png"', 'src="${'+JSON.stringify(images)+'[task.id]}"');
 }
 chunks.push('// '+name+'.js\n'+bundled);
}
const css=await readFile(path.join(root,'styles.css'),'utf8');
const script='(()=>{\n'+chunks.join('\n')+'\n})();';
const template=await readFile(path.join(root,'index.html'),'utf8');
const html=template.replace('<link rel="stylesheet" href="/styles.css">',()=>'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>').replace('<script type="module" src="/src/app.js"></script>',()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist','dream-mender.html'),html);
console.log('Created dist/dream-mender.html — open directly in a browser.');
