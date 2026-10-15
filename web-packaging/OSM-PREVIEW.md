# OpenStreetMap GPS 測試版 0.20.0

基準：main `a7624ce54f4aa382e8dec444b652d05a0cfa81c0` 的 web-packaging 網頁同版；全部素材取自此版本。沒有使用 native/Godot 畫面。

## 安裝與範圍

`DreamMender-OSM-Preview.apk` 為 Android 7+ 的 **debug 簽署測試包**，顯示名稱「夢境修補員・OSM測試」，應用程式 ID `org.dreammender.pingtung.web.osmpreview`。可和原網頁 APK 並存，不能覆蓋更新原 APK，也不會匯入它的存檔。測試包內的模擬／實地進度仍分開儲存。

啟動後維持模擬模式。切換「真實定位」後，需主動按「啟用／重試定位」才請求位置。有效定位會顯示玩家、精度圓圈與 OSM 街道圖，可拖曳、縮放或按「回到定位」。圖塊需要網路；Leaflet 1.9.4、遊戲程式與圖片內建。實地模式地圖是街道參考，不提供路線導航。

Android 封裝只新增 `https://tile.openstreetmap.org/{z}/{x}/{y}.png` GET 圖片請求白名單，保留原本的本機頁面與外部連結處理。使用識別應用程式的 User-Agent、WebView 預設 HTTP 快取和可見 OSM 署名；不批次下載或提供離線預載。約略位置已授權時不重複要求權限，仍由 25 公尺精度門檻限制抵達。

## 景點資料

三個原始 Maps 短連結：
- https://maps.app.goo.gl/Ru7T7WqGLx1Y9UXP6
- https://maps.app.goo.gl/myVYZmokTeEusfXE7
- https://maps.app.goo.gl/qt118sb56Pn7HxgDA

網頁工具無法解析，環境代理對 maps.app.goo.gl 回應 403。不能確定三連結各自對應的名稱與位置。現有任務名稱「屏東美術館外」「阿猴城門（朝陽門）」「屏東書院外」沿用專案資料，並非這次從連結查得。

所有 `official` 與 `entrance` 座標保持 null；未新增正式座標，也未宣稱 OSM 標記就是安全入口。景點中心需 `officialReady`，安全入口另需 `entrance.verified`、HTTPS 來源及有效經緯度。真實抵達使用入口的距離，缺任一查證即鎖定。測試用座標只存在測試程式，不是景點資料。

## 已驗證

- 23 項既有核心測試及 2 項新增 GPS 測試通過。包含 Haversine 距離、入口／中心分離、29／31 公尺邊界、25 公尺定位精度上限、15 秒期限、未查證鎖定、錯誤與停止後回呼、模式存檔隔離、模擬路網及記憶挑戰。
- Chromium 390×844 操作測試通過，使用受控 GPS 回呼與攔截圖塊：明確按鈕授權、拒絕與重試、玩家與精度範圍、沒有虛構景點標記、縮放／移動／回定位、圖塊錯誤、過期與低精度移除玩家、切回模擬與獨立存檔。沒有向公共 OSM 圖塊服務發出自動化測試請求。
- 人工檢視手機測試截圖；地圖署名與控制項可見。
- Android assembleDebug 成功，apksigner verify 驗證 v2 簽章，Manifest 為 API 24+、target 36、包含 fine/coarse 權限。
- APK 的 assets/index.html 與本次 dist/dream-mender.html 位元組完全一致。

## 尚未驗證／限制

- 原有全套瀏覽器通關流程尚未重跑：新增回歸指令的權限自動審核服務因使用額度限制未執行。既有核心測試與上述已通過 OSM 測試不受影響。
- 沒有 Android 實機或模擬器安裝測試；原生權限視窗、約略／精確定位切換、背景恢復、真實 WebView 圖塊網路與快取仍待驗證。
- 沒有戶外 GPS、景點名稱與中心／安全入口現勘、實際抵達／GPS 飄移測試。
- 尚無原正式簽署金鑰，不能交付沿用原簽章的更新包；此包使用測試金鑰和不同 app ID。
- AGP 沿用基準版本 8.6.1；編譯 SDK 36 成功但會顯示超出其已測試 SDK 35 的警告。

## 檔案驗證

APK SHA256：`c19ec167b6743afa5e70c27edbd2f9d67b23a22d12bc76e2033e4051b2285c7b`

網頁 payload SHA256：`ec45ecc592c2ba0c5ce8237f7d360619acf12d00f8b57c8928500584f9bd1d2f`

測試簽章憑證 SHA256：`31c3b0a7351e194656befe710c4377258d658ffe64c1c0a8c4db9b7abfac8335`

## 重現

`npm ci && npm test && npm run build:standalone`。瀏覽器測試使用 `python tests/osm-browser.py`，需 Python Playwright 和 `/usr/bin/chromium`，全部網路請求都由測試攔截。

Android 需要 JDK 21、SDK 36、build-tools 36.1.0 和 Gradle 8.11.1。將 `dist/dream-mender.html` 複製至 `web-packaging/android/src/main/assets/index.html`，設定 local.properties 的 sdk.dir，再於該 Android 目錄執行 `gradle assembleDebug`。debug 金鑰由本機產生，因此重新建置的憑證／APK 雜湊不會相同。金鑰和密碼均未提交。

Leaflet 授權見 src/vendor/LEAFLET-LICENSE；OSM 圖塊政策：https://operations.osmfoundation.org/policies/tiles/ 。
