import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
(root/'work').mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[];tiles=[];tile_failure=[False]
 page.on('pageerror',lambda e:errors.append(e.stack))
 def handle(route):
  url=route.request.url
  if url.startswith('https://tile.openstreetmap.org/'):
   tiles.append(url)
   if tile_failure[0]: route.abort(); return
   route.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e6eadc"/><path d="M0 128h256M128 0v256" stroke="#fff" stroke-width="10"/></svg>');return
  if url.startswith('https://dream-mender.test/'):
   path=url.split('https://dream-mender.test/',1)[1].split('?')[0] or 'index.html'
   f=root/path
   if f.is_file(): route.fulfill(path=str(f));return
  route.abort()
 page.route('**/*',handle)
 page.add_init_script("""localStorage.setItem('dream-mender:player','male');localStorage.setItem('dream-mender:v1:sim','[\"color\"]');window.calls=0;window.clears=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok,err){window.calls++;window.gpsOK=ok;window.gpsError=err;return window.calls;},clearWatch(){window.clears++;}}});""")
 page.goto('https://dream-mender.test/')
 page.locator('#begin').click();page.locator('#confirm-player').click()
 assert len(tiles)==0
 assert page.locator('.shard.collected').count()==1
 page.locator('#real-mode').click()
 assert page.locator('#osm-map').is_visible()
 assert page.locator('.leaflet-control-attribution').is_visible()
 assert page.evaluate('window.calls')==0
 assert len(tiles)==0
 assert page.locator('.shard.collected').count()==0
 page.locator('#locate').click()
 page.evaluate('window.gpsError({code:1})')
 assert '權限遭拒' in page.locator('#location-status').inner_text()
 page.locator('#locate').click()
 # Synthetic GPS fixture only; never a landmark coordinate.
 page.evaluate('window.gpsOK({coords:{latitude:22.67,longitude:120.49,accuracy:8},timestamp:Date.now()})')
 page.locator('.osm-player').wait_for()
 page.wait_for_function("document.querySelector('.osm-status').textContent.includes('街道參考')")
 assert len(tiles)>0
 assert page.locator('.leaflet-tooltip').count()==1
 assert page.locator('#start-challenge').is_disabled()
 count=len(tiles);page.wait_for_timeout(400);assert len(tiles)==count
 page.locator('.leaflet-control-zoom-in').click();page.wait_for_timeout(100);assert len(tiles)>count
 page.locator('.osm-viewport').focus();page.keyboard.press('ArrowRight')
 page.locator('.osm-follow').click()
 page.screenshot(path='work/osm-mobile-fixture.png')
 page.evaluate('window.gpsOK({coords:{latitude:22.67,longitude:120.49,accuracy:80},timestamp:Date.now()})')
 page.wait_for_timeout(150);assert page.locator('.osm-player').count()==0
 page.evaluate('window.gpsOK({coords:{latitude:22.67,longitude:120.49,accuracy:8},timestamp:Date.now()-16000})')
 assert page.locator('.osm-player').count()==0
 page.evaluate('window.gpsOK({coords:{latitude:22.67,longitude:120.49,accuracy:8},timestamp:Date.now()})')
 tile_failure[0]=True;page.locator('.leaflet-control-zoom-in').click()
 page.wait_for_function("document.querySelector('.osm-status').textContent.includes('未能完整載入')")
 page.locator('#sim-mode').click();assert page.locator('#osm-map').count()==0
 assert page.locator('#joystick').is_visible()
 assert page.locator('.shard.collected').count()==1
 assert page.evaluate('window.clears')>=2
 assert not errors,errors
 browser.close()
 print(json.dumps({'result':'PASS','pageErrors':errors,'mockTileRequests':len(tiles),'checks':['simulation unchanged','explicit GPS permission','denial and retry','OSM viewport and attribution','no unverified landmark markers','GPS accuracy and stale data','zoom pan recenter','tile errors','separate saves','clearWatch on mode switch']},ensure_ascii=False))
