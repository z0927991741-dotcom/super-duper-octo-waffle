"""Accept SDK build-tool licenses for the authorized Android build setup."""
import os,pathlib,subprocess,urllib.parse
root=pathlib.Path(os.environ.get('DREAM_TOOLCHAIN','/workspace/toolchain'));jdk=next((root/'jdk').glob('*'));(root/'android-user').mkdir(exist_ok=True);(root/'java-user').mkdir(exist_ok=True)
env=dict(os.environ,JAVA_HOME=str(jdk),JAVA_TOOL_OPTIONS='-Duser.home='+str(root/'java-user')+' -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts',ANDROID_USER_HOME=str(root/'android-user'));env.pop('ANDROID_SDK_HOME',None)
args=[str(root/'cli19/cmdline-tools/bin/sdkmanager'),'--sdk_root='+str(root/'android-sdk'),'--licenses'];proxy=urllib.parse.urlparse(env.get('HTTPS_PROXY',''))
if proxy.hostname:args+=['--proxy=http','--proxy_host='+proxy.hostname,'--proxy_port='+str(proxy.port or 80)]
result=subprocess.run(args,input='y\n'*100,text=True,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
if result.returncode:print(result.stdout[-3000:])
else:print('Android SDK license setup completed')
raise SystemExit(result.returncode)
