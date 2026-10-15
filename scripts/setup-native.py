"""Verified Linux build dependencies. Godot 4.6.3 must be installed separately."""
import os,json,hashlib,urllib.request,zipfile,tarfile,pathlib,shutil
root=pathlib.Path(__file__).resolve().parents[1];tools=pathlib.Path(os.environ.get('DREAM_TOOLCHAIN','/workspace/toolchain'));tools.mkdir(parents=True,exist_ok=True)
for item in json.loads((root/'native/toolchain-lock.json').read_text()):
 p=tools/item['name']
 if not p.exists():urllib.request.urlretrieve(item['url'],p)
 if hashlib.new(item['algorithm'],p.read_bytes()).hexdigest()!=item['digest']:raise RuntimeError('Checksum mismatch: '+p.name)
 if p.name=='templates.tpz':
  if not (tools/'godot/templates/version.txt').exists():zipfile.ZipFile(p).extractall(tools/'godot')
 elif p.name=='jdk.tar.gz':
  if not (tools/'jdk').exists():
   (tools/'jdk').mkdir();tarfile.open(p).extractall(tools/'jdk',filter='data')
 elif item.get('target')=='cli19':
  if not (tools/'cli19/cmdline-tools/bin/sdkmanager').exists():zipfile.ZipFile(p).extractall(tools/'cli19')
  for f in (tools/'cli19/cmdline-tools/bin').iterdir():f.chmod(0o755)
 else:
  dest=tools/'android-sdk'/item['target'].replace(';','/')
  if not (dest/'source.properties').exists():
   stage=tools/('extract-'+p.stem);zipfile.ZipFile(p).extractall(stage);dest.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(next(stage.iterdir())),dest)
  for f in dest.rglob('*'):
   if f.is_file() and ('.' not in f.name or f.name in ['aapt2','apksigner','zipalign','adb']):f.chmod(0o755)
print('Verified native toolchain at',tools)
