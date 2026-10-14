import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
// These local modules use named exports and one-line static imports only.
// Concatenate in dependency order; fail if a new unsupported import/export is added.
const modules=['config','roads','geo','location','challenge','storage','joystick','art','app'];
const chunks=[];
for(const name of modules){
 const source=await readFile(path.join(root,'src',name+'.js'),'utf8');
 const bundled=source.replace(/^import\s+\{[^\n]+\}\s+from\s+'\.\/[^']+';\s*$/gm,'').replace(/^export\s+(?=(?:const|function|class)\b)/gm,'');
 if(/^\s*(?:import|export)\s/m.test(bundled))throw new Error('Unsupported module syntax in '+name);
 chunks.push('// '+name+'.js\n'+bundled);
}
const css=await readFile(path.join(root,'styles.css'),'utf8');
const script='(()=>{\n'+chunks.join('\n')+'\n})();';
const template=await readFile(path.join(root,'index.html'),'utf8');
const html=template.replace('<link rel="stylesheet" href="/styles.css">',()=>'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>').replace('<script type="module" src="/src/app.js"></script>',()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist','dream-mender.html'),html);
console.log('Created dist/dream-mender.html — open directly in a browser.');
