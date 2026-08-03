import type React from 'react';
import { useEffect, useState } from 'react';
import type { AgentStageName } from '../../services/agentService';

interface AgentResultModalProps {
  isOpen: boolean;
  stage: AgentStageName;
  content: string;
  onClose: () => void;
}

const STAGE_LABELS: Record<AgentStageName, string> = {
  architect: 'Architect（架構師）',
  research: 'Research（研究員）',
  writer: 'Writer（作家）',
  editor: 'Editor（編輯）',
  reviewer: 'Reviewer（審稿人）',
  visualizer: 'Visualizer（視覺化）',
};

const AgentResultModal: React.FC<AgentResultModalProps> = ({ isOpen, stage, content, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={() => undefined}
    >
      <dialog
        open
        aria-modal="true"
        aria-label={`${STAGE_LABELS[stage]} 結果`}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
          <div>
            <div className="font-semibold text-lg">{STAGE_LABELS[stage]} 結果</div>
            <div className="text-xs text-slate-500 mt-0.5">此結果不會自動覆蓋目前內容</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-3xl leading-none text-slate-400 hover:text-slate-600"
            aria-label="關閉 Agent 結果"
          >
            ×
          </button>
        </div>

        <pre className="m-0 p-6 overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 min-h-[220px]">
          {content}
        </pre>

        <div className="bg-slate-50 px-6 py-3 border-t flex justify-end gap-x-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl text-sm"
          >
            {copied ? '已複製' : '複製結果'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm"
          >
            關閉
          </button>
        </div>
      </dialog>
    </div>
  );
};

export default AgentResultModal;
