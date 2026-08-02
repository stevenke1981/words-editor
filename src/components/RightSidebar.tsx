import React from 'react';
import type { Chapter } from '../types';

interface RightSidebarProps {
  currentChapter: Chapter;
  currentChapterId: string;
  onStatusChange: (status: Chapter['status']) => void;
  onUpdateChapter: (chapterId: string, updates: Partial<Chapter>) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  currentChapter,
  currentChapterId,
  onStatusChange,
  onUpdateChapter,
}) => {
  return (
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
              {(['待寫', '草稿', '完成'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
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
                  onUpdateChapter(currentChapterId, { references: refs });
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
              onChange={(e) => onUpdateChapter(currentChapterId, { inspirationNotes: e.target.value })}
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
  );
};

export default RightSidebar;
