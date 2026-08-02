import React, { useRef, useCallback, useEffect } from 'react';
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
  onEditorInput: (html: string) => void;
  onTitleChange: (title: string) => void;
  onAIRewrite: () => void;
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
      editorRef.current.innerHTML = currentChapter.content.replace(/\n/g, '<br>');
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

    editorRef.current.innerHTML = currentChapter.content.replace(/\n/g, '<br>');
    lastDomContentRef.current = currentChapter.content;
  }, [currentChapter.content]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    // Track what's in the DOM so the external-sync effect doesn't fight us
    const text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<[^>]+>/g, '');
    lastDomContentRef.current = text;
    onEditorInput(html);
  }, [onEditorInput]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(e.target.value);
    },
    [onTitleChange]
  );

  return (
    <div className="col-span-12 lg:col-span-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm main-editor h-full flex flex-col">
        {/* Editor header */}
        <div className="px-5 pt-4 pb-3 border-b flex items-center gap-x-3">
          <input
            ref={titleRef}
            type="text"
            defaultValue={currentChapter.title}
            onChange={handleTitleChange}
            onBlur={handleTitleChange}
            className="flex-1 text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-slate-400"
            placeholder={`${unitLabel}標題`}
          />
          <div className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full tabular-nums">
            {currentStats.total} 字
          </div>
          <button
            onClick={onAIRewrite}
            disabled={isAiLoading}
            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition text-white rounded-xl flex items-center gap-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            title={hasApiKey ? `使用 ${providerLabel} 真實 Agent Pipeline 進行改寫` : '使用本地模擬（未設定 API Key）'}
          >
            {isAiLoading ? '⏳ AI 處理中...' : '✨ AI 改寫建議'}
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-x-1 text-xs">
          {[
            { label: '粗體', cmd: 'bold' },
            { label: '斜體', cmd: 'italic' },
            { label: '引用', cmd: 'formatBlock', val: 'blockquote' },
          ].map((t, i) => (
            <button
              key={i}
              onClick={() => {
                document.execCommand(t.cmd as any, false, (t as any).val);
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
            onInput={handleInput}
            onBlur={handleInput}
            className="rich-editor prose prose-slate max-w-none focus:outline-none"
            style={{ minHeight: '380px' }}
          />
        </div>

        <div className="px-5 py-2 border-t text-[11px] text-slate-400 flex items-center">
          <span>目前{unitLabel}：{currentChapter.chapter} · 最後儲存 {currentChapter.lastSaved}</span>
          {lastSavedMsg && <span className="ml-3 text-emerald-600 font-medium">{lastSavedMsg}</span>}
          {aiStatus && <span className="ml-3 text-indigo-600 font-medium truncate max-w-[280px]">{aiStatus}</span>}
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
