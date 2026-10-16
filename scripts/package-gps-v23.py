"""Stage and verify the v23 web payload; package it with the pinned Windows runtime."""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess,zipfile
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--windows-base',type=Path);parser.add_argument('--stage-only',action='store_true');args=parser.parse_args()
sha=lambda data:hashlib.sha256(data).hexdigest()
meta=json.loads((root/'web-packaging/gps-release.json').read_text())
shutil.rmtree(root/'dist/web',ignore_errors=True)
subprocess.run(['npm','run','build:web'],cwd=root,check=True)
web=root/'dist/web';files={str(p.relative_to(web)):p.read_bytes() for p in web.rglob('*') if p.is_file()}
manifest={'version':'0.23.0','webPreview':'v23','webSourceCommit':meta['webSourceCommit'],'standaloneSHA256':sha(files['dream-mender.html']),'files':{name:sha(data) for name,data in sorted(files.items())}}
manifest_bytes=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode();files['native-manifest.json']=manifest_bytes
stage=root/'web-packaging/android/src/main/assets'
if stage.exists():shutil.rmtree(stage)
for name,data in files.items():
 target=stage/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
out=root/'web-packaging/output';out.mkdir(parents=True,exist_ok=True);(out/'native-manifest.json').write_bytes(manifest_bytes)
if args.stage_only:
 print('Android payload staged:',len(files),'files; standalone SHA256',manifest['standaloneSHA256']);raise SystemExit(0)
if not args.windows_base:parser.error('--windows-base or --stage-only is required')
if sha(args.windows_base.read_bytes())!=meta['baseWindowsSHA256']:raise RuntimeError('Pinned Windows base checksum mismatch')
apk=root/'preview-builds/DreamMender-GPS-v0.23.apk'
if meta.get('androidSHA256')!=sha(apk.read_bytes()):raise RuntimeError('APK checksum mismatch')
with zipfile.ZipFile(apk) as z:
 for name,data in files.items():
  if z.read('assets/'+name)!=data:raise RuntimeError('APK/web payload mismatch: '+name)
windows=out/'DreamMender-GPS-Windows-v0.23.zip'
with zipfile.ZipFile(args.windows_base) as source,zipfile.ZipFile(windows,'w',zipfile.ZIP_DEFLATED,6) as dest:
 app_roots=[n.rsplit('/',1)[0]+'/' for n in source.namelist() if n.endswith('/resources/app/index.html')]
 if len(app_roots)!=1:raise RuntimeError('Unexpected Windows runtime layout')
 app_root=app_roots[0]
 for item in source.infolist():
  if item.filename.startswith(app_root):continue
  data=source.read(item.filename)
  if item.filename.endswith('/操作說明.md'):data=(root/'web-packaging/GPS-RELEASE.md').read_bytes()
  dest.writestr(item,data)
 for name,data in files.items():dest.writestr(app_root+name,data)
 for name in ['main.cjs','package.json']:dest.writestr(app_root+name,(root/'web-packaging/windows'/name).read_bytes())
with zipfile.ZipFile(windows) as z:
 for name,data in files.items():
  if z.read(app_root+name)!=data:raise RuntimeError('Windows/web payload mismatch: '+name)
shutil.copyfile(apk,out/apk.name);shutil.copyfile(root/'web-packaging/GPS-RELEASE.md',out/'GPS-RELEASE.md')
(out/'SHA256SUMS.txt').write_text(''.join(sha(path.read_bytes())+'  '+path.name+'\n' for path in [windows,out/apk.name,out/'native-manifest.json']))
print('Windows and Android match web preview v23:',manifest['standaloneSHA256'])
