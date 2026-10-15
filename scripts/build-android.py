"""Build unsigned Android artifact using the verified local toolchain; signing is separate."""
import os,glob,subprocess,urllib.parse,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
tools=pathlib.Path(os.environ.get('DREAM_TOOLCHAIN','/workspace/toolchain'))
jdk=next((tools/'jdk').glob('*'))
env=dict(os.environ,JAVA_HOME=str(jdk),GRADLE_USER_HOME=str(tools/'gradle'),ANDROID_HOME=str(tools/'android-sdk'),ANDROID_USER_HOME=str(tools/'android-user'))
env.pop('ANDROID_SDK_HOME',None)
for name in ['android-user','android-home','java-user']:(tools/name).mkdir(exist_ok=True)
p=urllib.parse.urlparse(env.get('HTTPS_PROXY',''))
env['JAVA_OPTS']='-Duser.home='+str(tools/'java-user')+' -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts'+(' -Dhttps.proxyHost='+p.hostname+' -Dhttps.proxyPort='+str(p.port or 80) if p.hostname else '')
env['JAVA_TOOL_OPTIONS']='-Duser.home='+str(tools/'java-user')
result=subprocess.run(['./gradlew','assembleStandardRelease','-Pexport_package_name=org.dreammender.pingtung','-Pexport_version_code=18','-Pexport_version_name=0.18.0','-Pexport_enabled_abis=arm64-v8a|x86_64','-Pperform_signing=false','--no-daemon','--stacktrace'],cwd=root/'native/android/build',env=env)
raise SystemExit(result.returncode)
