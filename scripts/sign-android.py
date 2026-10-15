"""Sign locally; keep private key/password outside the repository and release archives."""
import pathlib,os,glob,secrets,subprocess
root=pathlib.Path(__file__).resolve().parents[1];tools=pathlib.Path(os.environ.get('DREAM_TOOLCHAIN','/workspace/toolchain'));sign=tools/'signing';sign.mkdir(exist_ok=True);sign.chmod(0o700)
password=sign/'password';key=sign/'dream-release.jks';jdk=next((tools/'jdk').glob('*'))
if not password.exists():password.write_text(secrets.token_urlsafe(32));password.chmod(0o600)
if not key.exists():
 subprocess.run([str(jdk/'bin/keytool'),'-genkeypair','-keystore',str(key),'-storepass:file',str(password),'-keypass:file',str(password),'-alias','dream-release','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Dream Mender Prototype','-noprompt'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);key.chmod(0o600)
buildtools=tools/'android-sdk/build-tools/36.1.0';source=root/'native/android/build/build/outputs/apk/standard/release/android_release.apk';out=root/'native/exports';out.mkdir(exist_ok=True)
subprocess.run([str(buildtools/'zipalign'),'-P','16','-f','4',str(source),str(out/'aligned.apk')],check=True)
env=dict(os.environ,JAVA_HOME=str(jdk))
subprocess.run([str(buildtools/'apksigner'),'sign','--ks',str(key),'--ks-key-alias','dream-release','--ks-pass','file:'+str(password),'--out',str(out/'DreamMender.apk'),str(out/'aligned.apk')],env=env,check=True)
subprocess.run([str(buildtools/'apksigner'),'verify','--verbose',str(out/'DreamMender.apk')],env=env,check=True)
(out/'aligned.apk').unlink()
