"""Recreate the Android wrapper from Godot's verified template, then add our GPS plugin."""
import os,pathlib,zipfile,shutil
root=pathlib.Path(__file__).resolve().parents[1];tools=pathlib.Path(os.environ.get('DREAM_TOOLCHAIN','/workspace/toolchain'));build=root/'native/android/build'
if not (build/'build.gradle').exists():zipfile.ZipFile(tools/'godot/templates/android_source.zip').extractall(build)
(build/'gradlew').chmod(0o755)
shutil.copyfile(root/'native/android-src/DreamLocation.java',build/'src/main/java/com/godot/game/DreamLocation.java')
p=build/'src/main/java/com/godot/game/GodotApp.java';s=p.read_text()
if 'args.add("--main-pack")' not in s:s=s.replace('public class GodotApp extends GodotActivity {','public class GodotApp extends GodotActivity {\n @Override public java.util.List<String> getCommandLine() {\n java.util.List<String> args=new java.util.ArrayList<>(super.getCommandLine());\n args.add("--main-pack");args.add("res://game.pck");return args;\n }')
p.write_text(s)
p=build/'src/main/AndroidManifest.xml';s=p.read_text()
if 'org.godotengine.plugin.v2.DreamLocation' not in s:
 s=s.replace('<supports-screens','<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n<uses-feature android:name="android.hardware.location.gps" android:required="false"/>\n<supports-screens').replace('<profileable','<meta-data android:name="org.godotengine.plugin.v2.DreamLocation" android:value="com.godot.game.DreamLocation"/>\n<profileable')
s=s.replace('android:screenOrientation="landscape"','android:screenOrientation="portrait"').replace('@mipmap/icon','@drawable/dream_icon');p.write_text(s)
for p in (build/'res').glob('values*/godot_project_name_string.xml'):p.write_text('<?xml version="1.0" encoding="utf-8"?><resources><string name="godot_project_name_string">夢境修補員</string></resources>')
shutil.copyfile(root/'native/android-src/dream_icon.xml',build/'res/drawable/dream_icon.xml')
p=build/'gradle/wrapper/gradle-wrapper.properties';s=p.read_text();s+='\ndistributionSha256Sum='+(root/'native/android-src/gradle-distribution.sha256').read_text().strip()+'\n' if 'distributionSha256Sum' not in s else '';p.write_text(s)
(build/'local.properties').write_text('sdk.dir='+str(tools/'android-sdk')+'\n')
print('Android GPS wrapper prepared')
