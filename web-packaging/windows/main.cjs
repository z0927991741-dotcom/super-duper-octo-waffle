const {app,BrowserWindow,protocol,net,shell,session}=require('electron');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
protocol.registerSchemesAsPrivileged([{scheme:'dream',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('夢境修補員');
app.whenReady().then(()=>{
 protocol.handle('dream',request=>{
  const url=new URL(request.url);if(url.host!=='game'||request.method!=='GET')return new Response('Not found',{status:404});
  let name;try{name=decodeURIComponent(url.pathname);}catch{return new Response('Not found',{status:404});}
  if(name==='/')name='/index.html';
  if(!['/index.html','/dream-mender.html','/sw.js'].includes(name)&&!/^\/assets\/[a-f0-9]{20}\.(js|png|jpg|webp)$/.test(name))return new Response('Not found',{status:404});
  return net.fetch(pathToFileURL(path.join(__dirname,name.slice(1))).href);
 });
 session.defaultSession.setPermissionRequestHandler((_wc,permission,callback)=>callback(false));
 session.defaultSession.setPermissionCheckHandler(()=>false);
 const w=new BrowserWindow({width:540,height:960,minWidth:360,minHeight:600,title:'夢境修補員',backgroundColor:'#f6f0dd',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 const external=url=>{try{if(new URL(url).protocol==='https:')shell.openExternal(url);}catch{}};
 w.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
 w.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('dream://game/')){e.preventDefault();external(url);}});
 w.loadURL('dream://game/index.html');
});
app.on('window-all-closed',()=>app.quit());
