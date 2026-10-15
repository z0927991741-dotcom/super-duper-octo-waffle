這次直接封裝最後的網頁試玩版本，保留原本的封面、角色選擇、Q 版地圖、縮放、圓形搖桿、NPC 與任務畫面，不是先前另外製作的 Godot 介面。

- Windows：下載 DreamMender-Web-Windows.zip（約 161 MB），完整解壓後開啟 DreamMender.exe。Windows 10／11 x64，不用安裝 Node.js 或啟動伺服器。
- Android：下載 DreamMender-Web-Android.apk（約 11 MB），Android 7+，需可用的系統 WebView。應用程式名稱「夢境修補員・網頁版」，可與舊 Godot 版並存。
- README.md：操作說明與限制。SHA256SUMS.txt：檔案校驗值。

兩個包內的 HTML 與公開網頁位元組完全相同，均為 SHA256 `515ab5c576cfd8b528bed713b54ceaf3fcb9f8bb6db72c76beb7116ed86d6a68`。遊戲內容內建，可離線進行模擬玩法；存檔與網站／舊版分開。

Windows 使用 Electron、Android 使用 WebView，不是 Godot／Unity 原生版本，不能宣稱符合指定引擎要求。正式座標仍未查證，實地任務維持鎖定。Windows 實機執行、Android 手機安裝與戶外定位尚未驗證。
