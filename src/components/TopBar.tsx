import React, { useRef } from 'react';

interface TopBarProps {
  bookTitle: string;
  genre: string;
  templateIcon: string;
  onRename: () => void;
  onOpenTemplate: () => void;
  onExportJSON: () => void;
  onExportWord: () => void;
  onExportPDF: () => void;
  onImportJSON: (json: string) => void;
  onOpenSettings: () => void;
  onOpenGraph: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  bookTitle,
  genre,
  templateIcon,
  onRename,
  onOpenTemplate,
  onExportJSON,
  onExportWord,
  onExportPDF,
  onImportJSON,
  onOpenSettings,
  onOpenGraph,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      onImportJSON(text);
    };
    reader.readAsText(file);
    // Reset so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[1480px] mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-x-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg tracking-tighter">W</div>
          <div>
            <button
              type="button"
              onClick={onRename}
              className="font-semibold text-xl tracking-tight hover:text-blue-700 text-left"
              title="點擊重新命名專案"
            >
              {bookTitle}
            </button>
            <div className="text-[10px] text-slate-500 -mt-0.5 flex items-center gap-x-1.5 flex-wrap">
              <span>多 Agent 文章寫作工具 · 離線優先</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-x-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {templateIcon} {genre}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-2 text-sm">
          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-x-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> 本地已同步
          </div>
          <button
            onClick={onOpenTemplate}
            className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center gap-x-1.5 transition-colors"
            title="選擇文章／書籍寫作模板"
          >
            📋 模板
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
            title="匯入 JSON 專案檔案"
          >
            匯入 JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={onExportJSON}
            className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
          >
            匯出 JSON
          </button>
          <button
            onClick={onExportWord}
            className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
          >
            匯出 Word
          </button>
          <button
            onClick={onExportPDF}
            className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
          >
            匯出 PDF
          </button>
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 text-xs border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-x-1.5 transition-colors"
            title="設定 API 金鑰與提供者（DeepSeek / OpenRouter / 本地 Ollama）"
          >
            ⚙ 設定
          </button>
          <button
            onClick={onOpenGraph}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-xl flex items-center gap-x-1.5 hover:bg-blue-700 transition-colors"
          >
            展開知識圖
          </button>
          <div className="text-[10px] text-slate-400 ml-2">Ctrl/Cmd+S 儲存</div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
