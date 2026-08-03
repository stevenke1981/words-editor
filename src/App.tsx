import { useCallback, useEffect, useMemo, useState } from 'react';
import EditorPanel from './components/EditorPanel';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import TopBar from './components/TopBar';
import AgentResultModal from './components/modals/AgentResultModal';
import GraphModal from './components/modals/GraphModal';
import SettingsModal from './components/modals/SettingsModal';
import TemplatePickerModal from './components/modals/TemplatePickerModal';
import { DEFAULT_TEMPLATE_ID, createBookFromTemplate, getTemplate } from './data/templates';
import { useAgentPipeline } from './hooks/useAgentPipeline';
import { useBook } from './hooks/useBook';
import type { AgentStageName } from './services/agentService';
import { calculateEditMetrics } from './services/editMetrics';
import {
  exportFullBookToPdfBrowser,
  exportFullBookToWord,
  exportToMarkdown,
  exportToPdfBrowser,
  exportToWord,
} from './services/exportService';
import type { Chapter, KnowledgeNode } from './types';

/**
 * words-editor — multi-genre article / book writing UI
 *
 * Left: knowledge graph + quotes + structure
 * Center: rich text editor
 * Right: status + metrics + references
 */

function App() {
  const {
    book,
    setBook,
    storageStatus,
    flushSave,
    currentChapter,
    currentChapterId,
    switchChapter,
    updateChapter,
    addQuote,
    removeQuote,
    updateGraphNodes,
    addGraphNode,
    applyTemplate,
    renameProject,
    importBook,
  } = useBook();

  const {
    isAiLoading,
    aiStatus,
    settings,
    saveSettings,
    clearSettings,
    reloadSettings,
    hasApiKeyConfigured,
    runRewrite,
  } = useAgentPipeline();

  // UI-only state
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastSavedMsg, setLastSavedMsg] = useState('');
  const [agentResult, setAgentResult] = useState<{
    stage: AgentStageName;
    content: string;
  } | null>(null);

  const activeTemplate = useMemo(() => getTemplate(book.templateId), [book.templateId]);

  // Compute live word stats (Chinese chars + English words)
  const computeStats = useCallback((text: string) => {
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length;
    return { total: chinese + englishWords, chinese, english: englishWords };
  }, []);

  const currentStats = computeStats(currentChapter.content);

  // Flash a toast message
  const flash = useCallback((msg: string, duration = 1500) => {
    setLastSavedMsg(msg);
    setTimeout(() => setLastSavedMsg(''), duration);
  }, []);

  // Editor input handler
  const handleEditorInput = useCallback(
    (text: string) => {
      const stats = computeStats(text);
      const editMetrics = calculateEditMetrics(currentChapter.content, text);
      updateChapter(currentChapterId, {
        content: text,
        wordCount: stats.total,
        added: currentChapter.added + editMetrics.added,
        deleted: currentChapter.deleted + editMetrics.deleted,
        rewrite: Math.max(currentChapter.rewrite, editMetrics.rewritePercent),
        retention: Math.min(currentChapter.retention, editMetrics.retentionPercent),
      });
      flash('已自動儲存', 1400);
    },
    [
      currentChapterId,
      currentChapter.content,
      currentChapter.added,
      currentChapter.deleted,
      currentChapter.rewrite,
      currentChapter.retention,
      updateChapter,
      computeStats,
      flash,
    ],
  );

  // Title change
  const handleTitleChange = useCallback(
    (title: string) => {
      updateChapter(currentChapterId, { title });
    },
    [currentChapterId, updateChapter],
  );

  const applyAIContent = useCallback(
    (newContent: string) => {
      const stats = computeStats(newContent);
      const editMetrics = calculateEditMetrics(currentChapter.content, newContent);
      updateChapter(currentChapterId, {
        content: newContent,
        wordCount: stats.total,
        added: currentChapter.added + editMetrics.added,
        deleted: currentChapter.deleted + editMetrics.deleted,
        rewrite: Math.max(currentChapter.rewrite, editMetrics.rewritePercent),
        retention: Math.min(currentChapter.retention, editMetrics.retentionPercent),
      });
    },
    [computeStats, currentChapter, currentChapterId, updateChapter],
  );

  const runAgentStage = useCallback(
    async (stage: AgentStageName | 'full') => {
      if (!currentChapter.content || !currentChapter.content.trim()) {
        flash('請先輸入章節內容');
        return;
      }

      const genre = book.genre || activeTemplate.genre;
      const output = await runRewrite(
        currentChapter.content,
        genre,
        activeTemplate.themeHint,
        book.title,
        currentChapter.title,
        stage,
      );
      if (!output) return;

      if (stage === 'full' || stage === 'editor' || stage === 'writer') {
        applyAIContent(output);
        return;
      }

      setAgentResult({ stage, content: output });
    },
    [activeTemplate, applyAIContent, book, currentChapter, flash, runRewrite],
  );

  // AI rewrite
  const handleAIRewrite = useCallback(async () => {
    await runAgentStage('full');
  }, [runAgentStage]);

  const handleAIStage = useCallback(
    (stage: AgentStageName) => {
      void runAgentStage(stage);
    },
    [runAgentStage],
  );

  // Status change
  const handleStatusChange = useCallback(
    (newStatus: Chapter['status']) => {
      updateChapter(currentChapterId, { status: newStatus });
    },
    [currentChapterId, updateChapter],
  );

  // Knowledge graph node click
  const handleNodeClick = useCallback(
    (node: KnowledgeNode) => {
      setSelectedConcept(node.label);
      const related = book.chapters.filter(
        (ch) => ch.title.includes(node.label) || ch.content.includes(node.label.substring(0, 3)),
      );
      if (related.length > 0 && related[0].id !== currentChapterId) {
        setTimeout(() => switchChapter(related[0].id), 180);
      }
      setTimeout(() => setSelectedConcept(null), 3200);
    },
    [book.chapters, currentChapterId, switchChapter],
  );

  // Add concept node
  const handleAddConceptNode = useCallback(() => {
    const label = prompt('新增知識概念名稱：', '新概念');
    if (!label || !label.trim()) return;
    addGraphNode(label);
  }, [addGraphNode]);

  // Add golden quote
  const handleAddQuote = useCallback(() => {
    const text = prompt('輸入新的金句（會關聯到目前章節）：', '');
    if (!text || !text.trim()) return;
    addQuote(text, currentChapterId);
  }, [addQuote, currentChapterId]);

  // Rename project
  const handleRename = useCallback(() => {
    const next = prompt('專案／文章標題：', book.title);
    if (!next || !next.trim()) return;
    renameProject(next);
  }, [book.title, renameProject]);

  // Export JSON
  const handleExportJSON = useCallback(() => {
    const exportData = {
      ...book,
      exportDate: new Date().toISOString(),
      currentChapterId,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title}_知識庫_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('已匯出 JSON', 1600);
  }, [book, currentChapterId, flash]);

  // Import JSON
  const handleImportJSON = useCallback(
    (json: string) => {
      const ok = importBook(json);
      if (ok) {
        flash('已成功匯入專案', 1800);
      } else {
        flash('匯入失敗：JSON 格式無效', 2000);
      }
    },
    [importBook, flash],
  );

  // Export Word
  const handleExportWord = useCallback(async () => {
    if (!currentChapter.content || !currentChapter.content.trim()) {
      flash('請先輸入章節內容');
      return;
    }
    try {
      const blob = await exportToWord(currentChapter.title, currentChapter.content, book.title);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentChapter.title.replace(/[\\/:*?"<>|]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash('已匯出 Word', 1600);
    } catch (err) {
      console.error('Word export error:', err);
      flash('匯出 Word 失敗');
    }
  }, [currentChapter, book.title, flash]);

  // Export PDF
  const handleExportPDF = useCallback(async () => {
    if (!currentChapter.content || !currentChapter.content.trim()) {
      flash('請先輸入章節內容');
      return;
    }
    try {
      const blob = await exportToPdfBrowser(
        currentChapter.title,
        currentChapter.content,
        book.title,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentChapter.title.replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash('已匯出 PDF', 1600);
    } catch (err) {
      console.error('PDF export error:', err);
      flash('匯出 PDF 失敗');
    }
  }, [currentChapter, book.title, flash]);

  const downloadBlob = useCallback(
    (blob: Blob, filename: string, message: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash(message, 1600);
    },
    [flash],
  );

  const handleExportFullBookWord = useCallback(async () => {
    try {
      const blob = await exportFullBookToWord(book);
      downloadBlob(
        blob,
        `${book.title.replace(/[\\/:*?"<>|]/g, '_')}_全書.docx`,
        '已匯出全書 Word',
      );
    } catch (err) {
      console.error('Full-book Word export error:', err);
      flash('匯出全書 Word 失敗');
    }
  }, [book, downloadBlob, flash]);

  const handleExportFullBookPdf = useCallback(async () => {
    try {
      const blob = await exportFullBookToPdfBrowser(book);
      downloadBlob(blob, `${book.title.replace(/[\\/:*?"<>|]/g, '_')}_全書.pdf`, '已匯出全書 PDF');
    } catch (err) {
      console.error('Full-book PDF export error:', err);
      flash('匯出全書 PDF 失敗');
    }
  }, [book, downloadBlob, flash]);

  const handleExportMarkdown = useCallback(() => {
    const markdown = exportToMarkdown(book);
    downloadBlob(
      new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
      `${book.title.replace(/[\\/:*?"<>|]/g, '_')}.md`,
      '已匯出 Markdown',
    );
  }, [book, downloadBlob]);

  // Apply template
  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      applyTemplate(templateId);
      setIsTemplateOpen(false);
      flash(`已套用模板：${getTemplate(templateId).name}`, 2000);
    },
    [applyTemplate, flash],
  );

  // Reset graph layout
  const handleResetGraph = useCallback(() => {
    const tplGraph = createBookFromTemplate(book.templateId || DEFAULT_TEMPLATE_ID).knowledgeGraph;
    setBook((prev) => ({ ...prev, knowledgeGraph: tplGraph }));
  }, [book.templateId, setBook]);

  // Keyboard save hint
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushSave();
        flash('已手動儲存', 900);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flash, flushSave]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans-tc">
      <TopBar
        bookTitle={book.title}
        genre={book.genre || activeTemplate.genre}
        templateIcon={activeTemplate.icon}
        storageStatus={storageStatus}
        onRename={handleRename}
        onOpenTemplate={() => setIsTemplateOpen(true)}
        onExportJSON={handleExportJSON}
        onExportWord={handleExportWord}
        onExportPDF={handleExportPDF}
        onExportFullBookWord={handleExportFullBookWord}
        onExportFullBookPdf={handleExportFullBookPdf}
        onExportMarkdown={handleExportMarkdown}
        onImportJSON={handleImportJSON}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGraph={() => setIsGraphModalOpen(true)}
      />

      {/* 3-Column Main Layout (matches spec.md 20% / 55% / 25%) */}
      <div className="max-w-[1480px] mx-auto px-5 pt-5 pb-10">
        <div className="grid grid-cols-12 gap-5">
          <LeftSidebar
            book={book}
            currentChapterId={currentChapterId}
            selectedConcept={selectedConcept}
            structureLabel={activeTemplate.structureLabel}
            unitLabel={activeTemplate.unitLabel}
            onSwitchChapter={switchChapter}
            onNodeClick={handleNodeClick}
            onNodesChange={updateGraphNodes}
            onAddConceptNode={handleAddConceptNode}
            onOpenGraphModal={() => setIsGraphModalOpen(true)}
            onAddQuote={handleAddQuote}
            onRemoveQuote={removeQuote}
          />

          <EditorPanel
            currentChapter={currentChapter}
            currentStats={currentStats}
            unitLabel={activeTemplate.unitLabel}
            isAiLoading={isAiLoading}
            aiStatus={aiStatus}
            lastSavedMsg={lastSavedMsg}
            hasApiKey={hasApiKeyConfigured()}
            providerLabel={settings.provider}
            onEditorInput={handleEditorInput}
            onTitleChange={handleTitleChange}
            onAIRewrite={handleAIRewrite}
            onAIStage={handleAIStage}
          />

          <RightSidebar
            currentChapter={currentChapter}
            currentChapterId={currentChapterId}
            onStatusChange={handleStatusChange}
            onUpdateChapter={updateChapter}
          />
        </div>
      </div>

      {/* Modals */}
      <GraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
        nodes={book.knowledgeGraph.nodes}
        edges={book.knowledgeGraph.edges}
        onNodeClick={handleNodeClick}
        onNodesChange={updateGraphNodes}
        onResetLayout={handleResetGraph}
      />

      <TemplatePickerModal
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        onApply={handleApplyTemplate}
        currentTemplateId={book.templateId}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
        onClear={clearSettings}
        onReload={reloadSettings}
      />

      <AgentResultModal
        isOpen={agentResult !== null}
        stage={agentResult?.stage || 'visualizer'}
        content={agentResult?.content || ''}
        onClose={() => setAgentResult(null)}
      />

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 pb-6">
        多文體寫作模板 · 3 欄布局 · 原生 SVG 知識圖 · 6 階段 Agent 管線 · 本地優先
      </div>
    </div>
  );
}

export default App;
