# 網頁同版封裝驗證

- Windows ZIP 及 Android APK 中的 index.html 與最後公開網頁完全相同，SHA256：515ab5c576cfd8b528bed713b54ceaf3fcb9f8bb6db72c76beb7116ed86d6a68。
- Electron 在 Linux/Xvfb 執行與 Windows 包相同的 app 程式，完整三關流程測試通過：鍵盤道路移動、抵達解鎖、NPC 對話、答錯重試、存檔重新開啟、唯一獎勵、通關、模式隔離及二次確認重設。測試用 --no-sandbox 僅為雲端環境；發行版沒有停用沙箱。
- Android APK 建置成功，定位權限及主 Activity 設定已檢查，v2/v3 簽章及 zipalign 通過。沒有打包 Godot 畫面或遠端網站捷徑。
- Windows 實際作業系統啟動、Android 真實手機 WebView／安裝／權限及戶外 GPS 尚未驗證。
- 正式座標仍未確認，真實任務鎖定；這版不是已符合老師指定引擎與戶外驗證要求的作業成品。

重跑桌面測試：先建置安裝包，再設定 ELECTRON_PATH 為同版本 Linux Electron，執行 npx playwright test --config playwright.installers.config.js。需 X server（測試預設 DISPLAY=:97），且採獨立暫存 user-data-dir，不會刪除玩家存檔。

手機尺寸以同一份獨立 HTML 跑 Chromium 測試：完成第一個夢境後可不重新整理前往下一個任務、三位 NPC 前景去背與主要對話立繪，2 項均通過。這是瀏覽器測試，不等於 Android 實機測試。
