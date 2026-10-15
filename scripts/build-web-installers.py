"""Package the exact standalone web game; no UI reimplementation."""
import pathlib,os,subprocess,json,urllib.request,urllib.parse,hashlib,zipfile,shutil
root=pathlib.Path(__file__).resolve().parents[1];tools=pathlib.Path('/workspace/toolchain');out=root/'web-packaging/output';out.mkdir(parents=True,exist_ok=True)
subprocess.run(['npm','run','build:standalone'],cwd=root,check=True)
html=root/'dist/dream-mender.html';android=root/'web-packaging/android';assets=android/'src/main/assets';assets.mkdir(parents=True,exist_ok=True);shutil.copyfile(html,assets/'index.html')
(android/'local.properties').write_text('sdk.dir='+str(tools/'android-sdk')+'\n')
jdk=next((tools/'jdk').glob('*'));env=dict(os.environ,JAVA_HOME=str(jdk),GRADLE_USER_HOME=str(tools/'gradle'),ANDROID_HOME=str(tools/'android-sdk'),ANDROID_USER_HOME=str(tools/'android-user'));env.pop('ANDROID_SDK_HOME',None)
p=urllib.parse.urlparse(env.get('HTTPS_PROXY',''));env['JAVA_OPTS']='-Duser.home='+str(tools/'java-user')+' -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts'+(' -Dhttps.proxyHost='+p.hostname+' -Dhttps.proxyPort='+str(p.port or 80) if p.hostname else '');env['JAVA_TOOL_OPTIONS']='-Duser.home='+str(tools/'java-user')
gradle=next((tools/'gradle/wrapper/dists/gradle-8.11.1-bin').glob('*/gradle-8.11.1/bin/gradle'))
subprocess.run([str(gradle),'assembleRelease','--no-daemon'],cwd=android,env=env,check=True)
bt=tools/'android-sdk/build-tools/36.1.0';unsigned=android/'build/outputs/apk/release/DreamMenderWeb-release-unsigned.apk'
if not unsigned.exists():unsigned=next((android/'build/outputs/apk/release').glob('*unsigned.apk'))
subprocess.run([str(bt/'zipalign'),'-P','16','-f','4',str(unsigned),str(out/'aligned.apk')],check=True)
subprocess.run([str(bt/'apksigner'),'sign','--ks',str(tools/'signing/dream-release.jks'),'--ks-key-alias','dream-release','--ks-pass','file:'+str(tools/'signing/password'),'--out',str(out/'DreamMender-Web-Android.apk'),str(out/'aligned.apk')],env=env,check=True)
subprocess.run([str(bt/'apksigner'),'verify','--verbose',str(out/'DreamMender-Web-Android.apk')],env=env,check=True);(out/'aligned.apk').unlink()
lock=json.loads((root/'web-packaging/electron-lock.json').read_text());cache=tools/'electron';cache.mkdir(exist_ok=True)
for item in lock['assets']:
 archive=cache/item['name']
 if not archive.exists():urllib.request.urlretrieve(item['url'],archive)
 if hashlib.sha256(archive.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Electron checksum mismatch')
 if 'win32' not in item['name']:continue
 dest=out/'windows';dest.mkdir(exist_ok=True);zipfile.ZipFile(archive).extractall(dest)
 exe=dest/'electron.exe'
 if exe.exists():exe.rename(dest/'DreamMender.exe')
 app=dest/'resources/app';app.mkdir(exist_ok=True)
 for name in ['main.cjs','package.json']:shutil.copyfile(root/'web-packaging/windows'/name,app/name)
 shutil.copyfile(html,app/'index.html')
 shutil.copyfile(root/'web-packaging/README.md',dest/'操作說明.md')
 with zipfile.ZipFile(out/'DreamMender-Web-Windows.zip','w',zipfile.ZIP_DEFLATED,6) as z:
  for f in dest.rglob('*'):
   if f.is_file():z.write(f,'DreamMender/'+str(f.relative_to(dest)))
print('WEB_PAYLOAD_SHA256',hashlib.sha256(html.read_bytes()).hexdigest())
