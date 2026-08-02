/**
 * Agent Pipeline Service with DeepSeek v4 Flash (cloud API) support
 * 
 * Implements the 6-stage pipeline:
 * Architect → Research → Writer → Editor → Reviewer → Visualizer
 * 
 * Usage from React:
 *   import { runAgentPipeline, type Provider } from './services/agentService';
 * 
 *   const result = await runAgentPipeline(task, { provider: 'deepseek', apiKey, model: 'deepseek-chat' }, (stage, status) => {
 *     // update loading UI
 *   });
 * 
 * Security note: API key is passed from UI (memory only). For production,
 * consider moving API calls to Tauri Rust backend using reqwest + tauri commands
 * to avoid exposing keys in frontend bundle.
 * 
 * Follows project style: clean TS, immutable where possible, explicit errors.
 */

export type AgentStageName =
  | 'architect'
  | 'research'
  | 'writer'
  | 'editor'
  | 'reviewer'
  | 'visualizer';

export interface AgentStage {
  name: AgentStageName;
  label: string; // Chinese display name
  promptTemplate: string;
  result?: string;
  error?: string;
  durationMs?: number;
}

export interface PipelineResult {
  stages: AgentStage[];
  finalOutput?: string;
  totalDurationMs?: number;
  success: boolean;
}

export interface ProgressCallback {
  (stageName: AgentStageName, status: 'start' | 'complete' | 'error', message?: string): void;
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OLLAMA_API_URL = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'deepseek-chat'; // DeepSeek v3 / fast "flash" equivalent for chat

export type Provider = 'deepseek' | 'openrouter' | 'ollama';

export interface PipelineTheme {
  /** Genre label, e.g. 技術文件 / 一般寫作 */
  genre?: string;
  /** Free-text theme hint for reviewers and writers */
  themeHint?: string;
  /** Project title */
  projectTitle?: string;
}

// Stage definitions with Chinese labels and prompt templates
// Genre/theme placeholders: {{genre}} {{theme}} {{project}}
const STAGE_DEFINITIONS: Omit<AgentStage, 'result' | 'error' | 'durationMs'>[] = [
  {
    name: 'architect',
    label: 'Architect（架構師）',
    promptTemplate: `你是一位專業的寫作架構師（Architect Agent）。
文體／類型：{{genre}}
主題方向：{{theme}}
專案：{{project}}

請針對以下寫作任務，設計清晰的結構化大綱。

任務：{{input}}

要求：
- 輸出 Markdown 格式的大綱
- 包含 3-7 個主要章節/段落
- 每個要點附帶 1-2 句核心論述
- 確保邏輯流暢、符合該文體讀者期待
- 直接輸出大綱，不要前言`,
  },
  {
    name: 'research',
    label: 'Research（研究員）',
    promptTemplate: `你是一位嚴謹的研究專家（Research Agent）。
文體／類型：{{genre}}
主題方向：{{theme}}

根據前一階段的架構，列出需要補充的關鍵研究要點。

前一階段輸出：
{{prev}}

要求：
- 針對每個架構點，提出 1-3 個具體研究方向或數據需求
- 建議可能的來源（書籍、論文、案例、統計、一手訪談等）
- 使用項目符號列表
- 標註哪些是「必須」 vs 「可選」
- 直接輸出列表，不要多餘解釋`,
  },
  {
    name: 'writer',
    label: 'Writer（作家）',
    promptTemplate: `你是一位專業寫作者（Writer Agent）。
文體／類型：{{genre}}
主題方向：{{theme}}
專案：{{project}}

請根據架構與研究要點，撰寫完整、流暢的章節／段落初稿。

輸入內容：
{{prev}}

要求：
- 目標 600-1200 字（中文），依文體可調整密度
- 語氣符合該文體（教學文務實、隨筆真摯、報導中立、文案精煉等）
- 每段有明確主題句
- 自然融入研究要點
- 保留作者個人洞見空間
- 直接輸出正文（純文字或簡單 Markdown），不要標題或額外說明`,
  },
  {
    name: 'editor',
    label: 'Editor（編輯）',
    promptTemplate: `你是一位經驗豐富的編輯（Editor Agent）。
文體／類型：{{genre}}
主題方向：{{theme}}

請對以下草稿進行專業編輯潤飾。

草稿：
{{prev}}

編輯重點：
1. 改善句子節奏與流暢度
2. 消除重複與贅詞
3. 強化邏輯連接詞
4. 提升可讀性（符合目標讀者）
5. 保持原作者語氣與核心觀點

輸出格式：
【主要修改說明】（3-5 點）
【完整修改後版本】
（直接輸出，不要其他前言）`,
  },
  {
    name: 'reviewer',
    label: 'Reviewer（審稿人）',
    promptTemplate: `你是一位批判性思考的審稿專家（Reviewer Agent）。
文體／類型：{{genre}}
主題方向：{{theme}}
專案：{{project}}

請全面評估以下內容的發表／出版品質。

內容：
{{prev}}

評估維度：
- 邏輯一致性（有無矛盾）
- 事實可信度（標註需查證處）
- 讀者吸引力
- 與主題「{{theme}}」及文體「{{genre}}」的契合度
- 整體結構強度

輸出：
【總評分】：X/10
【優點】：
- ...
【待改進】：
- ...
【具體建議】（可立即執行的 3-5 點）
【是否推薦發表】：是/需大幅修改/否`,
  },
  {
    name: 'visualizer',
    label: 'Visualizer（視覺化專家）',
    promptTemplate: `你是一位知識圖譜與視覺化專家（Visualizer Agent）。
文體／類型：{{genre}}
主題方向：{{theme}}

從最終內容中萃取可視化元素。

內容：
{{prev}}

請輸出 JSON（純 JSON，無 Markdown 包裝）：
{
  "goldenQuotes": ["金句1", "金句2", "金句3"],
  "keyConcepts": [
    {"concept": "概念名", "relation": "與XX的關聯", "importance": 8}
  ],
  "chapterSummary": "100字以內的精煉摘要",
  "visualSuggestions": ["建議圖表1：...", "建議圖表2：..."],
  "knowledgeGraphNodes": ["節點A", "節點B"]
}`,
  },
];

/**
 * Low-level DeepSeek API caller (OpenAI compatible)
 */
async function callDeepSeek(
  prompt: string,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Invalid DeepSeek API key. Get one from https://platform.deepseek.com/');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位專業的 AI 寫作協作 Agent，輸出精準、結構化、實用。永遠使用繁體中文回應。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.75,
      max_tokens: 2500,
      top_p: 0.95,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    if (response.status === 401) {
      throw new Error('DeepSeek 認證失敗：API Key 無效或已過期');
    }
    if (response.status === 429) {
      throw new Error('DeepSeek 速率限制：請稍後再試或升級方案');
    }
    throw new Error(`DeepSeek API 錯誤 (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('DeepSeek 回應格式異常，缺少 content');
  }

  return data.choices[0].message.content.trim();
}

/**
 * Low-level OpenRouter API caller (OpenAI compatible)
 */
async function callOpenRouter(
  prompt: string,
  apiKey: string,
  model: string = 'deepseek/deepseek-chat'
): Promise<string> {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Invalid OpenRouter API key. Get one from https://openrouter.ai/');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
      'HTTP-Referer': window.location.origin || 'https://words-editor.local',
      'X-Title': 'words-editor',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位專業的 AI 寫作協作 Agent，輸出精準、結構化、實用。永遠使用繁體中文回應。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.75,
      max_tokens: 2500,
      top_p: 0.95,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    if (response.status === 401) {
      throw new Error('OpenRouter 認證失敗：API Key 無效或已過期');
    }
    if (response.status === 429) {
      throw new Error('OpenRouter 速率限制：請稍後再試');
    }
    throw new Error(`OpenRouter API 錯誤 (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('OpenRouter 回應格式異常，缺少 content');
  }

  return data.choices[0].message.content.trim();
}

/**
 * Low-level Ollama local API caller (for 本地 Ollama)
 */
async function callOllama(
  prompt: string,
  model: string = 'qwen2.5:7b'
): Promise<string> {
  const response = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位專業的 AI 寫作協作 Agent，輸出精準、結構化、實用。永遠使用繁體中文回應。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      options: {
        temperature: 0.75,
        num_predict: 2500,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Ollama API 錯誤 (${response.status}): ${errorText}。請確認 Ollama 正在 http://localhost:11434 執行，且已執行 ollama pull ${model}`);
  }

  const data = await response.json();

  if (!data.message?.content) {
    throw new Error('Ollama 回應格式異常，缺少 message.content');
  }

  return data.message.content.trim();
}

/**
 * Unified LLM caller based on provider.
 */
async function callLLM(
  prompt: string,
  provider: Provider,
  apiKey?: string,
  model?: string
): Promise<string> {
  const m = model || (provider === 'deepseek' ? DEFAULT_MODEL : provider === 'openrouter' ? 'deepseek/deepseek-chat' : 'qwen2.5:7b');
  if (provider === 'deepseek') {
    if (!apiKey) throw new Error('使用 DeepSeek 需提供 API Key');
    return callDeepSeek(prompt, apiKey, m);
  } else if (provider === 'openrouter') {
    if (!apiKey) throw new Error('使用 OpenRouter 需提供 API Key');
    return callOpenRouter(prompt, apiKey, m);
  } else if (provider === 'ollama') {
    return callOllama(prompt, m);
  }
  throw new Error(`未知的 provider: ${provider}`);
}

/**
 * Run the full 6-stage agent pipeline.
 * Supports progress callbacks for real-time UI loading states.
 * 
 * @param input - The writing task / chapter idea / content to process
 * @param config - Provider config (or legacy string = DeepSeek apiKey)
 * @param onProgress - Optional callback for stage start/complete/error (for loading UI)
 * @param model - Optional legacy model override
 */
export async function runAgentPipeline(
  input: string,
  config: { provider?: Provider; apiKey?: string; model?: string; theme?: PipelineTheme } | string,
  onProgress?: ProgressCallback,
  model?: string
): Promise<PipelineResult> {
  // Backward compatibility: allow old call with apiKey string (defaults to deepseek)
  let provider: Provider = 'deepseek';
  let apiKey: string | undefined;
  let modelName: string | undefined;
  let theme: PipelineTheme = {};
  if (typeof config === 'string') {
    apiKey = config;
    modelName = model;
  } else if (config) {
    provider = config.provider || 'deepseek';
    apiKey = config.apiKey;
    modelName = config.model || model;
    theme = config.theme || {};
  }

  if (!input || input.trim().length < 5) {
    throw new Error('輸入內容太短，請提供至少 5 個字的寫作任務或章節想法');
  }

  const genre = theme.genre?.trim() || '一般寫作';
  const themeHint = theme.themeHint?.trim() || '清晰、可讀、有觀點的文章';
  const projectTitle = theme.projectTitle?.trim() || '未命名專案';

  const startTime = Date.now();
  const stages: AgentStage[] = STAGE_DEFINITIONS.map((def) => ({ ...def })); // immutable copy
  let currentContext = input.trim();
  let success = true;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageStart = Date.now();

    onProgress?.(stage.name, 'start', `開始 ${stage.label}...`);

    try {
      // Build prompt: inject theme + original input + previous stage output
      let prompt = stage.promptTemplate
        .replace(/\{\{genre\}\}/g, genre)
        .replace(/\{\{theme\}\}/g, themeHint)
        .replace(/\{\{project\}\}/g, projectTitle)
        .replace('{{input}}', input)
        .replace('{{prev}}', currentContext);

      const result = await callLLM(prompt, provider, apiKey, modelName);

      // Update stage (immutable pattern - create new)
      stages[i] = {
        ...stage,
        result,
        durationMs: Date.now() - stageStart,
      };

      // Chain: feed this output to next stage
      currentContext = result;

      onProgress?.(stage.name, 'complete', `${stage.label} 完成`);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      stages[i] = {
        ...stage,
        error: errorMessage,
        durationMs: Date.now() - stageStart,
      };
      success = false;

      onProgress?.(stage.name, 'error', errorMessage);

      // Fail fast on critical early stages; continue for later (partial results useful)
      if (i <= 1) {
        // architect or research fail → stop
        break;
      }
    }
  }

  const finalStage = stages[stages.length - 1];
  const finalOutput = finalStage?.result || finalStage?.error;

  return {
    stages,
    finalOutput,
    totalDurationMs: Date.now() - startTime,
    success,
  };
}

/**
 * Helper: extract JSON from visualizer stage if present (for future graph integration)
 */
export function parseVisualizerOutput(result?: string): Record<string, unknown> | null {
  if (!result) return null;
  try {
    // Handle possible ```json fences
    const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Default export for convenience
export default {
  runAgentPipeline,
  parseVisualizerOutput,
  STAGE_DEFINITIONS,
};
