import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { AgentStageName } from '../services/agentService';
import type { Chapter } from '../types';

interface EditorPanelProps {
  currentChapter: Chapter;
  currentStats: { total: number; chinese: number; english: number };
  unitLabel: string;
  isAiLoading: boolean;
  aiStatus: string;
  lastSavedMsg: string;
  hasApiKey: boolean;
  providerLabel: string;
  onEditorInput: (text: string) => void;
  onTitleChange: (title: string) => void;
  onAIRewrite: () => void;
  onAIStage: (stage: AgentStageName) => void;
}

type ToolbarAction = { label: string; command: 'bold' | 'italic' | 'formatBlock'; value?: string };

function escapeEditorHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPlainText(value: string): string {
  return value.split(/\r?\n/).map(escapeEditorHtml).join('<br>');
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  currentChapter,
  currentStats,
  unitLabel,
  isAiLoading,
  aiStatus,
  lastSavedMsg,
  hasApiKey,
  providerLabel,
  onEditorInput,
  onTitleChange,
  onAIRewrite,
  onAIStage,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const lastSyncedIdRef = useRef<string | null>(null);
  // Track the content we last wrote to the DOM to avoid re-syncing our own edits
  const lastDomContentRef = useRef<string>('');

  // Sync editor DOM when switching chapters (id change)
  useEffect(() => {
    if (lastSyncedIdRef.current === currentChapter.id) return;
    lastSyncedIdRef.current = currentChapter.id;

    if (editorRef.current) {
      editorRef.current.innerHTML = renderPlainText(currentChapter.content);
      lastDomContentRef.current = currentChapter.content;
    }
    if (titleRef.current) {
      titleRef.current.value = currentChapter.title;
    }
  }, [currentChapter.id, currentChapter.title, currentChapter.content]);

  // Sync editor DOM when content changes externally (e.g., AI rewrite)
  // Only fires if the content differs from what we last put in the DOM
  useEffect(() => {
    if (currentChapter.content === lastDomContentRef.current) return;
    if (!editorRef.current) return;
    // Don't override if user is actively typing in the editor
    if (document.activeElement === editorRef.current) return;

    editorRef.current.innerHTML = renderPlainText(currentChapter.content);
    lastDomContentRef.current = currentChapter.content;
  }, [currentChapter.content]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    // Store visible text only; never persist arbitrary HTML from pasted content.
    const text = editorRef.current.innerText.replace(/\r\n/g, '\n');
    lastDomContentRef.current = text;
    onEditorInput(text);
  }, [onEditorInput]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(e.target.value);
    },
    [onTitleChange],
  );

  return (
    <div className="col-span-12 lg:col-span-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm main-editor h-full flex flex-col">
        {/* Editor header */}
        <div className="px-5 pt-4 pb-3 border-b flex items-center gap-x-3">
          <input
            ref={titleRef}
            id="chapter-title"
            name="chapter-title"
            type="text"
            defaultValue={currentChapter.title}
            onChange={handleTitleChange}
            onBlur={handleTitleChange}
            className="flex-1 text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-slate-400"
            placeholder={`${unitLabel}標題`}
            aria-label={`${unitLabel}標題`}
          />
          <div className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full tabular-nums">
            {currentStats.total} 字
          </div>
          <div className="flex items-center gap-x-1.5">
            <button
              type="button"
              onClick={onAIRewrite}
              disabled={isAiLoading}
              className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition text-white rounded-xl flex items-center gap-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              title={
                hasApiKey
                  ? `使用 ${providerLabel} 真實 Agent Pipeline 進行改寫`
                  : '使用本地模擬（未設定 API Key）'
              }
            >
              {isAiLoading ? '⏳ AI 處理中...' : '✨ 完整 AI'}
            </button>
            <button
              type="button"
              onClick={() => onAIStage('editor')}
              disabled={isAiLoading}
              className="text-xs px-2 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
              title="只執行 Editor 單階段並套用潤稿結果"
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => onAIStage('visualizer')}
              disabled={isAiLoading}
              className="text-xs px-2 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
              title="只執行 Visualizer 單階段並檢視結果"
            >
              Visualizer
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-x-1 text-xs">
          {(
            [
              { label: '粗體', command: 'bold' },
              { label: '斜體', command: 'italic' },
              { label: '引用', command: 'formatBlock', value: 'blockquote' },
            ] satisfies ToolbarAction[]
          ).map((t) => (
            <button
              type="button"
              key={t.command}
              onClick={() => {
                document.execCommand(t.command, false, t.value);
                handleInput();
              }}
              className="px-2.5 py-1 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-600"
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto text-[10px] text-slate-400">即時自動儲存 · 支援中英混排字數</div>
        </div>

        {/* The actual editor */}
        <div className="flex-1 p-5 overflow-auto">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={handleInput}
            className="rich-editor prose prose-slate max-w-none focus:outline-none"
            style={{ minHeight: '380px' }}
          />
        </div>

        <div className="px-5 py-2 border-t text-[11px] text-slate-400 flex items-center">
          <span>
            目前{unitLabel}：{currentChapter.chapter} · 最後儲存 {currentChapter.lastSaved}
          </span>
          {lastSavedMsg && (
            <span className="ml-3 text-emerald-600 font-medium">{lastSavedMsg}</span>
          )}
          {aiStatus && (
            <span className="ml-3 text-indigo-600 font-medium truncate max-w-[280px]">
              {aiStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
