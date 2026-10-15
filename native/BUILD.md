# Godot 原生版建置

專案：Godot 4.6.3 stable，入口 main.tscn。直接用 Godot 開啟 native/project.godot 即可編輯。

## 資料與模組

- 任務、美術、NPC：`node scripts/export-native-data.mjs` 從網頁來源匯出到 native/data/game.json，避免手動維護兩份座標。
- scripts/rules.gd：經緯度距離、精度與逾期、正式座標守門。
- scripts/walker.gd：道路網上的模擬位移及沿路距離。
- scripts/challenge.gd：展示、輸入、答錯、成功狀態。
- scripts/save.gd：分模式存檔、唯一獎勵、原子寫檔。
- android-src/DreamLocation.java：前景 GPS 與權限；透過 JSON 傳遞資料，不存取背景位置。

## 已驗證的 Linux 建置環境

Godot 4.6.3；Temurin JDK 21.0.12.1；Android SDK 36、build-tools 36.1.0；Godot 官方 Android Gradle 範本。

```sh
node scripts/export-native-data.mjs
python scripts/setup-native.py
python scripts/prepare-android.py
```

`DREAM_TOOLCHAIN` 預設 `/workspace/toolchain`，下載項目與雜湊固定在 toolchain-lock.json。若改用其他位置，請一併調整 export_presets.cfg 的自訂範本路徑。SDK 首次使用須接受授權；使用該目錄 cli19/cmdline-tools/bin/sdkmanager 指定 --sdk_root 接受 --licenses。受代理限制環境需依 sdkmanager 文件設定 --proxy_host／--proxy_port，不得停用 TLS 驗證。

本雲端工作區將 XDG_DATA_HOME、XDG_CONFIG_HOME、XDG_CACHE_HOME 指向可寫入的 /workspace/toolchain/state 子目錄。勿覆寫 HOME。

```sh
godot --headless --path native --editor --import --quit
godot --headless --path native -- --self-test
godot --headless --path native --export-release Windows
godot --headless --path native --export-pack 'Android Pack' android/build/src/main/assets/game.pck
python scripts/build-android.py
```

最後一步產出未簽署 APK。使用 Android build-tools 的 zipalign 與 apksigner，以私人 keystore 簽署，再用 `apksigner verify` 驗證。私人 keystore 與密碼不得提交 Git 或公開發行；後續更新必須沿用同一把金鑰。

測試環境可用 Xvfb 啟動 Godot，加 `-- --ui-test` 跑三關與截圖；請使用獨立 XDG_DATA_HOME，因測試會寫入並重設測試存檔。實際發行不可把這些結果當作 Android 戶外 GPS 或 Windows 實機測試證據。

APK 使用 ARM64 與 x86_64；最低 Android 7（API 24）。APK 附所有遊戲素材，首次安裝後即可離線進行模擬玩法；實地 GPS 仍需裝置定位可用，外部資料連結需要網路。
