import React, { useState, useEffect } from 'react';
import type { Provider } from '../../services/agentService';
import type { ApiSettings } from '../../hooks/useAgentPipeline';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ApiSettings;
  onSave: (settings: ApiSettings) => void;
  onClear: () => void;
  onReload: () => void;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 5) + '...' + key.slice(-3);
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onClear,
  onReload,
}) => {
  // Local draft state so cancel discards changes
  const [draft, setDraft] = useState<ApiSettings>(settings);

  // Reload from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      onReload();
    }
  }, [isOpen, onReload]);

  // Sync draft when settings change (after reload)
  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <div className="font-semibold flex items-center gap-x-2 text-lg">
            ⚙ API 設定
          </div>
          <button onClick={onClose} className="text-3xl leading-none text-slate-400 hover:text-slate-600">×</button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* Provider */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">提供者（Provider）</label>
            <select
              value={draft.provider}
              onChange={(e) => setDraft({ ...draft, provider: e.target.value as Provider })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="deepseek">DeepSeek（雲端）</option>
              <option value="openrouter">OpenRouter（雲端）</option>
              <option value="ollama">本地 Ollama（需本地運行）</option>
            </select>
            <div className="text-[10px] text-slate-400 mt-1">
              {draft.provider === 'ollama' ? '呼叫 http://localhost:11434 （需先 ollama serve 並 pull 模型）' : 'OpenAI 相容 API'}
            </div>
          </div>

          {/* DeepSeek Key */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">DeepSeek API Key</label>
            <input
              type="password"
              value={draft.deepseekKey}
              onChange={(e) => setDraft({ ...draft, deepseekKey: e.target.value })}
              placeholder="sk-..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400"
            />
            {draft.deepseekKey && (
              <div className="mt-1 text-[10px] text-emerald-600">已設定：{maskKey(draft.deepseekKey)}</div>
            )}
            <div className="text-[10px] text-slate-400 mt-0.5">從 https://platform.deepseek.com/ 取得</div>
          </div>

          {/* OpenRouter Key */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">OpenRouter API Key</label>
            <input
              type="password"
              value={draft.openrouterKey}
              onChange={(e) => setDraft({ ...draft, openrouterKey: e.target.value })}
              placeholder="sk-or-..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400"
            />
            {draft.openrouterKey && (
              <div className="mt-1 text-[10px] text-emerald-600">已設定：{maskKey(draft.openrouterKey)}</div>
            )}
            <div className="text-[10px] text-slate-400 mt-0.5">從 https://openrouter.ai/ 取得（支援多模型）</div>
          </div>

          {/* Optional Model */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">模型名稱（選填，留空使用預設）</label>
            <input
              type="text"
              value={draft.modelName}
              onChange={(e) => setDraft({ ...draft, modelName: e.target.value })}
              placeholder="例如：deepseek-chat 或 deepseek/deepseek-chat"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400"
            />
            <div className="text-[10px] text-slate-400 mt-0.5">DeepSeek 預設 deepseek-chat；OpenRouter 預設 deepseek/deepseek-chat；Ollama 預設 qwen2.5:7b</div>
          </div>

          <div className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3">
            金鑰僅儲存在瀏覽器 localStorage（本機），不會上傳。切換提供者後「AI 改寫建議」會自動使用對應金鑰。未設定金鑰時自動回退本地模擬。
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 text-xs flex justify-end gap-x-3 border-t">
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="px-4 py-2 text-slate-500 hover:text-slate-700"
          >
            清除全部
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            儲存並關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
