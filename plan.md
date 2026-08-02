# 寫作生產力系統 Project Plan

## 1. 專案目標

建立 **多文體文章／書籍** 一站式生產力工具：結構化寫作、全局視野、量化進度、AI 加速。

核心價值：

- **多模板**：不限財經，涵蓋通用、技術、部落格、報導、文案、隨筆、學術、指南、旅行等
- **全局視野**：知識圖、金句、架構導航
- **專注寫作**：單篇編輯器 + 即時指標
- **快速迭代**：文體感知 AI + 一鍵匯出

## 2. 專案範圍

### Phase 1: 核心原型 — 已完成

- 三欄 UI + 知識圖 + 金句 + 章節狀態
- 富文本編輯、字數、本機儲存
- JSON / Word / PDF 匯出
- 多文體寫作模板（10 種）
- 文體感知 6 階段 Agent 管線（DeepSeek / OpenRouter / Ollama）

### Phase 2: 桌面與多專案

- Tauri 本地檔案系統
- 多專案工作區（同時多本書／多篇文章）
- 附件與圖片

### Phase 3: AI 深化

- 單階段觸發（只跑 Editor / 只跑 Visualizer）
- 知識圖自動更新
- 金句自動提取
- 語音輸入（可選）

### Phase 4: 進階

- 版本歷史與 diff
- 每日寫作 streak
- EPUB 匯出
- 自訂模板匯入／匯出

## 3. 技術堆疊

- 前端：React + TypeScript + Vite + Tailwind
- 桌面：Tauri 2
- AI：Ollama / DeepSeek / OpenRouter（OpenAI 相容）
- 儲存：localStorage（Web）→ 本地 JSON/SQLite（Phase 2）

## 4. 驗證指令

```bash
npm install
npm run build
npm test
```

## 5. 風險

- 富文本在超長文時的效能
- API Key 僅存前端：生產環境宜改走 Tauri backend
- 套用模板會覆蓋專案：需提示備份

## 6. 下一步

1. 多專案列表 UI
2. 自訂模板 JSON schema
3. Agent 單階段按鈕
