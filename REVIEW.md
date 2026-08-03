# words-editor 專案審查與改善建議

> 審查日期：2026-08-03
> 審查範圍：src/ 全部原始碼、設定檔、測試、建構流程

## 2026-08-03 改善後重新驗證

本文件下方保留原始審查內容作為歷史基線；以下項目已在本輪改善中落地：

- `useBook` 已抽出版本化儲存 adapter，支援 legacy key 遷移、JSON schema 正規化、匯入驗證、debounce autosave 與離開頁面前 flush。
- contentEditable 現在只將純文字寫回資料模型，渲染時會 escape HTML；主要 Modal、章節導覽與知識圖節點補上鍵盤操作與明確按鈕型別。
- Agent HTTP adapter 已區分瀏覽器／測試與 Tauri runtime；瀏覽器測試不再被動態 Tauri import 劫持，Tauri capability/CSP 改為明確 provider allowlist。
- Agent UI 已提供完整管線、Editor 單階段套用，以及 Visualizer 單階段結果預覽；service `PipelineOptions` 可限制 stages。
- TopBar 已接上全書 Word、全書 PDF、Markdown 匯出與儲存狀態；`exportService` 的全書 API 已可由 UI 觸發。
- Web／Tauri UI PDF 已改走瀏覽器平台字型的 html2canvas raster 路徑，實際繁中瀏覽器驗收可讀；若 raster 失敗會直接回報錯誤，不會偷偷產生帶有 CJK 警告的錯誤 PDF。同步 jsPDF API 仍保留 CJK 字型限制。
- Biome lint、Vitest、Vite build 與 Rust `cargo check` 均已重新執行並通過（完整命令與限制見交付回報）。

仍待後續處理：Tauri provider smoke test、長文編輯器的結構化格式模型，以及在封裝 Tauri 產物內點擊 PDF 的最終 smoke test（目前已完成封裝 exe 啟動驗收）。以下原始章節中若再次提到上述已完成項目，請以本節為準。

---

## 一、整體評價

專案在 Phase 1 已達成核心目標：三欄布局、多文體模板（22 種）、知識圖互動、6 階段 Agent 管線、四種匯出／備份格式。模板資料豐富且測試涵蓋了基本結構驗證。以下依優先順序列出改善建議。

---

## 二、架構層面（高優先）

### 2.1 App.tsx 上帝元件（1140 行）

**問題**：所有 UI 邏輯、狀態管理、事件處理、Modal 渲染集中在單一檔案。違反 Single Responsibility，導致：
- 任何功能修改都需理解整個檔案
- 無法獨立測試各區塊
- 多人協作必然衝突

**建議**：拆分為以下元件/模組

```
src/
├── components/
│   ├── TopBar.tsx
│   ├── EditorPanel.tsx        (中央編輯器)
│   ├── LeftSidebar/
│   │   ├── KnowledgeGraphCard.tsx
│   │   ├── GoldenQuotesCard.tsx
│   │   └── ChapterNav.tsx
│   ├── RightSidebar/
│   │   ├── StatusPanel.tsx
│   │   ├── MetricsPanel.tsx
│   │   └── ReferencesPanel.tsx
│   └── modals/
│       ├── TemplatePickerModal.tsx
│       ├── SettingsModal.tsx
│       └── GraphModal.tsx
├── hooks/
│   ├── useBook.ts             (狀態 + localStorage 持久化)
│   ├── useEditor.ts           (contentEditable 邏輯)
│   └── useAgentPipeline.ts    (AI 呼叫 + loading 狀態)
├── services/
├── data/
└── types.ts
```

### 2.2 缺乏狀態管理策略

**問題**：所有狀態用 `useState` 堆疊在 App 內（14+ 個 useState），`book` 物件的任何更新都觸發整棵元件樹 re-render。

**建議**：
- 短期：用 `useReducer` 管理 `book` 狀態，將 chapter CRUD、quote 操作、graph 操作收斂為 actions
- 中期（Phase 2 多專案）：引入 Zustand（輕量、無 Provider 嵌套、適合 Tauri）
- 將 localStorage 同步邏輯抽到 `useBook` hook 內，加入 debounce（目前每次 keystroke 都寫 localStorage）

### 2.3 Tailwind CDN vs 本地建構衝突

**問題**：
- `index.html` 載入 `https://cdn.tailwindcss.com`（runtime JIT）
- 同時 `package.json` 有 `tailwindcss` + `postcss` + `autoprefixer` 作為 devDependencies
- `index.css` 開頭註解寫「Tailwind directives removed for build compatibility」
- 結果：`npm run build` 產出的 CSS 不含 Tailwind utilities，完全依賴 CDN

**影響**：
- 離線使用（Tauri 桌面版）時 CDN 不可用 → UI 全部崩壞
- 違反 spec.md「離線優先」核心需求
- 生產環境不應該使用 Tailwind CDN（官方明確警告）

**建議**：
1. 移除 `index.html` 中的 CDN `<script>`
2. 在 `index.css` 恢復 `@tailwind base; @tailwind components; @tailwind utilities;`
3. 確認 `tailwind.config.js` 的 `content` 包含 `./src/**/*.{ts,tsx}` 和 `./index.html`
4. 驗證 `npm run build` 後 CSS 正確包含所有 utility classes

---

## 三、編輯器（高優先）

### 3.1 contentEditable + execCommand 已棄用

**問題**：
- `document.execCommand('bold')` 等 API 已被 MDN 標記為 deprecated
- contentEditable 的 HTML → 純文字轉換（`handleEditorInput` 中的 regex strip）會丟失格式
- 無法支援 undo/redo（瀏覽器原生 Ctrl+Z 在 contentEditable 行為不一致）
- 貼上外部 HTML 會引入髒標籤

**建議**（依投入程度排序）：
1. **最小改動**：引入 `DOMPurify` 清理貼上內容，保留 contentEditable 但改善 HTML→text 邏輯
2. **中等改動**：換用 [Tiptap](https://tiptap.dev/)（基於 ProseMirror，React 整合成熟，支援中文、字數統計、協作）
3. **完整方案**：Tiptap + 自訂字數 plugin + 自動儲存 extension

Tiptap 好處：
- 結構化 JSON 輸出（可直接存 Book.chapters[].content 為 JSON 而非 HTML string）
- 內建字數統計 extension
- 支援 Markdown 快捷鍵
- 活躍維護、TypeScript 原生

### 3.2 字數統計效能

**問題**：`computeStats` 在每次 `onInput` 事件觸發時對全文做 regex match。長文（5000+ 字）時每個 keystroke 都跑兩個 regex。

**建議**：
- 加入 `useDebouncedCallback`（150-300ms）延遲統計更新
- 或改用 `requestIdleCallback` 在閒暇時計算
- 字數顯示可用 `Intl.Segmenter`（更準確的中文字詞分割）

---

## 四、資料持久化（中高優先）

### 4.1 localStorage 無版本控制

**問題**：
- `BOOK_STORAGE_KEY = 'wordsEditorProject'` 硬編碼，無 schema version
- 當 `types.ts` 的 `Book` interface 新增欄位時，舊資料載入會缺少欄位（目前靠 `?.` 和 fallback 勉強運作）
- 無 migration 機制

**建議**：
```typescript
interface StorageEnvelope {
  version: number;       // schema version
  savedAt: string;
  data: Book;
}
```
- 載入時檢查 version，不符則跑 migration function
- 為 Phase 2 多專案做準備：key 改為 `wordsEditor:project:{id}`

### 4.2 自動儲存無 debounce

**問題**：`useEffect(() => { localStorage.setItem(...) }, [book])` 在每次 state 變更時同步寫入。打字時每秒可能觸發 5-10 次 JSON.stringify + localStorage.setItem。

**建議**：加入 500ms debounce，或使用 `requestIdleCallback`。

### 4.3 無資料匯入功能

**問題**：可以匯出 JSON 但無法匯入。使用者換電腦或清除瀏覽器資料後無法恢復。

**建議**：在頂部工具列加入「匯入 JSON」按鈕，讀取 File → 驗證 schema → 載入。

---

## 五、AI Agent 管線（中優先）

### 5.1 管線只能全部跑完

**問題**：`runAgentPipeline` 固定跑 6 階段。plan.md Phase 3 提到「單階段觸發」但目前無法：
- 只跑 Editor（最常用）
- 跳過 Research（不需要研究時）
- 從某階段繼續

**建議**：
```typescript
interface PipelineOptions {
  stages?: AgentStageName[];  // 預設全部
  startFrom?: AgentStageName;
  context?: string;           // 提供前序 context 給 startFrom
}
```

### 5.2 無 streaming 回應

**問題**：每個階段等完整回應才顯示。對於長文本，使用者可能等 30-60 秒無任何回饋（只有 stage name 變化）。

**建議**：
- DeepSeek / OpenRouter 都支援 `stream: true`（SSE）
- 實作 streaming 後可即時顯示 token 輸出
- Ollama 原生支援 streaming

### 5.3 錯誤處理可改善

**問題**：
- 階段 2（research）失敗就 break，但 writer/editor 其實可以在沒有 research 的情況下運作
- 錯誤訊息直接顯示原始英文 API error，對非技術使用者不友善

**建議**：
- 改為「降級繼續」策略：research 失敗 → writer 用 architect 輸出繼續
- 錯誤訊息本地化：`401 → API 金鑰無效，請至設定頁檢查`

### 5.4 Prompt 注入風險

**問題**：使用者輸入的 `content` 直接嵌入 prompt template（`{{input}}`、`{{prev}}`）。惡意或意外內容可能操縱 AI 行為。

**建議**：
- 對使用者內容加入明確的 delimiter（如 `<user_content>...</user_content>`）
- 在 system prompt 中明確指示忽略 user_content 內的指令
- 考慮對輸入做基本 sanitize（移除看起來像 system prompt 的模式）

---

## 六、匯出功能（中優先）

### 6.1 PDF 中文顯示問題

**問題**：`exportService.ts` 使用 `doc.setFont('helvetica')` — jsPDF 內建字型不支援 CJK 字元。匯出的 PDF 中文會顯示為方塊或空白。

**建議**：
- 嵌入 Noto Sans TC 字型（`doc.addFileToVFS` + `doc.addFont`）
- 或改用 `html2canvas` + `jspdf` 的 HTML 渲染路徑
- 或考慮 `@react-pdf/renderer`（React 原生 PDF，支援自訂字型）

### 6.2 只能匯出單章

**問題**：Word/PDF 匯出只處理 `currentChapter`，無法匯出整本書。

**建議**：
- 加入「匯出全部章節」選項
- Word：多 section 或分頁
- PDF：自動分頁 + 目錄

### 6.3 缺乏 EPUB / Markdown 匯出

plan.md Phase 4 提到 EPUB。建議先加入 Markdown 匯出（成本極低，對寫作者實用）。

---

## 七、測試覆蓋（中優先）

### 7.1 目前只有 1 個測試檔

`templates.test.ts` 涵蓋模板結構驗證，但以下完全未測試：
- `agentService.ts`（管線邏輯、prompt 組裝、錯誤處理）
- `exportService.ts`（Word/PDF 產出）
- `KnowledgeGraph.tsx`（互動邏輯）
- App 層級的整合行為

**建議**：
- `agentService.test.ts`：mock fetch，驗證 prompt 組裝正確、stage chaining、錯誤降級
- `exportService.test.ts`：驗證 Blob 產出、空內容處理
- 加入 `@testing-library/react` 做元件測試
- 目標：核心 services 80% 覆蓋率

### 7.2 無 E2E 測試

**建議**（Phase 2 再考慮）：
- Playwright 或 Vitest + happy-dom 做基本 UI 流程測試
- Tauri 可用 `tauri-driver`（WebDriver）

---

## 八、開發體驗與工程化（中優先）

### 8.1 無 Linter / Formatter

**問題**：`devDependencies` 中沒有 ESLint、Prettier、或 Biome。程式碼風格全靠自覺。

**建議**：
```bash
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```
或更輕量的 [Biome](https://biomejs.dev/)（單一工具同時 lint + format，速度快）。

### 8.2 無 pre-commit hook

**建議**：加入 `lint-staged` + `husky`（或 `lefthook`），在 commit 前自動跑 lint + type check。

### 8.3 TypeScript strict 已開啟（good）

`tsconfig.json` 有 `strict: true` + `noUnusedLocals` + `noUnusedParameters`，這是好的基礎。

### 8.4 路徑別名未使用

`tsconfig.json` 定義了 `@/*` → `src/*` 但 `vite.config.ts` 沒有對應的 `resolve.alias`。目前所有 import 都用相對路徑，建議：
- 要嘛移除 tsconfig 中的 paths（避免誤導）
- 要嘛在 vite.config.ts 加入 `resolve: { alias: { '@': '/src' } }` 並統一使用

---

## 九、UI/UX 改善（低中優先）

### 9.1 無響應式設計

三欄布局在 `< 1024px` 時堆疊為單欄（`col-span-12`），但：
- 頂部工具列按鈕在手機上會溢出
- 知識圖在小螢幕上太小無法操作
- 無 hamburger menu 或 drawer 模式

**建議**：至少確保平板（768px）可用。手機可考慮 Phase 2 再處理。

### 9.2 無 Undo/Redo UI

編輯器沒有可見的 undo/redo 按鈕。contentEditable 的 Ctrl+Z 行為不可靠。

### 9.3 無鍵盤快捷鍵說明

除了 Ctrl+S（只顯示 toast，沒有實際額外動作），缺乏：
- Ctrl+B / Ctrl+I（已有 toolbar 按鈕但無快捷鍵提示）
- Ctrl+Shift+N（新增章節）
- Alt+↑/↓（切換章節）

### 9.4 模板套用無预览

**問題**：套用模板前只有文字描述，無法預覽章節結構。使用者需 `window.confirm` 盲確認。

**建議**：在模板卡片加入「預覽」按鈕，顯示章節列表 + 知識圖節點。

### 9.5 使用 `prompt()` / `window.confirm()`

多處使用瀏覽器原生 dialog（新增金句、新增節點、重新命名、模板確認）。在 Tauri 桌面版中這些 dialog 外觀不一致。

**建議**：改用自訂 Modal 或 [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) / Headless UI。

---

## 十、安全性（低中優先）

### 10.1 API Key 存 localStorage

**問題**：`wordsEditorApiSettings` 含明文 API key。任何 XSS 漏洞都能讀取。

**現況**：程式碼已有註解說明生產環境應走 Tauri backend。

**建議**：
- Phase 2 Tauri：用 `tauri-plugin-stronghold` 或 OS keychain 儲存
- Web 版：至少改用 `sessionStorage`（關閉瀏覽器即清除）+ 明確警告

### 10.2 contentEditable XSS

**問題**：`editorRef.current.innerHTML = content.replace(/\n/g, '<br>')` 直接注入 HTML。如果 content 含有 `<script>` 或 event handler（從 AI 回應或匯入 JSON），可能觸發 XSS。

**建議**：
- 使用 `DOMPurify.sanitize()` 清理所有要注入 innerHTML 的內容
- 或改用 Tiptap（自動處理 sanitize）

---

## 十一、效能（低優先，Phase 2 再處理）

### 11.1 知識圖 SVG 無虚拟化

目前節點數少（< 30）不成問題。但如果 Phase 3 自動生成知識圖節點，可能達到 100+。

**建議**：節點超過 50 時考慮 canvas 渲染或 force-directed layout（d3-force）。

### 11.2 localStorage 大小限制

單一專案 JSON 可能達到數 MB（長篇小說 + 知識圖）。localStorage 通常限制 5-10MB。

**建議**：Phase 2 改用 IndexedDB（via `idb` 或 `Dexie.js`），或 Tauri 本地檔案。

---

## 十二、建議優先順序

| 優先 | 項目 | 理由 |
|------|------|------|
| P0 | 修復 Tailwind CDN → 本地建構 | 離線使用完全壞掉 |
| P0 | PDF 中文字型嵌入 | 匯出功能無效 |
| P1 | App.tsx 拆分 | 可維護性瓶頸 |
| P1 | 加入 ESLint/Biome | 程式碼品質守門 |
| P1 | localStorage debounce + versioning | 資料安全 |
| P2 | 替換 contentEditable → Tiptap | 編輯體驗根本改善 |
| P2 | Agent 單階段觸發 | 使用者最常需要的功能 |
| P2 | 補充 service 層測試 | 重構安全網 |
| P3 | 響應式 / 鍵盤快捷鍵 | UX 打磨 |
| P3 | 匯入 JSON / 全書匯出 | 功能完整性 |
| P3 | Streaming AI 回應 | 等待體驗改善 |

---

## 十三、值得保留的優點

- 模板系統設計良好：`WritingTemplate` interface 清晰、`createBook()` factory pattern 易於擴充
- Agent 管線的 prompt 設計專業：genre/theme 注入、階段鏈式傳遞、progress callback
- KnowledgeGraph 元件：純 SVG 實作、支援拖曳/縮放/平移、無外部依賴
- TypeScript strict mode + 明確的型別定義
- 測試雖少但品質不錯（templates.test.ts 涵蓋了 edge case）
- 文件完整：spec.md / plan.md / agents.md / README.md 四份核心文件

---

*審查者：Qwen Code Agent*
*Co-Authored-By: Qwen (Alibaba Cloud AI Assistant)*
