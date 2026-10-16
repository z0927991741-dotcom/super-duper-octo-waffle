import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
coords=[(22.6735,120.4885),(22.674967,120.4885),(22.674967,120.4900),(22.676278,120.4900),(22.676278,120.49190756),(22.67866012,120.49190756),(22.67866012,120.49276764)]
# Synthetic fixture only, never bundled or claimed as official map geometry.
elements=[{'type':'way','id':1,'tags':{'highway':'residential','name':'Fixture road'},'nodes':list(range(1,8)),'geometry':[{'lat':a,'lon':b} for a,b in coords]}, {'type':'way','id':90,'tags':{'building':'yes'},'nodes':[91,92,93,94,91],'geometry':[{'lat':a,'lon':b} for a,b in [(22.6752,120.493),(22.6752,120.4933),(22.6755,120.4933),(22.6755,120.493),(22.6752,120.493)]]}]

(root/'work').mkdir(exist_ok=True)
web=root/'dist/web';prefix='/super-duper-octo-waffle/gps-test/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for entry in [prefix,'/super-duper-octo-waffle/gps-test.html']:
  context=b.new_context(viewport={'width':390,'height':844},service_workers='block');page=context.new_page();held=[];errors=[];bad=[];requested=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def handle(r):
   u=r.request.url;path=urlparse(u).path;requested.append(path)
   if path==entry:r.fulfill(path=str(web/'index.html') if entry.endswith('/') else str(root/'dist/gps-test.html'));return
   if path.startswith(prefix+'assets/'):
    file=web/'assets'/path.split('/')[-1]
    if not file.exists():bad.append(path);r.abort();return
    if file.suffix=='.js':held.append((r,file));return
    r.fulfill(path=str(file));return
   if path==prefix+'dream-mender.html':r.fulfill(path=str(web/'dream-mender.html'));return
   if 'overpass' in u:r.fulfill(content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps({'osm3s':{'timestamp_osm_base':'2026-10-16T00:00:00Z'},'elements':elements}));return
   if u.startswith('https://game.test') and path.endswith(('.jpg','.png')):bad.append(path)
   r.abort()
  page.route('**/*',handle);page.goto('https://game.test'+entry,wait_until='commit')
  assert page.locator('#boot-panel').is_visible()
  page.wait_for_timeout(300);assert len(held)==4,len(held)
  assert not page.locator('#begin').count()
  for route,file in held:route.fulfill(path=str(file),content_type='text/javascript')
  page.locator('#begin').wait_for();assert page.evaluate('window.__dreamReady')
  page.evaluate("()=>{L.MaplibreGL.prototype._initGL=function(){throw Error('Synthetic GPU failure')};}")
  page.locator('#begin').click();page.locator('#confirm-player').click()
  page.wait_for_function("document.querySelector('#location-status').textContent.includes('公開道路可行走')")
  assert page.locator('.osm-player .player-sprite').is_visible()
  assert '道路簡圖' in page.locator('.osm-status').inner_text()
  assert not bad and not errors,(bad,errors)
  # Save data persists across reload; no reset or storage migration.
  page.evaluate("localStorage.setItem('dream-mender:v1:sim',JSON.stringify(['gate']))")
  page.locator('.road-data-tools summary').click()
  with page.expect_download() as result:page.locator('#download-road-game').click()
  exported=root/'work/web-road-export.html';result.value.save_as(str(exported))
  text=exported.read_text();assert 'data:image/png;base64' in text and '<meta name="dream-standalone"' not in text
  assert page.evaluate("JSON.parse(localStorage.getItem('dream-mender:v1:sim'))")==['gate']
  assert requested.count(prefix+'dream-mender.html')==1
  print({'entry':entry,'loadingVisibleBeforeScripts':True,'imagesResolve':True,'gpuFailureFallback':True,'standaloneExportPreserved':True,'errors':errors},flush=True)
  context.close()
 # A required script fails: show a retry message instead of a blank page.
 c=b.new_context(service_workers='block');page=c.new_page()
 def fail(r):
  if urlparse(r.request.url).path==prefix:r.fulfill(path=str(web/'index.html'))
  else:r.abort()
 page.route('**/*',fail);page.goto('https://fail.test'+prefix)
 page.wait_for_function("document.querySelector('#boot-message').textContent.includes('未能啟動')")
 assert page.locator('#boot-retry').is_visible()
 print({'scriptFailureShowsRetry':True},flush=True)
 b.close()
