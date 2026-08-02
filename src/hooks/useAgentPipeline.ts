import { useState, useCallback } from 'react';
import { runAgentPipeline, type Provider } from '../services/agentService';

export interface ApiSettings {
  provider: Provider;
  deepseekKey: string;
  openrouterKey: string;
  qwenKey: string;
  sakanaKey: string;
  geminiKey: string;
  modelName: string;
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
        provider: s.provider || defaults.provider,
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
    localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(newSettings));
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
      chapterTitle: string
    ): Promise<string | null> => {
      const useReal = hasApiKeyConfigured();
      setIsAiLoading(true);
      setAiStatus(
        useReal
          ? `使用 ${settings.provider} 呼叫 Agent Pipeline...`
          : '使用本地模擬（未設定有效 API Key）'
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
            },
            (stageName, status, message) => {
              setAiStatus(`${stageName} ${status}${message ? ': ' + message : ''}`);
            }
          );

          if (!result.success || !result.finalOutput) {
            throw new Error(result.finalOutput || 'Agent pipeline 執行失敗，無輸出');
          }

          // Prefer the Editor stage polished version for rewrite use-case
          const editorStage = result.stages.find((s) => s.name === 'editor' && s.result);
          let newContent = editorStage?.result || result.finalOutput;

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

          setAiStatus(
            `AI 改寫完成（${settings.provider}，耗時 ${result.totalDurationMs}ms）。已套用 Editor 階段結果。`
          );
          setTimeout(() => setAiStatus(''), 4200);
          return newContent;
        } else {
          // Fallback: local simulation
          const rewritten =
            content.trim() +
            '\n\n（AI 建議改寫：可在此處補充一個具體案例或數據，讓論點更具說服力。）';
          setAiStatus('本地模擬改寫已套用（設定 API Key 可使用真實 6 階段 Agent Pipeline）');
          setTimeout(() => setAiStatus(''), 2800);
          return rewritten;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('AI rewrite error:', err);
        setAiStatus(`錯誤：${msg}（已回退本地模擬）`);

        // Graceful fallback to local sim
        const rewritten =
          content.trim() +
          '\n\n（AI 建議改寫：可在此處補充一個具體案例或數據，讓論點更具說服力。）';
        setTimeout(() => setAiStatus(''), 4500);
        return rewritten;
      } finally {
        setIsAiLoading(false);
      }
    },
    [settings, hasApiKeyConfigured]
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
