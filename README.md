# 夢境修補員：網頁同版安裝包 v0.19.0

此版本直接封裝最後的網頁試玩內容，沒有另用 Godot 重畫。Windows 使用 Electron，Android 使用系統 WebView；不屬於老師要求的 Godot／Unity 原生版本。舊 Godot 專案仍保留於 native/。

## Windows

解壓整個 ZIP，執行 DreamMender.exe。旁邊 resources、locales、DLL 等檔案不可刪除或只複製 EXE。支援 Windows 10／11 x64。預設模擬定位；Windows 包未提供真實 GPS，啟用時會提示定位權限未允許，不會自動換模式。無需安裝 Node.js，也不需啟動伺服器或開 localhost。

## Android

安裝 DreamMender-Web-Android.apk。Android 7+，需系統提供可用的 Android System WebView。以獨立應用程式 ID 安裝，可和舊 Godot 版並存；名稱「夢境修補員・網頁版」。啟動為模擬模式；只有主動按定位才要求裝置權限。定位精度不足、逾期與拒絕使用網頁原有提示及重試規則。

## 共通

遊戲主程式、圖片與樣式內建，首次開啟不用下載網頁，可離線玩模擬模式。景點外部來源連結需要網路。兩個安裝包與網站各自保存進度，不會自動匯入舊版存檔；清除應用程式資料或移除會失去進度。

正式座標仍未查證，真實任務保持鎖定。Windows 實機與 Android 手機安裝／戶外 GPS 尚待驗證，不得當成已完成作業驗收。

## 建置

先依 native/BUILD.md 準備已固定雜湊的 JDK、SDK、Gradle。scripts/build-web-installers.py 會重建單檔網頁、將同一份位元組包入兩版本、使用官方電子簽章清單核對 Electron 壓縮檔，再建立 ZIP 與簽署 APK。私人簽署金鑰維持工作區既有路徑，不得提交。Electron 校驗為官方 SHA256 清單，非程式碼簽章；Windows EXE 沿用 Electron 名稱以外的原始 metadata，未另簽署發行者憑證。
