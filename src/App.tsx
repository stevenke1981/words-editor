import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import KnowledgeGraph from './components/KnowledgeGraph';
import type { Book, Chapter, GoldenQuote, KnowledgeNode } from './types';
import { runAgentPipeline, type Provider } from './services/agentService';
import { exportToWord, exportToPdf } from './services/exportService';
import {
  createBookFromTemplate,
  getTemplate,
  listTemplates,
  DEFAULT_TEMPLATE_ID,
  type TemplateId,
} from './data/templates';

/**
 * words-editor — multi-genre article / book writing UI
 *
 * Left: knowledge graph + quotes + structure
 * Center: rich text editor
 * Right: status + metrics + references
 * Templates: general article, finance, tech, blog, news, copy, essay, academic, howto, travel
 */

const BOOK_STORAGE_KEY = 'wordsEditorProject';

function loadInitialBook(): Book {
  try {
    const raw = localStorage.getItem(BOOK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Book;
      if (parsed?.title && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return createBookFromTemplate(DEFAULT_TEMPLATE_ID);
}

function App() {
  const [book, setBook] = useState<Book>(() => loadInitialBook());
  const [currentChapterId, setCurrentChapterId] = useState<string>(() => loadInitialBook().chapters[0]?.id || '01');
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [lastSavedMsg, setLastSavedMsg] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('');

  const activeTemplate = useMemo(() => getTemplate(book.templateId), [book.templateId]);
  const allTemplates = useMemo(() => listTemplates(), []);

  // API settings (persisted to localStorage)
  const [provider, setProvider] = useState<Provider>('deepseek');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [modelName, setModelName] = useState('');

  // Editor refs
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const currentChapter =
    book.chapters.find((c) => c.id === currentChapterId) || book.chapters[0];

  // Compute live word stats (Chinese chars + English words)
  const computeStats = useCallback((text: string) => {
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length;
    return { total: chinese + englishWords, chinese, english: englishWords };
  }, []);

  const currentStats = computeStats(currentChapter.content);

  // Load chapter into editor when switching (id change triggers the sync effect)
  const loadChapter = useCallback((chapter: Chapter) => {
    setCurrentChapterId(chapter.id);
    setSelectedConcept(null);
  }, []);

  // Update chapter immutably (core data update)
  const updateChapter = useCallback((chapterId: string, updates: Partial<Chapter>) => {
    setBook(prev => {
      const newChapters = prev.chapters.map(ch =>
        ch.id === chapterId
          ? {
              ...ch,
              ...updates,
              lastSaved: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : ch
      );
      return { ...prev, chapters: newChapters };
    });
  }, []);

  // Handle editor input → live update chapter + stats
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    // Convert back to plain-ish text for storage (keep simple newlines)
    const text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<[^>]+>/g, ''); // strip other tags for word count

    const stats = computeStats(text);

    updateChapter(currentChapterId, {
      content: text,
      wordCount: stats.total,
      // Demo: bump rewrite ratio slightly on edits
      rewrite: Math.min(100, Math.max(currentChapter.rewrite, Math.floor(stats.total * 0.03))),
      retention: Math.max(70, currentChapter.retention - 1),
    });

    // Auto-save toast
    setLastSavedMsg('已自動儲存');
    setTimeout(() => setLastSavedMsg(''), 1400);
  }, [currentChapterId, currentChapter.rewrite, currentChapter.retention, updateChapter, computeStats]);

  // Title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    updateChapter(currentChapterId, { title: newTitle });
  }, [currentChapterId, updateChapter]);

  // Switch chapter
  const switchChapter = (id: string) => {
    const ch = book.chapters.find(c => c.id === id);
    if (ch) loadChapter(ch);
  };

  // Status change (from right panel)
  const handleStatusChange = (newStatus: Chapter['status']) => {
    updateChapter(currentChapterId, { status: newStatus });
  };

  // Add golden quote (from current editor selection or prompt)
  const addGoldenQuote = () => {
    const text = prompt('輸入新的金句（會關聯到目前章節）：', '');
    if (!text || !text.trim()) return;

    const newQuote: GoldenQuote = {
      id: 'q' + Date.now().toString(36),
      text: text.trim(),
      chapterId: currentChapterId,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setBook(prev => ({
      ...prev,
      goldenQuotes: [...prev.goldenQuotes, newQuote],
    }));
  };

  // Remove quote
  const removeQuote = (id: string) => {
    setBook(prev => ({
      ...prev,
      goldenQuotes: prev.goldenQuotes.filter(q => q.id !== id),
    }));
  };

  // Knowledge graph node click handler
  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedConcept(node.label);

    // Demo: highlight chapters that "contain" the concept in title/content (simple contains)
    // In real would use proper backlinks stored in data model.
    const related = book.chapters.filter(ch =>
      ch.title.includes(node.label) || ch.content.includes(node.label.substring(0, 3))
    );

    if (related.length > 0 && related[0].id !== currentChapterId) {
      // Auto-switch to first related for demo interactivity
      setTimeout(() => switchChapter(related[0].id), 180);
    }

    // Clear after 3s
    setTimeout(() => setSelectedConcept(null), 3200);
  };

  // Update graph nodes when user drags in the component (persist positions)
  const handleGraphNodesChange = (newNodes: KnowledgeNode[]) => {
    setBook(prev => ({
      ...prev,
      knowledgeGraph: {
        ...prev.knowledgeGraph,
        nodes: newNodes,
      },
    }));
  };

  // Add a new concept node (demo)
  const addConceptNode = () => {
    const label = prompt('新增知識概念名稱：', '新概念');
    if (!label || !label.trim()) return;

    const newNode: KnowledgeNode = {
      id: 'k' + Date.now().toString(36),
      label: label.trim(),
      type: 'concept',
      x: 90 + Math.random() * 80,
      y: 55 + Math.random() * 50,
      color: '#64748b',
    };

    setBook(prev => ({
      ...prev,
      knowledgeGraph: {
        nodes: [...prev.knowledgeGraph.nodes, newNode],
        edges: prev.knowledgeGraph.edges,
      },
    }));
  };

  // Export full book JSON (like prototype)
  const exportJSON = () => {
    const exportData = {
      ...book,
      exportDate: new Date().toISOString(),
      currentChapterId,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title}_知識庫_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLastSavedMsg('已匯出 JSON');
    setTimeout(() => setLastSavedMsg(''), 1600);
  };

  // Export current chapter as Word (.docx)
  const handleExportWord = async () => {
    const ch = currentChapter;
    if (!ch.content || !ch.content.trim()) {
      setLastSavedMsg('請先輸入章節內容');
      setTimeout(() => setLastSavedMsg(''), 1500);
      return;
    }
    try {
      const blob = await exportToWord(ch.title, ch.content, book.title);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ch.title.replace(/[\\/:*?"<>|]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastSavedMsg('已匯出 Word');
      setTimeout(() => setLastSavedMsg(''), 1600);
    } catch (err) {
      console.error('Word export error:', err);
      setLastSavedMsg('匯出 Word 失敗');
      setTimeout(() => setLastSavedMsg(''), 1500);
    }
  };

  // Export current chapter as PDF
  const handleExportPDF = () => {
    const ch = currentChapter;
    if (!ch.content || !ch.content.trim()) {
      setLastSavedMsg('請先輸入章節內容');
      setTimeout(() => setLastSavedMsg(''), 1500);
      return;
    }
    try {
      const blob = exportToPdf(ch.title, ch.content, book.title);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ch.title.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastSavedMsg('已匯出 PDF');
      setTimeout(() => setLastSavedMsg(''), 1600);
    } catch (err) {
      console.error('PDF export error:', err);
      setLastSavedMsg('匯出 PDF 失敗');
      setTimeout(() => setLastSavedMsg(''), 1500);
    }
  };

  // Mask key for display (e.g. "sk-...abc")
  const maskKey = (key: string): string => {
    if (!key || key.length < 8) return '***';
    return key.slice(0, 5) + '...' + key.slice(-3);
  };

  // Check if real API is configured for current provider
  const hasApiKeyConfigured = (): boolean => {
    if (provider === 'deepseek') return !!deepseekKey && deepseekKey.trim().length > 8;
    if (provider === 'openrouter') return !!openrouterKey && openrouterKey.trim().length > 8;
    if (provider === 'ollama') return true; // local, no key required (will try localhost)
    return false;
  };

  // Real AI rewrite using agent pipeline (or fallback to local sim)
  const handleAIRewrite = async () => {
    const ch = currentChapter;
    if (!ch.content || !ch.content.trim()) {
      setLastSavedMsg('請先輸入章節內容');
      setTimeout(() => setLastSavedMsg(''), 1500);
      return;
    }

    const useReal = hasApiKeyConfigured();

    setIsAiLoading(true);
    setAiStatus(useReal ? `使用 ${provider} 呼叫 Agent Pipeline...` : '使用本地模擬（未設定有效 API Key）');

    try {
      if (useReal) {
        const apiKey = provider === 'deepseek' ? deepseekKey : provider === 'openrouter' ? openrouterKey : undefined;
        const effectiveModel = modelName.trim() || undefined;

        const genre = book.genre || activeTemplate.genre;
        const themeHint = activeTemplate.themeHint;
        const taskInput = `針對以下寫作單元進行專業改寫優化建議。\n文體：${genre}\n主題方向：${themeHint}\n專案：${book.title}\n單元標題：${ch.title}\n\n目前內容：\n${ch.content}`;

        const result = await runAgentPipeline(
          taskInput,
          {
            provider,
            apiKey,
            model: effectiveModel,
            theme: { genre, themeHint, projectTitle: book.title },
          },
          (stageName, status, message) => {
            setAiStatus(`${stageName} ${status}${message ? ': ' + message : ''}`);
          }
        );

        if (!result.success || !result.finalOutput) {
          throw new Error(result.finalOutput || 'Agent pipeline 執行失敗，無輸出');
        }

        // Prefer the Editor stage polished version for rewrite use-case
        const editorStage = result.stages.find(s => s.name === 'editor' && s.result);
        let newContent = editorStage?.result || result.finalOutput;

        // Extract the actual edited text if the stage used the 【完整修改後版本】 format
        const editMarker = '【完整修改後版本】';
        if (newContent.includes(editMarker)) {
          const after = newContent.split(editMarker)[1] || '';
          newContent = after.trim() || newContent;
        }

        // Also strip possible leading explanations
        newContent = newContent.replace(/^【[^】]+】\s*/g, '').trim();

        if (!newContent || newContent.length < 20) {
          throw new Error('AI 輸出內容過短，請重試或調整模型');
        }

        const stats = computeStats(newContent);

        updateChapter(currentChapterId, {
          content: newContent,
          wordCount: stats.total,
          rewrite: Math.min(100, ch.rewrite + 22),
          retention: Math.max(55, ch.retention - 6),
        });

        // Reload editor DOM
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = newContent.replace(/\n/g, '<br>');
          }
        }, 10);

        setAiStatus(`AI 改寫完成（${provider}，耗時 ${result.totalDurationMs}ms）。已套用 Editor 階段結果。`);
        setTimeout(() => setAiStatus(''), 4200);
      } else {
        // Fallback: original local simulation (immutable update)
        const rewritten = ch.content.trim() + '\n\n（AI 建議改寫：可在此處補充一個具體案例或數據，讓論點更具說服力。）';
        const stats = computeStats(rewritten);

        updateChapter(currentChapterId, {
          content: rewritten,
          wordCount: stats.total,
          rewrite: Math.min(100, ch.rewrite + 18),
          retention: Math.max(65, ch.retention - 8),
        });

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = rewritten.replace(/\n/g, '<br>');
          }
        }, 10);

        setAiStatus('本地模擬改寫已套用（設定 API Key 可使用真實 6 階段 Agent Pipeline）');
        setTimeout(() => setAiStatus(''), 2800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('AI rewrite error:', err);
      setAiStatus(`錯誤：${msg}（已回退本地模擬）`);

      // On error, still provide the local sim as graceful fallback
      const rewritten = ch.content.trim() + '\n\n（AI 建議改寫：可在此處補充一個具體案例或數據，讓論點更具說服力。）';
      const stats = computeStats(rewritten);
      updateChapter(currentChapterId, {
        content: rewritten,
        wordCount: stats.total,
        rewrite: Math.min(100, ch.rewrite + 10),
        retention: Math.max(65, ch.retention - 5),
      });
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = rewritten.replace(/\n/g, '<br>');
        }
      }, 10);

      setTimeout(() => setAiStatus(''), 4500);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Sync editor DOM ONLY when switching chapters (id changes). 
  // Do NOT depend on .content to avoid fighting live typing in contentEditable.
  const lastSyncedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSyncedIdRef.current === currentChapterId) return;
    lastSyncedIdRef.current = currentChapterId;

    if (editorRef.current) {
      editorRef.current.innerHTML = currentChapter.content.replace(/\n/g, '<br>');
    }
    if (titleRef.current) {
      titleRef.current.value = currentChapter.title;
    }
  }, [currentChapterId, currentChapter.title, currentChapter.content]); // content in deps is ok here because of the guard

  // Initial mount handled by above when id first sets

  // Keyboard save hint
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setLastSavedMsg('已手動儲存');
        setTimeout(() => setLastSavedMsg(''), 900);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Load API settings from localStorage (used on mount + when opening settings modal)
  const loadApiSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('wordsEditorApiSettings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.provider) setProvider(s.provider as Provider);
        if (typeof s.deepseekKey === 'string') setDeepseekKey(s.deepseekKey);
        if (typeof s.openrouterKey === 'string') setOpenrouterKey(s.openrouterKey);
        if (typeof s.modelName === 'string') setModelName(s.modelName);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Load on initial mount
  useEffect(() => {
    loadApiSettings();
  }, [loadApiSettings]);

  // Persist project (not API keys) when book changes
  useEffect(() => {
    try {
      localStorage.setItem(BOOK_STORAGE_KEY, JSON.stringify(book));
    } catch {
      // quota / private mode
    }
  }, [book]);

  // Reload from storage when opening modal (ensures cancel discards unsaved draft edits in modal)
  useEffect(() => {
    if (isSettingsOpen) {
      loadApiSettings();
    }
  }, [isSettingsOpen, loadApiSettings]);

  /** Apply a writing template (replaces current project after confirm) */
  const applyTemplate = useCallback((templateId: TemplateId | string) => {
    const next = createBookFromTemplate(templateId);
    setBook(next);
    setCurrentChapterId(next.chapters[0]?.id || '01');
    lastSyncedIdRef.current = null; // force editor resync
    setIsTemplateOpen(false);
    setLastSavedMsg(`已套用模板：${getTemplate(templateId).name}`);
    setTimeout(() => setLastSavedMsg(''), 2000);
  }, []);

  const renameProject = () => {
    const next = prompt('專案／文章標題：', book.title);
    if (!next || !next.trim()) return;
    setBook((prev) => ({ ...prev, title: next.trim() }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans-tc">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1480px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg tracking-tighter">W</div>
            <div>
              <button
                type="button"
                onClick={renameProject}
                className="font-semibold text-xl tracking-tight hover:text-blue-700 text-left"
                title="點擊重新命名專案"
              >
                {book.title}
              </button>
              <div className="text-[10px] text-slate-500 -mt-0.5 flex items-center gap-x-1.5 flex-wrap">
                <span>多 Agent 文章寫作工具 · 離線優先</span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-x-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {activeTemplate.icon} {book.genre || activeTemplate.genre}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-x-2 text-sm">
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> 本地已同步
            </div>
            <button
              onClick={() => setIsTemplateOpen(true)}
              className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center gap-x-1.5 transition-colors"
              title="選擇文章／書籍寫作模板"
            >
              📋 模板
            </button>
            <button
              onClick={exportJSON}
              className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
            >
              匯出 JSON
            </button>
            <button
              onClick={handleExportWord}
              className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
            >
              匯出 Word
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
            >
              匯出 PDF
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
              title="設定 API 金鑰與提供者（DeepSeek / OpenRouter / 本地 Ollama）"
            >
              ⚙ 設定
            </button>
            <button
              onClick={() => setIsGraphModalOpen(true)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-xl flex items-center gap-x-1.5 hover:bg-blue-700 transition-colors"
            >
              展開知識圖
            </button>
            <div className="text-[10px] text-slate-400 ml-2">Ctrl/Cmd+S 儲存</div>
          </div>
        </div>
      </div>

      {/* 3-Column Main Layout (matches spec.md 20% / 55% / 25%) */}
      <div className="max-w-[1480px] mx-auto px-5 pt-5 pb-10">
        <div className="grid grid-cols-12 gap-5">
          {/* LEFT SIDEBAR: Knowledge Graph + Quotes + Structure */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
              {/* 知識關聯圖 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <span className="text-blue-600">📊</span>
                  <span className="section-header">知識關聯圖</span>
                </div>
                <div className="flex items-center gap-x-1">
                  <button
                    onClick={addConceptNode}
                    className="text-[10px] px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded-md"
                    title="新增概念節點"
                  >
                    + 新增
                  </button>
                  <button
                    onClick={() => setIsGraphModalOpen(true)}
                    className="text-xs px-2 py-0.5 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center gap-x-1 transition-colors"
                  >
                    展開 <span className="text-[10px]">↗</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50/60">
                <KnowledgeGraph
                  nodes={book.knowledgeGraph.nodes}
                  edges={book.knowledgeGraph.edges}
                  onNodeClick={handleNodeClick}
                  onNodesChange={handleGraphNodesChange}
                  width={232}
                  height={128}
                />
              </div>

              <div className="px-3 pb-2.5 text-[10px] text-slate-500 flex items-center gap-x-1 border-t border-slate-100 bg-white">
                <span>已關聯 {book.knowledgeGraph.nodes.length} 個核心概念</span>
                {selectedConcept && (
                  <span className="ml-auto text-blue-600 font-medium">「{selectedConcept}」已高亮</span>
                )}
              </div>
            </div>

            {/* 金句總結 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <span>💬</span>
                  <span className="section-header">金句總結</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">{book.goldenQuotes.length}</span>
                </div>
                <button
                  onClick={addGoldenQuote}
                  className="text-xs flex items-center gap-x-1 px-2 py-0.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  + 新增
                </button>
              </div>

              <div className="p-3 max-h-[138px] overflow-auto text-sm space-y-2">
                {book.goldenQuotes.length === 0 && (
                  <div className="text-xs text-slate-400 py-2">尚無金句。從編輯器選取文字後可提取。</div>
                )}
                {book.goldenQuotes.map(q => (
                  <div key={q.id} className="group bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-xs leading-snug relative">
                    <div className="pr-5">「{q.text}」</div>
                    <div className="mt-1 text-amber-600/70 text-[10px]">— {q.chapterId ? `第${q.chapterId}章` : '全書'} · {q.createdAt}</div>
                    <button
                      onClick={() => removeQuote(q.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-amber-400 hover:text-red-500 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 專案架構 (chapter nav) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="section-header flex items-center gap-x-2">
                    📑 {activeTemplate.structureLabel}
                  </span>
                  <span className="text-xs text-slate-500">{book.chapters.length} {activeTemplate.unitLabel}</span>
                </div>
              </div>

              <div className="p-1.5 text-sm divide-y divide-slate-100">
                {book.chapters.map(ch => (
                  <div
                    key={ch.id}
                    onClick={() => switchChapter(ch.id)}
                    className={`chapter-item px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-x-2 ${ch.id === currentChapterId ? 'active' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{ch.chapter} {ch.title}</div>
                      <div className="text-[10px] text-slate-500">{ch.section} · {ch.wordCount} 字</div>
                    </div>
                    <span className={`status-badge status-${ch.status} whitespace-nowrap`}>{ch.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: Editor */}
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
                  placeholder={`${activeTemplate.unitLabel}標題`}
                />
                <div className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full tabular-nums">
                  {currentStats.total} 字
                </div>
                <button
                  onClick={handleAIRewrite}
                  disabled={isAiLoading}
                  className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition text-white rounded-xl flex items-center gap-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  title={hasApiKeyConfigured() ? `使用 ${provider} 真實 Agent Pipeline 進行改寫` : '使用本地模擬（未設定 API Key）'}
                >
                  {isAiLoading ? '⏳ AI 處理中...' : '✨ AI 改寫建議'}
                </button>
              </div>

              {/* Toolbar (minimal, uses execCommand for demo) */}
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
                      handleEditorInput();
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
                  onInput={handleEditorInput}
                  onBlur={handleEditorInput}
                  className="rich-editor prose prose-slate max-w-none focus:outline-none"
                  style={{ minHeight: '380px' }}
                />
              </div>

               <div className="px-5 py-2 border-t text-[11px] text-slate-400 flex items-center">
                 <span>目前{activeTemplate.unitLabel}：{currentChapter.chapter} · 最後儲存 {currentChapter.lastSaved}</span>
                 {lastSavedMsg && <span className="ml-3 text-emerald-600 font-medium">{lastSavedMsg}</span>}
                 {aiStatus && <span className="ml-3 text-indigo-600 font-medium truncate max-w-[280px]">{aiStatus}</span>}
               </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Status + Metrics + References */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm status-panel overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50">
                <span className="section-header">文章狀態</span>
              </div>

              <div className="p-4 space-y-4 text-sm">
                {/* Status */}
                <div>
                  <div className="text-xs text-slate-500 mb-1">寫作狀態</div>
                  <div className="flex gap-1.5">
                    {(['待寫', '草稿', '完成'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={`flex-1 py-1 rounded-xl text-xs font-medium border transition-all ${currentChapter.status === s ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-slate-50 border-slate-200'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metrics */}
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">寫作指標</div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>原文保留率</span>
                        <span className="tabular-nums font-medium">{currentChapter.retention}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${currentChapter.retention}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>改寫幅度</span>
                        <span className="tabular-nums font-medium">{currentChapter.rewrite}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${currentChapter.rewrite}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="bg-slate-50 rounded-xl py-2">
                    <div className="text-emerald-600 font-semibold tabular-nums">+{currentChapter.added}</div>
                    <div className="text-[10px] text-slate-500">新增</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <div className="text-rose-600 font-semibold tabular-nums">-{currentChapter.deleted}</div>
                    <div className="text-[10px] text-slate-500">刪除</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl py-2">
                    <div className="font-semibold tabular-nums">{currentChapter.wordCount}</div>
                    <div className="text-[10px] text-slate-500">總字數</div>
                  </div>
                </div>

                {/* References */}
                <div>
                  <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                    <span>參考資料</span>
                    <button
                      onClick={() => {
                        const title = prompt('新增參考文章標題：');
                        if (!title) return;
                        const date = new Date().toISOString().slice(0, 10);
                        const refs = [...(currentChapter.references || []), { date, title }];
                        updateChapter(currentChapterId, { references: refs });
                      }}
                      className="text-blue-600 text-[10px]"
                    >
                      + 新增
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {(currentChapter.references || []).length === 0 && (
                      <div className="text-slate-400 text-[10px]">無參考資料</div>
                    )}
                    {(currentChapter.references || []).map((ref, idx) => (
                      <div key={idx} className="flex items-center gap-x-2 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                        <span className="font-mono text-[10px] text-slate-400">{ref.date}</span>
                        <span className="truncate">{ref.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inspiration notes */}
                <div>
                  <div className="text-xs text-slate-500 mb-1">靈感筆記</div>
                  <textarea
                    value={currentChapter.inspirationNotes || ''}
                    onChange={(e) => updateChapter(currentChapterId, { inspirationNotes: e.target.value })}
                    placeholder="此章節的靈感來源或待補充想法..."
                    className="w-full text-xs border border-slate-200 rounded-xl p-2 h-16 resize-y focus:border-blue-300"
                  />
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="text-[10px] text-center text-slate-400">
              點擊知識圖節點可高亮並跳轉相關章節<br />
              拖曳節點可自訂布局（位置會儲存）
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Knowledge Graph Modal */}
      {isGraphModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          onClick={() => setIsGraphModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <div className="font-semibold flex items-center gap-x-2 text-lg">
                📊 知識關聯圖（完整互動版）
              </div>
              <button onClick={() => setIsGraphModalOpen(false)} className="text-3xl leading-none text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="p-6">
              <div className="text-center text-xs text-slate-500 mb-3">
                拖曳節點移動位置 · 滾輪縮放 · 拖曳背景平移 · 點擊節點高亮關聯
              </div>
              <div className="flex justify-center bg-slate-50 rounded-2xl p-4">
                <KnowledgeGraph
                  nodes={book.knowledgeGraph.nodes}
                  edges={book.knowledgeGraph.edges}
                  onNodeClick={handleNodeClick}
                  onNodesChange={handleGraphNodesChange}
                  width={620}
                  height={380}
                />
              </div>
              <div className="mt-3 text-xs text-slate-500 text-center">
                共 {book.knowledgeGraph.nodes.length} 節點 · {book.knowledgeGraph.edges.length} 條關聯 · 位置變更即時同步至側邊欄
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 text-xs flex justify-end gap-x-3 border-t">
              <button onClick={() => setIsGraphModalOpen(false)} className="px-5 py-2 text-slate-600">關閉</button>
              <button
                onClick={() => {
                  // Reset graph to current template defaults
                  const tplGraph = createBookFromTemplate(book.templateId || DEFAULT_TEMPLATE_ID).knowledgeGraph;
                  setBook(prev => ({ ...prev, knowledgeGraph: tplGraph }));
                  setIsGraphModalOpen(false);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl"
              >
                重置布局
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template picker modal */}
      {isTemplateOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6"
          onClick={() => setIsTemplateOpen(false)}
        >
          <div
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <div className="font-semibold text-lg flex items-center gap-x-2">📋 選擇寫作模板</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  不限財經：通用文章、技術、部落格、報導、文案、隨筆、學術、指南、旅行等。套用會替換目前專案內容。
                </div>
              </div>
              <button onClick={() => setIsTemplateOpen(false)} className="text-3xl leading-none text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="p-5 overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allTemplates.map((t) => {
                const active = (book.templateId || DEFAULT_TEMPLATE_ID) === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setIsTemplateOpen(false);
                        return;
                      }
                      const ok = window.confirm(
                        `套用「${t.name}」會取代目前專案的章節與知識圖。\n（可先匯出 JSON 備份）\n\n確定套用？`
                      );
                      if (ok) applyTemplate(t.id);
                    }}
                    className={`text-left rounded-2xl border p-4 transition-all hover:shadow-md ${
                      active
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-slate-200 hover:border-violet-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-x-3">
                      <span className="text-2xl leading-none">{t.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-x-2 flex-wrap">
                          <span className="font-semibold text-sm">{t.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.tag}</span>
                          {active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-600 text-white">目前</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{t.genre}</div>
                        <div className="text-xs text-slate-600 mt-1.5 leading-snug">{t.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 px-6 py-3 text-xs flex justify-between items-center border-t shrink-0">
              <span className="text-slate-500">目前：{activeTemplate.icon} {activeTemplate.name}</span>
              <button onClick={() => setIsTemplateOpen(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-xl">
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal for API Keys */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <div className="font-semibold flex items-center gap-x-2 text-lg">
                ⚙ API 設定
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-3xl leading-none text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              {/* Provider */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">提供者（Provider）</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const p = e.target.value as Provider;
                    setProvider(p);
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="deepseek">DeepSeek（雲端）</option>
                  <option value="openrouter">OpenRouter（雲端）</option>
                  <option value="ollama">本地 Ollama（需本地運行）</option>
                </select>
                <div className="text-[10px] text-slate-400 mt-1">
                  {provider === 'ollama' ? '呼叫 http://localhost:11434 （需先 ollama serve 並 pull 模型）' : 'OpenAI 相容 API'}
                </div>
              </div>

              {/* DeepSeek Key */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">DeepSeek API Key</label>
                <input
                  type="password"
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400"
                />
                {deepseekKey && (
                  <div className="mt-1 text-[10px] text-emerald-600">已設定：{maskKey(deepseekKey)}</div>
                )}
                <div className="text-[10px] text-slate-400 mt-0.5">從 https://platform.deepseek.com/ 取得</div>
              </div>

              {/* OpenRouter Key */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">OpenRouter API Key</label>
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400"
                />
                {openrouterKey && (
                  <div className="mt-1 text-[10px] text-emerald-600">已設定：{maskKey(openrouterKey)}</div>
                )}
                <div className="text-[10px] text-slate-400 mt-0.5">從 https://openrouter.ai/ 取得（支援多模型）</div>
              </div>

              {/* Optional Model */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">模型名稱（選填，留空使用預設）</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
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
                  // Clear all keys
                  setDeepseekKey('');
                  setOpenrouterKey('');
                  setModelName('');
                  setProvider('deepseek');
                  localStorage.removeItem('wordsEditorApiSettings');
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-2 text-slate-500 hover:text-slate-700"
              >
                清除全部
              </button>
              <button
                onClick={() => {
                  const toSave = { provider, deepseekKey, openrouterKey, modelName };
                  localStorage.setItem('wordsEditorApiSettings', JSON.stringify(toSave));
                  setIsSettingsOpen(false);
                  setLastSavedMsg('API 設定已儲存');
                  setTimeout(() => setLastSavedMsg(''), 1400);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                儲存並關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 pb-6">
        多文體寫作模板 · 3 欄布局 · 原生 SVG 知識圖 · 6 階段 Agent 管線 · 本地優先
      </div>
    </div>
  );
}

export default App;
