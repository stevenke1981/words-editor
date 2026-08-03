import { useCallback, useState } from 'react';
import {
  type AgentStageName,
  type Provider,
  isProvider,
  runAgentPipeline,
} from '../services/agentService';

export interface ApiSettings {
  provider: Provider;
  deepseekKey: string;
  openrouterKey: string;
  qwenKey: string;
  sakanaKey: string;
  geminiKey: string;
  modelName: string;
}

function createLocalStageOutput(content: string, stage: AgentStageName | 'full'): string {
  const excerpt = content.trim().split(/\r?\n/).find(Boolean) || '目前章節';
  if (stage === 'full' || stage === 'editor' || stage === 'writer') {
    return `${content.trim()}\n\n（AI 建議改寫：可在此處補充一個具體案例或數據，讓論點更具說服力。）`;
  }

  const outputs: Record<Exclude<AgentStageName, 'editor' | 'writer'>, string> = {
    architect: `【本地模擬・Architect】\n主題：${excerpt}\n\n- 核心問題：讀者需要先理解的主要矛盾\n- 論點順序：背景 → 關鍵觀察 → 可執行下一步\n- 章節建議：保留目前開場，補上證據與收束段落。`,
    research: `【本地模擬・Research】\n研究焦點：${excerpt}\n\n- 待查證：關鍵數據、時間點與引用來源\n- 建議資料：官方統計、原始研究、第一手訪談\n- 可信度提醒：未連線研究工具前，不將示例數字視為事實。`,
    reviewer: `【本地模擬・Reviewer】\n審稿摘要：${excerpt}\n\n- 優點：已有明確讀者問題與實作方向\n- 風險：部分論點仍需要案例或可驗證來源\n- 下一步：補一個具體例子，再檢查段落銜接與結論。`,
    visualizer: `【本地模擬・Visualizer】\n視覺化草圖：${excerpt}\n\n[核心問題] → [關鍵論點] → [證據／案例] → [讀者行動]\n\n這是離線預覽結果；設定 API Key 後可取得模型產生的正式視覺化建議。`,
  };
  return outputs[stage];
}

const API_SETTINGS_KEY = 'wordsEditorApiSettings';

function loadApiSettings(): ApiSettings {
  const defaults: ApiSettings = {
    provider: 'deepseek',
    deepseekKey: '',
    openrouterKey: '',
    qwenKey: '',
    sakanaKey: '',
    geminiKey: '',
    modelName: '',
  };
  try {
    const saved = localStorage.getItem(API_SETTINGS_KEY);
    if (saved) {
      const s = JSON.parse(saved);
      return {
        provider: isProvider(s.provider) ? s.provider : defaults.provider,
        deepseekKey: typeof s.deepseekKey === 'string' ? s.deepseekKey : '',
        openrouterKey: typeof s.openrouterKey === 'string' ? s.openrouterKey : '',
        qwenKey: typeof s.qwenKey === 'string' ? s.qwenKey : '',
        sakanaKey: typeof s.sakanaKey === 'string' ? s.sakanaKey : '',
        geminiKey: typeof s.geminiKey === 'string' ? s.geminiKey : '',
        modelName: typeof s.modelName === 'string' ? s.modelName : '',
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return defaults;
}

export function useAgentPipeline() {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [settings, setSettings] = useState<ApiSettings>(loadApiSettings);

  // Reload settings from localStorage (e.g., when opening settings modal)
  const reloadSettings = useCallback(() => {
    setSettings(loadApiSettings());
  }, []);

  // Persist settings
  const saveSettings = useCallback((newSettings: ApiSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {
      // Private browsing or quota errors should not prevent using the app.
    }
  }, []);

  // Clear all settings
  const clearSettings = useCallback(() => {
    const defaults: ApiSettings = {
      provider: 'deepseek',
      deepseekKey: '',
      openrouterKey: '',
      qwenKey: '',
      sakanaKey: '',
      geminiKey: '',
      modelName: '',
    };
    setSettings(defaults);
    localStorage.removeItem(API_SETTINGS_KEY);
  }, []);

  // Check if real API is configured for current provider
  const hasApiKeyConfigured = useCallback((): boolean => {
    const { provider, deepseekKey, openrouterKey, qwenKey, sakanaKey, geminiKey } = settings;
    if (provider === 'deepseek') return !!deepseekKey && deepseekKey.trim().length > 8;
    if (provider === 'openrouter') return !!openrouterKey && openrouterKey.trim().length > 8;
    if (provider === 'qwen') return !!qwenKey && qwenKey.trim().length > 8;
    if (provider === 'sakana') return !!sakanaKey && sakanaKey.trim().length > 8;
    if (provider === 'gemini') return !!geminiKey && geminiKey.trim().length > 8;
    if (provider === 'ollama') return true; // local, no key required
    return false;
  }, [settings]);

  /**
   * Run AI rewrite via agent pipeline (or local simulation fallback).
   * Returns the new content string, or null on failure.
   */
  const runRewrite = useCallback(
    async (
      content: string,
      genre: string,
      themeHint: string,
      projectTitle: string,
      chapterTitle: string,
      stage: AgentStageName | 'full' = 'full',
    ): Promise<string | null> => {
      const useReal = hasApiKeyConfigured();
      setIsAiLoading(true);
      setAiStatus(
        useReal
          ? `使用 ${settings.provider} 呼叫${stage === 'full' ? '完整 Agent Pipeline' : `${stage} 單階段 Agent`}...`
          : '使用本地模擬（未設定有效 API Key）',
      );

      try {
        if (useReal) {
          const apiKey =
            settings.provider === 'deepseek'
              ? settings.deepseekKey
              : settings.provider === 'openrouter'
                ? settings.openrouterKey
                : settings.provider === 'qwen'
                  ? settings.qwenKey
                  : settings.provider === 'sakana'
                    ? settings.sakanaKey
                    : settings.provider === 'gemini'
                      ? settings.geminiKey
                      : undefined;
          const effectiveModel = settings.modelName.trim() || undefined;

          const taskInput = `針對以下寫作單元進行專業改寫優化建議。\n文體：${genre}\n主題方向：${themeHint}\n專案：${projectTitle}\n單元標題：${chapterTitle}\n\n目前內容：\n${content}`;

          const result = await runAgentPipeline(
            taskInput,
            {
              provider: settings.provider,
              apiKey,
              model: effectiveModel,
              theme: { genre, themeHint, projectTitle },
              ...(stage === 'full'
                ? {}
                : { pipeline: { stages: [stage], initialContext: content } }),
            },
            (stageName, status, message) => {
              setAiStatus(`${stageName} ${status}${message ? `: ${message}` : ''}`);
            },
          );

          const criticalFailure = result.stages.find(
            (stageResult) =>
              stageResult.error &&
              (stageResult.name === 'architect' || stageResult.name === 'writer'),
          );
          if (!result.finalOutput || criticalFailure) {
            // Surface the actual stage error for debugging
            const failedStage = criticalFailure || result.stages.find((s) => s.error);
            const errMsg =
              failedStage?.error || result.finalOutput || 'Agent pipeline 執行失敗，無輸出';
            throw new Error(`[${failedStage?.name || 'unknown'}] ${errMsg}`);
          }

          // Prefer the Editor stage; if it degraded, use the last useful draft
          const editorStage = result.stages.find((s) => s.name === 'editor' && s.result);
          const writerStage = result.stages.find((s) => s.name === 'writer' && s.result);
          let newContent = editorStage?.result || writerStage?.result || result.finalOutput;

          // Extract the actual edited text if the stage used the 【完整修改後版本】 format
          const editMarker = '【完整修改後版本】';
          if (newContent.includes(editMarker)) {
            const after = newContent.split(editMarker)[1] || '';
            newContent = after.trim() || newContent;
          }

          // Strip possible leading explanations
          newContent = newContent.replace(/^【[^】]+】\s*/g, '').trim();

          if (!newContent || newContent.length < 20) {
            throw new Error('AI 輸出內容過短，請重試或調整模型');
          }

          const failedStage = result.stages.find((stage) => stage.error);
          setAiStatus(
            `AI 改寫完成（${settings.provider}，耗時 ${result.totalDurationMs}ms）${
              failedStage ? `，已降級略過 ${failedStage.label}` : ''
            }。`,
          );
          setTimeout(() => setAiStatus(''), 4200);
          return newContent;
        }

        // Fallback: local simulation
        const rewritten = createLocalStageOutput(content, stage);
        setAiStatus('本地模擬改寫已套用（設定 API Key 可使用真實 6 階段 Agent Pipeline）');
        setTimeout(() => setAiStatus(''), 2800);
        return rewritten;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('AI rewrite error:', err);
        setAiStatus(`錯誤：${msg}（已回退本地模擬）`);

        // Graceful fallback to local sim
        const rewritten = createLocalStageOutput(content, stage);
        setTimeout(() => setAiStatus(''), 4500);
        return rewritten;
      } finally {
        setIsAiLoading(false);
      }
    },
    [
      settings,
      settings.provider,
      settings.deepseekKey,
      settings.openrouterKey,
      settings.qwenKey,
      settings.sakanaKey,
      settings.geminiKey,
      settings.modelName,
      hasApiKeyConfigured,
    ],
  );

  return {
    isAiLoading,
    aiStatus,
    settings,
    setSettings,
    saveSettings,
    clearSettings,
    reloadSettings,
    hasApiKeyConfigured,
    runRewrite,
  };
}
