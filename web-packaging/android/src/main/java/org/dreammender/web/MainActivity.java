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
 private ValueCallback<Uri[]> fileUpload;
 private byte[] fileDownload;
 private GeolocationPermissions.Callback pending;
 private String pendingOrigin;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(0xfff6f0dd);
  root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);root.requestApplyInsets();
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setGeolocationEnabled(true);settings.setUserAgentString(settings.getUserAgentString()+" DreamMenderWeb/0.23.1 (+https://github.com/z0927991741-dotcom/super-duper-octo-waffle)");settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);
  web.addJavascriptInterface(new DownloadFiles(),"DreamNativeDownloads");
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest r){
    return respond(r);
   }
   @Override public void onPageFinished(WebView view,String url){if((ORIGIN+"/index.html").equals(url))view.evaluateJavascript("(function(){if(window.__dreamDownloads)return;window.__dreamDownloads=true;var original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.href.indexOf('blob:')===0&&this.download){var name=this.download;fetch(this.href).then(function(r){return r.blob();}).then(function(blob){var reader=new FileReader();reader.onload=function(){DreamNativeDownloads.saveFile(reader.result.split(',')[1],name);};reader.readAsDataURL(blob);}).catch(function(){alert('匯出準備失敗，請重試。');});return;}return original.apply(this,arguments);};})();",null);}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest r){
    if((ORIGIN+"/index.html").equals(r.getUrl().toString()))return false;
    if("https".equals(r.getUrl().getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,r.getUrl()));}catch(Exception ignored){}
    return true;
   }
  });
  ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){@Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request){return respond(request);}});
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(fileUpload!=null)fileUpload.onReceiveValue(null);fileUpload=callback;
    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");
    try{startActivityForResult(intent,43);return true;}catch(Exception error){fileUpload=null;return false;}
   }
   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
    if(!ORIGIN.equals(origin)&&!(ORIGIN+"/").equals(origin)){callback.invoke(origin,false,false);return;}
    if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);return;}
    if(pending!=null)pending.invoke(pendingOrigin,false,false);
    pending=callback;pendingOrigin=origin;
    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},42);
   }
  });
  web.loadUrl(ORIGIN+"/index.html");
 }
 public final class DownloadFiles {
  @JavascriptInterface public void saveFile(String encoded,String name){
   if(encoded==null||encoded.length()>56*1024*1024||name==null||!name.matches("[A-Za-z0-9._-]{1,100}\\.(json|html)"))return;
   final byte[] bytes;try{bytes=android.util.Base64.decode(encoded,android.util.Base64.DEFAULT);}catch(Exception error){return;}
   runOnUiThread(()->{if(!(ORIGIN+"/index.html").equals(web.getUrl())||fileDownload!=null)return;fileDownload=bytes;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(name.endsWith(".json")?"application/json":"text/html");intent.putExtra(Intent.EXTRA_TITLE,name);try{startActivityForResult(intent,44);}catch(Exception error){fileDownload=null;android.widget.Toast.makeText(MainActivity.this,"無法開啟儲存視窗",android.widget.Toast.LENGTH_LONG).show();}});
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==43&&fileUpload!=null){fileUpload.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileUpload=null;}
  if(request==44){byte[] bytes=fileDownload;fileDownload=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&bytes!=null)try(java.io.OutputStream stream=getContentResolver().openOutputStream(data.getData())){if(stream==null)throw new java.io.IOException();stream.write(bytes);android.widget.Toast.makeText(this,"檔案已儲存",android.widget.Toast.LENGTH_SHORT).show();}catch(Exception error){android.widget.Toast.makeText(this,"儲存失敗，請重試",android.widget.Toast.LENGTH_LONG).show();}}
 }
 private WebResourceResponse respond(WebResourceRequest request){
  Uri uri=request.getUrl();String path=uri.getPath(),host=uri.getHost();
  if(!"GET".equals(request.getMethod())||!"https".equals(uri.getScheme())||(uri.getPort()!=-1&&uri.getPort()!=443))return blocked();
  if("appassets.androidplatform.net".equals(host)){
   if(path==null||path.contains("..")||path.contains("\\")||!(path.equals("/index.html")||path.equals("/dream-mender.html")||path.equals("/sw.js")||path.matches("/assets/[a-f0-9]{20}\\.(js|png|jpg|webp)")))return blocked();
   String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".png")?"image/png":path.endsWith(".jpg")?"image/jpeg":path.endsWith(".webp")?"image/webp":"text/html";
   try{return new WebResourceResponse(mime,mime.startsWith("image/")?null:"UTF-8",getAssets().open(path.substring(1)));}catch(Exception error){return blocked();}
  }
  if("tiles.openfreemap.org".equals(host))return null;
  if(("overpass-api.de".equals(host)||"overpass.kumi.systems".equals(host))&&"/api/interpreter".equals(path))return null;
  if("api.openstreetmap.org".equals(host)&&"/api/0.6/map".equals(path))return null;
  if("tile.openstreetmap.org".equals(host)&&path!=null&&path.matches("/\\d+/\\d+/\\d+\\.png"))return null;
  return blocked();
 }
 private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));}
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==42&&pending!=null){pending.invoke(pendingOrigin,checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED,false);pending=null;}}
 @Override protected void onPause(){super.onPause();web.evaluateJavascript("window.dispatchEvent(new Event('blur'))",null);web.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){if(pending!=null){pending.invoke(pendingOrigin,false,false);pending=null;}if(fileUpload!=null)fileUpload.onReceiveValue(null);fileDownload=null;web.destroy();super.onDestroy();}
}
