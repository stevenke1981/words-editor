# Agent 指示

## 專案性質

多文體 **文章／書籍寫作** 生產力工具（React + Vite + 可選 Tauri）。  
預設不是財經專用；財經為眾多模板之一。

## 核心文件

| 檔案 | 用途 |
|------|------|
| `README.md` | 使用說明與快速開始 |
| `spec.md` | 系統需求與資料模型 |
| `plan.md` | 分階段實作計畫 |
| `agents.md` | 本檔：Agent 協作與實作優先順序 |
| `src/data/templates.ts` | 寫作模板定義 |

## 程式碼入口

- UI：`src/App.tsx`
- 模板：`src/data/templates.ts`
- Agent 管線：`src/services/agentService.ts`
- 匯出：`src/services/exportService.ts`
- 型別：`src/types.ts`

## Agent 協作流程（寫作管線）

```text
Architect → Research → Writer → Editor → Reviewer → Visualizer
```

提示詞必須依目前專案的 `genre` / `themeHint` 注入，**不可寫死「財富自由」**。

## 實作優先順序

1. 本地優先：Ollama + 開源模型
2. 雲端備援：DeepSeek / OpenRouter
3. UI：模板選擇、右鍵／工具列觸發特定 Agent 階段

## 驗證

```bash
npm run build
npm test
```

## 提交歸屬

AI 提交必須包含：

```text
Co-Authored-By: (the agent model's name and attribution byline)
```
