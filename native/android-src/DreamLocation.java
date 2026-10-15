package com.godot.game;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.SystemClock;
import org.godotengine.godot.Godot;
import org.godotengine.godot.plugin.GodotPlugin;
import org.godotengine.godot.plugin.UsedByGodot;
import org.json.JSONObject;

/** Foreground-only GPS. Never fabricates a position or falls back to simulation. */
public final class DreamLocation extends GodotPlugin implements LocationListener {
 private static final int REQUEST=4163;
 private LocationManager manager;
 private volatile String json="{\"message\":\"尚未啟用定位\"}";
 private boolean requested=false;
 private volatile boolean requestingPermission=false;
 @UsedByGodot public boolean is_requesting_permission(){return requestingPermission;}
 public DreamLocation(Godot godot){super(godot);}
 @Override public String getPluginName(){return "DreamLocation";}
 private void message(String text){try{json=new JSONObject().put("message",text).toString();}catch(Exception ignored){}}
 @UsedByGodot public String get_fix_json(){return json;}
 @UsedByGodot public void request_fix(){getActivity().runOnUiThread(()->{
  requested=true;message("正在取得定位…");Activity activity=getActivity();
  if(activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){
   requestingPermission=true;
   activity.requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},REQUEST);
  }else start();
 });}
 private void start(){
  if(!requested)return;
  try{
   manager=(LocationManager)getActivity().getSystemService(Context.LOCATION_SERVICE);
   manager.removeUpdates(this);
   if(!manager.isProviderEnabled(LocationManager.GPS_PROVIDER)){message("裝置 GPS 未開啟，請開啟定位後重試");return;}
   manager.requestLocationUpdates(LocationManager.GPS_PROVIDER,1000,0,this);
  }catch(SecurityException e){message("定位權限遭拒，請允許精確位置後重試");}
   catch(Exception e){message("定位無法啟用，請重試");}
 }
 @Override public void onMainRequestPermissionsResult(int code,String[] permissions,int[] results){
  if(code!=REQUEST)return;
  requestingPermission=false;
  if(getActivity().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED)start();
  else message("定位權限遭拒或僅允許概略位置；請允許精確位置後重試");
 }
 @UsedByGodot public void stop_fix(){getActivity().runOnUiThread(()->{requested=false;if(manager!=null)manager.removeUpdates(this);message("定位已暫停，請按重試");});}
 @Override public void onMainPause(){super.onMainPause();if(requestingPermission)return;requested=false;if(manager!=null)manager.removeUpdates(this);message("定位已暫停，請按重試");}
 @Override public void onLocationChanged(Location location){
  if(!requested)return;
  try{
   long age=Math.max(0,(SystemClock.elapsedRealtimeNanos()-location.getElapsedRealtimeNanos())/1000000);
   json=new JSONObject().put("lat",location.getLatitude()).put("lng",location.getLongitude()).put("accuracy",location.hasAccuracy()?location.getAccuracy():9999).put("timestamp",System.currentTimeMillis()-age).put("message","GPS 已更新").put("mock",android.os.Build.VERSION.SDK_INT >= 31 ? location.isMock() : location.isFromMockProvider()).toString();
  }catch(Exception e){message("位置資料無效，請重試");}
 }
 @Override public void onProviderDisabled(String provider){message("GPS 已關閉，請開啟後重試");}
 @Override public void onProviderEnabled(String provider){}
 @Override public void onStatusChanged(String provider,int status,Bundle extras){}
}
