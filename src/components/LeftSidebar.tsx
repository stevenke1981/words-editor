import React from 'react';
import KnowledgeGraph from './KnowledgeGraph';
import type { Book, KnowledgeNode } from '../types';

interface LeftSidebarProps {
  book: Book;
  currentChapterId: string;
  selectedConcept: string | null;
  structureLabel: string;
  unitLabel: string;
  onSwitchChapter: (id: string) => void;
  onNodeClick: (node: KnowledgeNode) => void;
  onNodesChange: (nodes: KnowledgeNode[]) => void;
  onAddConceptNode: () => void;
  onOpenGraphModal: () => void;
  onAddQuote: () => void;
  onRemoveQuote: (id: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  book,
  currentChapterId,
  selectedConcept,
  structureLabel,
  unitLabel,
  onSwitchChapter,
  onNodeClick,
  onNodesChange,
  onAddConceptNode,
  onOpenGraphModal,
  onAddQuote,
  onRemoveQuote,
}) => {
  return (
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
              onClick={onAddConceptNode}
              className="text-[10px] px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded-md"
              title="新增概念節點"
            >
              + 新增
            </button>
            <button
              onClick={onOpenGraphModal}
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
            onNodeClick={onNodeClick}
            onNodesChange={onNodesChange}
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
            onClick={onAddQuote}
            className="text-xs flex items-center gap-x-1 px-2 py-0.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            + 新增
          </button>
        </div>

        <div className="p-3 max-h-[138px] overflow-auto text-sm space-y-2">
          {book.goldenQuotes.length === 0 && (
            <div className="text-xs text-slate-400 py-2">尚無金句。從編輯器選取文字後可提取。</div>
          )}
          {book.goldenQuotes.map((q) => (
            <div key={q.id} className="group bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-xs leading-snug relative">
              <div className="pr-5">「{q.text}」</div>
              <div className="mt-1 text-amber-600/70 text-[10px]">— {q.chapterId ? `第${q.chapterId}章` : '全書'} · {q.createdAt}</div>
              <button
                onClick={() => onRemoveQuote(q.id)}
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
              📑 {structureLabel}
            </span>
            <span className="text-xs text-slate-500">{book.chapters.length} {unitLabel}</span>
          </div>
        </div>

        <div className="p-1.5 text-sm divide-y divide-slate-100">
          {book.chapters.map((ch) => (
            <div
              key={ch.id}
              onClick={() => onSwitchChapter(ch.id)}
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
  );
};

export default LeftSidebar;
