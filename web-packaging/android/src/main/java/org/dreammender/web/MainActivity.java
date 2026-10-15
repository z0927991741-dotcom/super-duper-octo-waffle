package org.dreammender.web;
import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;

public class MainActivity extends Activity {
 private static final String ORIGIN="https://appassets.androidplatform.net";
 private WebView web;
 private GeolocationPermissions.Callback pending;
 private String pendingOrigin;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(0xfff6f0dd);
  root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);root.requestApplyInsets();
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setGeolocationEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest r){
    Uri u=r.getUrl();
    if(ORIGIN.equals(u.getScheme()+"://"+u.getHost())&&"/index.html".equals(u.getPath())){
     try{return new WebResourceResponse("text/html","UTF-8",getAssets().open("index.html"));}catch(Exception e){return blocked();}
    }
    return blocked();
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest r){
    if((ORIGIN+"/index.html").equals(r.getUrl().toString()))return false;
    if("https".equals(r.getUrl().getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,r.getUrl()));}catch(Exception ignored){}
    return true;
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
    if(!ORIGIN.equals(origin)&&!(ORIGIN+"/").equals(origin)){callback.invoke(origin,false,false);return;}
    if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);return;}
    if(pending!=null)pending.invoke(pendingOrigin,false,false);
    pending=callback;pendingOrigin=origin;
    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},42);
   }
  });
  web.loadUrl(ORIGIN+"/index.html");
 }
 private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));}
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==42&&pending!=null){pending.invoke(pendingOrigin,checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED,false);pending=null;}}
 @Override protected void onPause(){super.onPause();web.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){if(pending!=null){pending.invoke(pendingOrigin,false,false);pending=null;}web.destroy();super.onDestroy();}
}
