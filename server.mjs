import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)|| !['/index.html','/styles.css'].includes(url.pathname==='/'?'/index.html':url.pathname)&&!url.pathname.startsWith('/src/')){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end('找不到頁面');}}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Dream Mender listening on port '+(process.env.PORT||4173)));
