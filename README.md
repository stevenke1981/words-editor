# words-editor

多文體、離線優先的 **文章／書籍寫作生產力工具**。  
支援知識關聯圖、金句、章節狀態、寫作指標，以及 6 階段 AI Agent 管線。

> 不只財經：內建多種寫作模板（通用文章、技術教學、部落格、報導、產品文案、隨筆、學術大綱、How-to、旅行紀實、財經書等）。

## 功能亮點

| 功能 | 說明 |
|------|------|
| **寫作模板** | 一鍵套用不同文體骨架與知識圖 |
| **三欄布局** | 知識圖 / 編輯器 / 狀態與指標 |
| **知識關聯圖** | 原生 SVG：拖曳、縮放、平移、點擊 |
| **金句與參考** | 章節關聯金句、靈感筆記、參考資料 |
| **匯出** | JSON 備份、單章／全書 Word (`.docx`)、PDF、Markdown |
| **AI Agent** | Architect → Research → Writer → Editor → Reviewer → Visualizer；可單獨執行 Editor／Visualizer |
| **LLM 提供者** | DeepSeek、OpenRouter、Qwen、Sakana、Gemini、本地 Ollama |
| **桌面** | 可選 Tauri 2 打包 |

## 快速開始

```bash
# 需要 Node.js 18+
npm install
npm run dev
```

瀏覽器開啟終端顯示的位址（預設 `http://localhost:1420`）。

```bash
npm run build    # 型別檢查 + 生產建置
npm test         # 單元測試
```

### 桌面版（Tauri，可選）

```bash
# 需 Rust + 系統相依套件，見 https://tauri.app
npm run tauri dev
```

## 寫作模板（範例）

點頂部 **📋 模板** 選擇（皆含可改寫的範例內文與知識圖）：

**基礎／非虛構**

1. **通用文章**（預設）— 開場／論點／行動（含完整範例段落）
2. **財經／理財書** — 心態與系統化條件
3. **技術教學** — 需求、步驟、FAQ
4. **部落格觀點文** — 鉤子、立場、案例
5. **專題／報導** — 導言、時間線、多方觀點
6. **產品文案** — 痛點、利益、CTA
7. **個人隨筆** — 場景、衝突、余韻
8. **學術／報告大綱** — 摘要到結論
9. **How-to 指南** — 清單與檢查表
10. **旅行／紀實** — 路線與見聞

**敘事／評論／商務／職場**

11. **短篇小說** — 雨夜重逢範例（場景→衝突→轉折→余韻）
12. **演講稿** — 開場鉤子、故事、論點、CTA
13. **書評／影評** — 總評、論點、局限、適合誰
14. **人物專訪** — 側寫、對話、方法、金句
15. **電子報** — 主旨、單一重點、方法、結尾
16. **案例研究** — 背景、診斷、行動、結果
17. **社群串文** — 鉤子推文 + 清單 + 互動
18. **企劃／提案** — 摘要、方案、預算、風險
19. **兒童故事** — 短句節奏與溫柔轉折
20. **專欄／社論** — 現象、論證、反方、建議
21. **會議紀錄** — 決議與待辦追蹤
22. **科幻極短篇** — 單一設定與余味結尾

套用模板會取代目前專案內容；可先 **匯出 JSON** 備份。

## AI 設定

1. 點 **⚙ 設定**
2. 選擇 DeepSeek / OpenRouter / Qwen / Sakana / Gemini / Ollama
3. 填入 API Key（僅存本機 `localStorage`，不上傳）
4. 使用 **✨ AI 改寫建議** 時，會依目前模板的文體／主題調整提示詞

未設定金鑰時會使用本地模擬改寫。

## 專案結構

```text
src/
  App.tsx                 # 主 UI
  data/templates.ts       # 多文體模板
  types.ts                # 資料模型
  services/
    agentService.ts       # 6 階段 Agent + LLM
    exportService.ts      # Word / PDF / Markdown
  components/
    KnowledgeGraph.tsx    # SVG 知識圖
src-tauri/                # Tauri 桌面殼
spec.md / plan.md         # 規格與路線圖
```

## 資料模型（摘要）

```json
{
  "title": "專案標題",
  "templateId": "general-article",
  "genre": "一般寫作",
  "chapters": [{ "id": "01", "title": "...", "status": "草稿", "content": "..." }],
  "knowledgeGraph": { "nodes": [], "edges": [] },
  "goldenQuotes": []
}
```

專案內容會以版本化 envelope 自動寫入瀏覽器 `localStorage`（鍵名 `wordsEditor:project`）。舊版
`wordsEditorProject` 會在載入時自動遷移；可用頂部 **匯出 JSON** 建立可攜式備份，再以
**匯入 JSON** 還原。

Web／Tauri UI 的 PDF 匯出會使用瀏覽器平台字型 rasterize，再交由 jsPDF 分頁，因此可保留繁體中文；
若直接呼叫 `exportToPdf` 等同步 service API，仍需自行註冊 Noto Sans TC 等 CJK 字型。若 UI raster 渲染失敗會直接報錯，不會產生帶有 CJK 警告的錯誤 PDF。Word 與 Markdown 匯出不受此限制。

## 技術堆疊

- React 18 + TypeScript + Vite
- Tailwind CSS
- Tauri 2（可選桌面）
- docx / jspdf 匯出
- Vitest

## 授權

MIT（若之後在 repo 根目錄新增 `LICENSE` 檔則以該檔為準）。

## 貢獻

歡迎 Issue / PR。AI 提交請附：

```text
Co-Authored-By: <model name and attribution>
```
