import React from 'react';
import { listTemplates, DEFAULT_TEMPLATE_ID } from '../../data/templates';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (templateId: string) => void;
  currentTemplateId?: string;
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentTemplateId,
}) => {
  if (!isOpen) return null;

  const allTemplates = listTemplates();
  const activeTemplate = allTemplates.find((t) => t.id === (currentTemplateId || DEFAULT_TEMPLATE_ID)) || allTemplates[0];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <div className="font-semibold text-lg flex items-center gap-x-2">📋 選擇寫作模板</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {allTemplates.length} 種寫作範例：小說、演講、書評、專訪、電子報、案例、社群、提案、兒童、社論、科幻等。套用會替換目前專案內容。
            </div>
          </div>
          <button onClick={onClose} className="text-3xl leading-none text-slate-400 hover:text-slate-600">×</button>
        </div>

        <div className="p-5 overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allTemplates.map((t) => {
            const active = (currentTemplateId || DEFAULT_TEMPLATE_ID) === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (active) {
                    onClose();
                    return;
                  }
                  const ok = window.confirm(
                    `套用「${t.name}」會取代目前專案的章節與知識圖。\n（可先匯出 JSON 備份）\n\n確定套用？`
                  );
                  if (ok) onApply(t.id);
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
          <button onClick={onClose} className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-xl">
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePickerModal;
