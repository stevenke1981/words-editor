# 寫作生產力系統 需求規格 (Specification)

## 1. 產品定位

離線優先的 **多文體文章／書籍寫作** 工具，協助作者：

- 用模板快速建立結構（不限財經）
- 維持全局知識圖與金句
- 量化寫作進度
- 可選 AI 六階段管線輔助

## 2. 整體架構

### 2.1 主要畫面布局

- **左側欄 (~20%)**：知識關聯圖 + 金句總結 + 專案架構導航
- **中央 (~55%)**：單篇富文本編輯器 + 標題
- **右側欄 (~25%)**：文章狀態 + 寫作指標 + 參考資料

### 2.2 頂部操作

- 專案標題（可重新命名）
- **模板選擇**（多文體）
- 匯出 JSON / Word / PDF
- API 設定（DeepSeek / OpenRouter / Ollama）
- 展開知識圖

### 2.3 資料模型

```json
{
  "title": "我的新文章",
  "templateId": "general-article",
  "genre": "一般寫作",
  "description": "可選說明",
  "chapters": [
    {
      "id": "01",
      "chapter": "01",
      "title": "開場",
      "section": "開頭",
      "status": "草稿",
      "content": "...",
      "wordCount": 120,
      "added": 120,
      "deleted": 0,
      "retention": 100,
      "rewrite": 0,
      "lastSaved": "2026-08-02 12:00",
      "inspirationNotes": "...",
      "references": [{ "date": "2026-08-01", "title": "參考篇名" }]
    }
  ],
  "knowledgeGraph": {
    "nodes": [{ "id": "k1", "label": "核心問題", "type": "concept", "x": 100, "y": 40 }],
    "edges": [{ "id": "e1", "source": "k1", "target": "k2" }]
  },
  "goldenQuotes": [
    { "id": "q1", "text": "…", "chapterId": "01", "createdAt": "2026-08-02" }
  ]
}
```

`status`：`待寫` | `草稿` | `完成`

### 2.4 寫作模板（範例庫）

| ID | 名稱 | 文體 |
|----|------|------|
| `general-article` | 通用文章（預設） | 一般寫作 |
| `finance-book` | 財經／理財書 | 財經非虛構 |
| `tech-tutorial` | 技術教學 | 技術文件 |
| `blog-opinion` | 部落格觀點文 | 部落格 |
| `news-feature` | 專題／報導 | 新聞專題 |
| `product-copy` | 產品文案 | 行銷文案 |
| `personal-essay` | 個人隨筆 | 散文隨筆 |
| `academic-outline` | 學術／報告大綱 | 學術寫作 |
| `howto-guide` | How-to 指南 | 實用指南 |
| `travel-story` | 旅行／紀實 | 旅行紀實 |
| `short-story` | 短篇小說 | 虛構敘事 |
| `speech-script` | 演講稿 | 演說稿 |
| `book-review` | 書評／影評 | 評論寫作 |
| `interview-profile` | 人物專訪 | 訪談寫作 |
| `email-newsletter` | 電子報 | 電子報 |
| `case-study` | 案例研究 | 商業案例 |
| `social-thread` | 社群串文 | 社群內容 |
| `business-proposal` | 企劃／提案 | 商務寫作 |
| `children-story` | 兒童故事 | 兒童文學 |
| `op-ed` | 專欄／社論 | 意見專欄 |
| `meeting-notes` | 會議紀錄 | 職場文件 |
| `sci-fi-flash` | 科幻極短篇 | 科幻虛構 |

每個模板需提供：可讀的範例段落（非空骨架）、知識圖節點、可選金句。

## 3. 核心功能規格

### 3.1 章節／單元管理

- 依模板產生多層區塊（部／節／段等標籤可依模板調整）
- 狀態：待寫 / 草稿 / 已完成
- 進度與字數統計

### 3.2 富文本編輯器

- 粗體、斜體、引用（MVP）
- 即時字數（中文字 + 英文單字）
- 自動儲存（本機 `localStorage`）
- AI 改寫建議（文體感知）

### 3.3 寫作指標

- 單篇字數、新增／刪除、原文保留率、改寫幅度

### 3.4 知識管理

- 可互動知識關聯圖
- 金句總結
- 參考文獻

### 3.5 AI Agent 管線

```text
Architect → Research → Writer → Editor → Reviewer → Visualizer
```

- 提示詞注入：`genre`、`themeHint`、`projectTitle`
- 不得寫死單一主題（例如僅「財富自由」）

## 4. 非功能需求

- **離線優先**：完整本地運作（AI 可選雲端）
- **資料安全**：本機儲存 + JSON 備份；API Key 不上傳伺服器（僅存瀏覽器）
- **性能**：支援長文／多章
- **可擴充**：新增模板只需擴充 `src/data/templates.ts`

## 5. 使用者流程

1. 開啟應用 → 預設「通用文章」模板（或還原上次專案）
2. 可選：切換其他寫作模板
3. 點擊章節 → 編輯
4. 寫作時即時看到指標變化
5. （可選）AI 輔助改寫／管線
6. 標記狀態 + 匯出備份
