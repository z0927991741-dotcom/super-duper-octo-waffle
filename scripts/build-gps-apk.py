from pathlib import Path
import os,shutil,subprocess,urllib.parse,json
root=Path(__file__).resolve().parents[1];toolchain=Path(os.environ.get('DREAM_BUILD_TOOLS','/workspace/toolchain'))
assets=root/'web-packaging/android/src/main/assets';assets.mkdir(parents=True,exist_ok=True)
subprocess.run(['python','scripts/package-gps-v23.py','--stage-only'],cwd=root,check=True)
(root/'web-packaging/android/local.properties').write_text('sdk.dir=/workspace/toolchain/android-sdk\n')
jdk=next((toolchain/'jdk').iterdir());env=dict(os.environ,JAVA_HOME=str(jdk),GRADLE_USER_HOME=str(toolchain/'gradle'),ANDROID_HOME=str(toolchain/'android-sdk'),ANDROID_USER_HOME=str(toolchain/'android-user'))
env['JAVA_TOOL_OPTIONS']='-Duser.home=/workspace/toolchain/java-user';env.pop('ANDROID_SDK_HOME',None)
subprocess.run([str(toolchain/'gradle-dist/gradle-8.11.1/bin/gradle'),'clean','assembleDebug','--offline','--no-daemon'],cwd=root/'web-packaging/android',env=env,check=True)
version=json.loads((root/'web-packaging/gps-release.json').read_text())['version'];suffix='v0.23' if version=='0.23.0' else 'v'+version
out=root/'preview-builds'/('DreamMender-GPS-'+suffix+'.apk');shutil.copyfile(root/'web-packaging/android/build/outputs/apk/debug/DreamMenderWeb-debug.apk',out)
subprocess.run([str(toolchain/'android-sdk/build-tools/36.1.0/apksigner'),'verify','--verbose',str(out)],env=env,check=True)
print('APK_READY',out.stat().st_size)
