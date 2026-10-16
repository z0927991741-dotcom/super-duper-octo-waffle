"""Repackage a checksum-pinned Windows runtime with the exact current web payload."""
from pathlib import Path
import sys,json,zipfile,hashlib,subprocess,shutil
root=Path(__file__).resolve().parents[1];base=Path(sys.argv[1]);meta=json.loads((root/'web-packaging/gps-release.json').read_text());out=root/'web-packaging/output';out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if sha(base)!=meta['baseWindowsSHA256']:raise RuntimeError('Base Windows archive checksum mismatch')
subprocess.run(['node','scripts/build-standalone.mjs'],cwd=root,check=True);html=(root/'dist/dream-mender.html').read_bytes()
apk=root/'preview-builds/DreamMender-GPS-v0.21.apk'
if sha(apk)!=meta['androidSHA256']:raise RuntimeError('Android checksum mismatch')
with zipfile.ZipFile(apk) as z:
 if z.read('assets/index.html')!=html:raise RuntimeError('Android and website payloads differ')
windows=out/'DreamMender-GPS-Windows-v0.21.zip';found=False
with zipfile.ZipFile(base) as source,zipfile.ZipFile(windows,'w',zipfile.ZIP_DEFLATED,6) as dest:
 for item in source.infolist():
  data=source.read(item.filename)
  if item.filename.endswith('/resources/app/index.html'):data=html;found=True
  elif item.filename.endswith('/resources/app/main.cjs'):data=(root/'web-packaging/windows/main.cjs').read_bytes()
  elif item.filename.endswith('/resources/app/package.json'):data=(root/'web-packaging/windows/package.json').read_bytes()
  elif item.filename.endswith('/操作說明.md'):data=(root/'web-packaging/GPS-RELEASE.md').read_bytes()
  dest.writestr(item,data)
if not found:raise RuntimeError('Windows app payload missing')
shutil.copyfile(apk,out/apk.name);shutil.copyfile(root/'web-packaging/GPS-RELEASE.md',out/'GPS-RELEASE.md')
with zipfile.ZipFile(windows) as z:
 target=next(n for n in z.namelist() if n.endswith('/resources/app/index.html'))
 if z.read(target)!=html:raise RuntimeError('Windows and website payloads differ')
files=[windows,out/apk.name];(out/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.name+'\n' for p in files))
print('Both installers embed web SHA256',hashlib.sha256(html).hexdigest())
