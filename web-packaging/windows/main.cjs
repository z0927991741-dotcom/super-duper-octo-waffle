const {app,BrowserWindow,protocol,net,shell,session}=require('electron');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
protocol.registerSchemesAsPrivileged([{scheme:'dream',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('夢境修補員');
app.whenReady().then(()=>{
 protocol.handle('dream',request=>new URL(request.url).host==='game'&&['/','/index.html'].includes(new URL(request.url).pathname)?net.fetch(pathToFileURL(path.join(__dirname,'index.html')).href):new Response('Not found',{status:404}));
 session.defaultSession.setPermissionRequestHandler((_wc,permission,callback)=>callback(false));
 session.defaultSession.setPermissionCheckHandler(()=>false);
 const w=new BrowserWindow({width:540,height:960,minWidth:360,minHeight:600,title:'夢境修補員',backgroundColor:'#f6f0dd',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 const external=url=>{try{if(new URL(url).protocol==='https:')shell.openExternal(url);}catch{}};
 w.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
 w.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('dream://game/')){e.preventDefault();external(url);}});
 w.loadURL('dream://game/index.html');
});
app.on('window-all-closed',()=>app.quit());
