import React from 'react';
import KnowledgeGraph from '../KnowledgeGraph';
import type { KnowledgeNode, KnowledgeEdge } from '../../types';

interface GraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  onNodeClick: (node: KnowledgeNode) => void;
  onNodesChange: (nodes: KnowledgeNode[]) => void;
  onResetLayout: () => void;
}

const GraphModal: React.FC<GraphModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  onNodeClick,
  onNodesChange,
  onResetLayout,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <div className="font-semibold flex items-center gap-x-2 text-lg">
            📊 知識關聯圖（完整互動版）
          </div>
          <button onClick={onClose} className="text-3xl leading-none text-slate-400 hover:text-slate-600">×</button>
        </div>

        <div className="p-6">
          <div className="text-center text-xs text-slate-500 mb-3">
            拖曳節點移動位置 · 滾輪縮放 · 拖曳背景平移 · 點擊節點高亮關聯
          </div>
          <div className="flex justify-center bg-slate-50 rounded-2xl p-4">
            <KnowledgeGraph
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              onNodesChange={onNodesChange}
              width={620}
              height={380}
            />
          </div>
          <div className="mt-3 text-xs text-slate-500 text-center">
            共 {nodes.length} 節點 · {edges.length} 條關聯 · 位置變更即時同步至側邊欄
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 text-xs flex justify-end gap-x-3 border-t">
          <button onClick={onClose} className="px-5 py-2 text-slate-600">關閉</button>
          <button
            onClick={() => {
              onResetLayout();
              onClose();
            }}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl"
          >
            重置布局
          </button>
        </div>
      </div>
    </div>
  );
};

export default GraphModal;
