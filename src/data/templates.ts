/**
 * Writing project templates — multi-genre article / book starters.
 * Finance is one option among many; default is general article writing.
 */

import type { Book, Chapter, GoldenQuote, KnowledgeGraphData } from '../types';

export type TemplateId =
  | 'general-article'
  | 'finance-book'
  | 'tech-tutorial'
  | 'blog-opinion'
  | 'news-feature'
  | 'product-copy'
  | 'personal-essay'
  | 'academic-outline'
  | 'howto-guide'
  | 'travel-story'
  | 'short-story'
  | 'speech-script'
  | 'book-review'
  | 'interview-profile'
  | 'email-newsletter'
  | 'case-study'
  | 'social-thread'
  | 'business-proposal'
  | 'children-story'
  | 'op-ed'
  | 'meeting-notes'
  | 'sci-fi-flash';

export interface WritingTemplate {
  id: TemplateId;
  name: string;
  genre: string;
  description: string;
  icon: string;
  /** Short tag for UI chips */
  tag: string;
  /** Theme phrase injected into AI agent prompts */
  themeHint: string;
  /** Suggested structure labels (部 / 段落 / 章節) */
  structureLabel: string;
  unitLabel: string; // 章節 | 段落 | 章
  createBook: () => Book;
}

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function chapter(
  partial: Omit<
    Chapter,
    'added' | 'deleted' | 'retention' | 'rewrite' | 'lastSaved' | 'wordCount'
  > & {
    wordCount?: number;
    added?: number;
    deleted?: number;
    retention?: number;
    rewrite?: number;
  },
): Chapter {
  const content = partial.content || '';
  const chinese = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const english = content.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length;
  const wordCount = partial.wordCount ?? chinese + english;
  return {
    ...partial,
    wordCount,
    added: partial.added ?? wordCount,
    deleted: partial.deleted ?? 0,
    retention: partial.retention ?? 100,
    rewrite: partial.rewrite ?? 0,
    lastSaved: nowStamp(),
  };
}

function graph(
  nodes: Array<{ id: string; label: string; x: number; y: number; color: string }>,
  edges: Array<{ id: string; source: string; target: string }>,
): KnowledgeGraphData {
  return {
    nodes: nodes.map((n) => ({ ...n, type: 'concept' as const })),
    edges,
  };
}

function quotes(items: Array<{ id: string; text: string; chapterId?: string }>): GoldenQuote[] {
  const d = new Date().toISOString().slice(0, 10);
  return items.map((q) => ({ ...q, createdAt: d }));
}

const TEMPLATES: WritingTemplate[] = [
  {
    id: 'general-article',
    name: '通用文章',
    genre: '一般寫作',
    description: '適合多數主題：開場、論點、案例、結論。從空白結構開始。',
    icon: '✍️',
    tag: '預設',
    themeHint: '清晰、可讀、有觀點的一般文章',
    structureLabel: '文章架構',
    unitLabel: '段落',
    createBook: () => ({
      title: '我的新文章',
      templateId: 'general-article',
      genre: '一般寫作',
      description: '通用文章專案',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '開場：為什麼這件事值得讀？',
          section: '開頭',
          status: '草稿',
          content:
            '上週三晚上十一點，我盯著空白文件第二十六分鐘，還是一個字都沒寫出來。\n\n不是沒有題目，是題目太多；不是沒有時間，是每次「有空再說」都把空檔吃掉了。\n\n這篇文章想回答一個很實際的問題：當你不是全職作家，要怎麼用有限精力，穩定產出還過得去的文章？\n\n讀完你會帶走：一個可複製的選題框架、一個地板字數法，以及何時該停筆的判斷。',
          inspirationNotes: '開場可用故事、反常識觀點或近期事件',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '主體：三個關鍵論點',
          section: '主體',
          status: '草稿',
          content:
            '論點一：先縮小讀者，再放大內容。\n「給所有人」通常誰都留不住。試著寫成「給正在轉職的工程師」或「給第一次帶團隊的人」。\n\n論點二：用地板字數打敗完美主義。\n每天 200 字且不可刪，比立志寫 2000 字更容易累積可改的草稿。\n\n論點三：結構先於文采。\n開場承諾 → 論點與例子 → 可執行下一步。文采是最後一層油漆，不是地基。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '收束：行動與下一步',
          section: '結尾',
          status: '待寫',
          content:
            '若你只做一件事：今晚列出三個「對誰 + 什麼改變」的標題候選，明天只寫其中一個的開場 200 字。\n\n寫作不是等到狀態好才開始；狀態，常常是開始之後才出現的。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '核心問題', x: 115, y: 42, color: '#2563eb' },
          { id: 'k2', label: '論點', x: 48, y: 92, color: '#059669' },
          { id: 'k3', label: '證據', x: 175, y: 92, color: '#7c3aed' },
          { id: 'k4', label: '讀者收益', x: 32, y: 58, color: '#d97706' },
          { id: 'k5', label: '行動呼籲', x: 195, y: 55, color: '#e11d48' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k1', target: 'k4' },
          { id: 'e4', source: 'k2', target: 'k5' },
        ],
      ),
      goldenQuotes: quotes([
        { id: 'q1', text: '好文章先回答：讀者為什麼要花時間讀你？', chapterId: '01' },
      ]),
    }),
  },
  {
    id: 'finance-book',
    name: '財經／理財書',
    genre: '財經非虛構',
    description: '財富、心態、資產與系統化條件的書籍結構範例。',
    icon: '💰',
    tag: '財經',
    themeHint: '財務自由、心態、資產配置與可複製系統',
    structureLabel: '書籍架構',
    unitLabel: '章',
    createBook: () => ({
      title: '財富自由之前',
      templateId: 'finance-book',
      genre: '財經非虛構',
      description: '以財務自由為主題的非虛構書稿',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '財務自由之前，你真正要先自由的是什麼？',
          section: '序部',
          status: '完成',
          content:
            '很多人以為財務自由就是有錢。\n\n但真正的財務自由，是你不再被金錢綁架你的時間、注意力與選擇權。\n\n在開始寫這本書之前，我問自己一個問題：\n\n「如果我現在已經有足夠的錢，我還會繼續做現在的工作嗎？」\n\n答案是否定的。\n\n這代表我現在的工作並不是出於完全的自由意志，而是出於對金錢的依賴。\n\n所以，財務自由的第一步，其實是「心態自由」與「時間自由」。',
          inspirationNotes: '從《原子習慣》與《窮爸爸富爸爸》的對照中得到啟發',
          references: [
            { date: '2026-05-07', title: '貧窮思維 vs 豐盛思維' },
            { date: '2026-05-04', title: '為什麼加班文化讓人永遠無法財務自由' },
          ],
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '當你腦中只有財富自由這四個字，那只表示你還沒方向',
          section: '序部',
          status: '待寫',
          content:
            '很多人說自己想要財務自由，但如果再問深一點，他真正想說的可能是：我不想再上班了。\n\n不想再看主管臉色，不想再被會議追著跑，不想再為了薪水忍耐，不想把生活切得支離破碎。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '財務自由是一個目標，先拆成功條件',
          section: '序部',
          status: '草稿',
          content:
            '財務自由不是單一事件，而是一系列可重複的條件累積。\n\n心態、能力、資產、系統，四層結構。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '財富自由', x: 115, y: 42, color: '#2563eb' },
          { id: 'k2', label: '心態轉變', x: 48, y: 92, color: '#059669' },
          { id: 'k3', label: '被動收入', x: 175, y: 92, color: '#7c3aed' },
          { id: 'k4', label: '時間自由', x: 32, y: 58, color: '#d97706' },
          { id: 'k5', label: '技能變現', x: 195, y: 55, color: '#e11d48' },
          { id: 'k6', label: '心態自由', x: 82, y: 115, color: '#0891b2' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k1', target: 'k3' },
          { id: 'e3', source: 'k1', target: 'k4' },
          { id: 'e4', source: 'k2', target: 'k6' },
          { id: 'e5', source: 'k3', target: 'k5' },
          { id: 'e6', source: 'k4', target: 'k1' },
        ],
      ),
      goldenQuotes: quotes([
        {
          id: 'q1',
          text: '真正的財務自由，是你不再被金錢綁架你的時間、注意力與選擇權。',
          chapterId: '01',
        },
        {
          id: 'q2',
          text: '如果你只是想逃，卻沒有建立新的能力與選擇權，你離開一個地方後，很可能只是走進一個相似的困境。',
          chapterId: '02',
        },
      ]),
    }),
  },
  {
    id: 'tech-tutorial',
    name: '技術教學',
    genre: '技術文件',
    description: '前置需求、步驟、常見錯誤、驗證結果的教學文結構。',
    icon: '🛠️',
    tag: '技術',
    themeHint: '可重現的技術教學：步驟清楚、可驗證、少廢話',
    structureLabel: '教學架構',
    unitLabel: '節',
    createBook: () => ({
      title: '從零開始：實作教學',
      templateId: 'tech-tutorial',
      genre: '技術文件',
      description: '技術教學文章專案',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '你會學到什麼／前置需求',
          section: '準備',
          status: '草稿',
          content:
            '## 目標\n完成本文後，你能夠……\n\n## 適合誰\n- …\n\n## 環境需求\n- OS / runtime / 工具版本\n\n## 預計時間\n約 20–40 分鐘',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '步驟一：建立專案骨架',
          section: '實作',
          status: '待寫',
          content: '1. 安裝…\n2. 初始化…\n3. 驗證指令輸出應為…\n\n```bash\n# 範例指令\n```',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '步驟二：核心功能',
          section: '實作',
          status: '待寫',
          content: '說明原理 → 程式片段 → 預期行為 → 除錯提示。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '常見錯誤與總結',
          section: '收尾',
          status: '待寫',
          content: '## FAQ\n\n## 檢查清單\n- [ ] 功能可跑\n- [ ] 測試通過\n\n## 下一步延伸',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '目標', x: 110, y: 40, color: '#2563eb' },
          { id: 'k2', label: '環境', x: 40, y: 90, color: '#059669' },
          { id: 'k3', label: '步驟', x: 170, y: 90, color: '#7c3aed' },
          { id: 'k4', label: '驗證', x: 110, y: 120, color: '#d97706' },
          { id: 'k5', label: '除錯', x: 200, y: 55, color: '#e11d48' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
          { id: 'e4', source: 'k3', target: 'k5' },
        ],
      ),
      goldenQuotes: quotes([
        { id: 'q1', text: '好的教學文讓讀者能在不看你的情況下重現結果。', chapterId: '01' },
      ]),
    }),
  },
  {
    id: 'blog-opinion',
    name: '部落格觀點文',
    genre: '部落格',
    description: '鉤子、立場、論證、反方、結語的觀點型長文。',
    icon: '📝',
    tag: '部落格',
    themeHint: '有立場的部落格觀點文：鉤子強、論證清楚、語氣自然',
    structureLabel: '文章架構',
    unitLabel: '段',
    createBook: () => ({
      title: '我對○○的看法',
      templateId: 'blog-opinion',
      genre: '部落格',
      description: '觀點型部落格文章',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '鉤子：一個讓人停下來的開頭',
          section: '開頭',
          status: '草稿',
          content: '用故事、數據或反常識句開場。一句話點出你的立場。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '為什麼多數人想錯了',
          section: '論證',
          status: '待寫',
          content: '拆解常見迷思，提出你的框架。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '我的做法與案例',
          section: '論證',
          status: '待寫',
          content: '用親身經驗或可查證案例支撐。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '結語與邀請討論',
          section: '結尾',
          status: '待寫',
          content: '重申立場，留下一個問題給讀者。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '立場', x: 115, y: 45, color: '#2563eb' },
          { id: 'k2', label: '迷思', x: 45, y: 95, color: '#e11d48' },
          { id: 'k3', label: '框架', x: 180, y: 95, color: '#059669' },
          { id: 'k4', label: '案例', x: 115, y: 120, color: '#7c3aed' },
        ],
        [
          { id: 'e1', source: 'k2', target: 'k1' },
          { id: 'e2', source: 'k1', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  {
    id: 'news-feature',
    name: '專題／報導',
    genre: '新聞專題',
    description: '導言、背景、多方觀點、影響、後續的專題結構。',
    icon: '📰',
    tag: '報導',
    themeHint: '中立可查證的專題報導：事實優先、多方觀點、標註來源',
    structureLabel: '專題架構',
    unitLabel: '節',
    createBook: () => ({
      title: '專題：○○事件觀察',
      templateId: 'news-feature',
      genre: '新聞專題',
      description: '專題報導寫作專案',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '導言：發生了什麼',
          section: '導言',
          status: '草稿',
          content: '5W1H 濃縮：誰、何時、何地、做了什麼、為何重要。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '背景與時間線',
          section: '背景',
          status: '待寫',
          content: '關鍵時間點列表，避免一次塞太多細節。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '多方觀點',
          section: '主體',
          status: '待寫',
          content: 'A 方說法 / B 方說法 / 獨立專家。標註來源。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '影響與後續',
          section: '結語',
          status: '待寫',
          content: '短期影響、長期風險、仍待釐清的問題。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '事件', x: 115, y: 40, color: '#2563eb' },
          { id: 'k2', label: '時間線', x: 40, y: 90, color: '#059669' },
          { id: 'k3', label: '利害關係人', x: 180, y: 90, color: '#7c3aed' },
          { id: 'k4', label: '影響', x: 115, y: 120, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k1', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  {
    id: 'product-copy',
    name: '產品文案',
    genre: '行銷文案',
    description: '痛點、利益、證明、CTA 的產品／落地頁文案骨架。',
    icon: '🚀',
    tag: '文案',
    themeHint: '轉換導向產品文案：痛點明確、利益具體、CTA 清楚',
    structureLabel: '文案架構',
    unitLabel: '區塊',
    createBook: () => ({
      title: '產品落地頁文案',
      templateId: 'product-copy',
      genre: '行銷文案',
      description: '產品行銷文案專案',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: 'Headline + 副標',
          section: '首屏',
          status: '草稿',
          content: '主標：一句話說清價值。\n副標：對象 + 成果 + 時間。\nCTA：主按鈕文案',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '痛點與後果',
          section: '問題',
          status: '待寫',
          content: '讀者現在卡在哪？不做會付出什麼代價？',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '方案與三大利益',
          section: '方案',
          status: '待寫',
          content: '利益 1 / 利益 2 / 利益 3（可量化更好）',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '社會證明 + CTA',
          section: '轉換',
          status: '待寫',
          content: '見證、數據、保證條款、最終 CTA。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '痛點', x: 50, y: 70, color: '#e11d48' },
          { id: 'k2', label: '利益', x: 115, y: 40, color: '#2563eb' },
          { id: 'k3', label: '證明', x: 180, y: 70, color: '#059669' },
          { id: 'k4', label: 'CTA', x: 115, y: 115, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([
        { id: 'q1', text: '文案不是寫產品，是寫讀者變好的樣子。', chapterId: '01' },
      ]),
    }),
  },
  {
    id: 'personal-essay',
    name: '個人隨筆',
    genre: '散文隨筆',
    description: '場景、情緒、轉折、余韻的抒情／敘事隨筆。',
    icon: '🍃',
    tag: '隨筆',
    themeHint: '真摯的個人隨筆：場景具體、情緒真實、留白有余韻',
    structureLabel: '隨筆架構',
    unitLabel: '節',
    createBook: () => ({
      title: '未命名隨筆',
      templateId: 'personal-essay',
      genre: '散文隨筆',
      description: '個人敘事隨筆',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '場景：我站在哪裡',
          section: '起',
          status: '草稿',
          content: '用感官細節寫出時間、地點、氣味或光線。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '衝突或心事',
          section: '承',
          status: '待寫',
          content: '內心的拉扯是什麼？不要急著給答案。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '轉折與余韻',
          section: '合',
          status: '待寫',
          content: '一個小領悟即可，避免說教。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '場景', x: 60, y: 60, color: '#059669' },
          { id: 'k2', label: '情緒', x: 140, y: 40, color: '#7c3aed' },
          { id: 'k3', label: '轉折', x: 180, y: 100, color: '#d97706' },
          { id: 'k4', label: '余韻', x: 90, y: 115, color: '#2563eb' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  {
    id: 'academic-outline',
    name: '學術／報告大綱',
    genre: '學術寫作',
    description: '摘要、文獻、方法、結果、討論的報告骨架。',
    icon: '🎓',
    tag: '學術',
    themeHint: '嚴謹學術寫作：定義清楚、引用可追溯、論證可檢驗',
    structureLabel: '報告架構',
    unitLabel: '節',
    createBook: () => ({
      title: '研究報告草稿',
      templateId: 'academic-outline',
      genre: '學術寫作',
      description: '學術報告／論文大綱',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '摘要（Abstract）',
          section: '摘要',
          status: '草稿',
          content: '背景一句 → 問題 → 方法 → 主要發現 → 意涵（150–250 字）。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '緒論與研究問題',
          section: '緒論',
          status: '待寫',
          content: '研究動機、研究問題 RQ1/RQ2、貢獻說明。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '文獻回顧',
          section: '文獻',
          status: '待寫',
          content: '主題 A / 主題 B / 研究缺口。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '方法與結果',
          section: '方法',
          status: '待寫',
          content: '資料、程序、限制；結果以條列或表格說明。',
        }),
        chapter({
          id: '05',
          chapter: '05',
          title: '討論與結論',
          section: '結論',
          status: '待寫',
          content: '對 RQ 的回答、理論／實務意涵、未來研究。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: 'RQ', x: 115, y: 40, color: '#2563eb' },
          { id: 'k2', label: '文獻', x: 40, y: 90, color: '#059669' },
          { id: 'k3', label: '方法', x: 180, y: 90, color: '#7c3aed' },
          { id: 'k4', label: '發現', x: 115, y: 120, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k2', target: 'k1' },
          { id: 'e2', source: 'k1', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  {
    id: 'howto-guide',
    name: 'How-to 指南',
    genre: '實用指南',
    description: '目標、材料、逐步操作、檢查表的實用指南。',
    icon: '✅',
    tag: '指南',
    themeHint: '實用 How-to：步驟可跟做、檢查表完整、風險提示清楚',
    structureLabel: '指南架構',
    unitLabel: '步',
    createBook: () => ({
      title: 'How to：完成○○',
      templateId: 'howto-guide',
      genre: '實用指南',
      description: '實用操作指南',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '目標與適用情境',
          section: '開始前',
          status: '草稿',
          content: '這份指南幫你完成什麼？不適合誰？',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '材料／工具清單',
          section: '準備',
          status: '待寫',
          content: '- 必備\n- 選配\n- 預估成本與時間',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '逐步操作',
          section: '操作',
          status: '待寫',
          content: 'Step 1 …\nStep 2 …\nStep 3 …\n每步附「完成樣子」描述。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '檢查表與注意事項',
          section: '收尾',
          status: '待寫',
          content: '- [ ] …\n風險與安全提醒\n延伸資源',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '目標', x: 110, y: 40, color: '#2563eb' },
          { id: 'k2', label: '材料', x: 45, y: 90, color: '#059669' },
          { id: 'k3', label: '步驟', x: 175, y: 90, color: '#7c3aed' },
          { id: 'k4', label: '檢查', x: 110, y: 120, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  {
    id: 'travel-story',
    name: '旅行／紀實',
    genre: '旅行紀實',
    description: '路線、見聞、人物、感悟的旅行或地方紀實。',
    icon: '✈️',
    tag: '旅行',
    themeHint: '旅行紀實：路線清楚、見聞生動、人物真實、感悟克制',
    structureLabel: '行程架構',
    unitLabel: '日',
    createBook: () => ({
      title: '旅途筆記',
      templateId: 'travel-story',
      genre: '旅行紀實',
      description: '旅行／地方紀實專案',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '為什麼出發',
          section: '緣起',
          status: '草稿',
          content: '動機、預期、帶上什麼心態上路。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '路線與關鍵停留',
          section: '行程',
          status: '待寫',
          content: 'Day 1 / Day 2 … 地點、交通、花費備註。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '遇見的人與事',
          section: '見聞',
          status: '待寫',
          content: '一個印象深刻的對話或場景。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '帶回家的東西',
          section: '回程',
          status: '待寫',
          content: '不只是伴手禮，還有改變你的觀點。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '出發', x: 50, y: 70, color: '#2563eb' },
          { id: 'k2', label: '路線', x: 115, y: 40, color: '#059669' },
          { id: 'k3', label: '人物', x: 180, y: 70, color: '#7c3aed' },
          { id: 'k4', label: '感悟', x: 115, y: 115, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  // ─── Additional writing examples ───────────────────────────────────────
  {
    id: 'short-story',
    name: '短篇小說',
    genre: '虛構敘事',
    description: '開場場景、衝突、轉折、高潮、收束的短篇故事範例。',
    icon: '📖',
    tag: '小說',
    themeHint: '短篇小說：場景可感、人物有欲望、衝突推進、結尾有回響',
    structureLabel: '故事架構',
    unitLabel: '場',
    createBook: () => ({
      title: '雨停之前',
      templateId: 'short-story',
      genre: '虛構敘事',
      description: '短篇小說寫作範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '開場：雨夜的便利商店',
          section: '起',
          status: '完成',
          content:
            '雨打在騎樓鐵皮上，像有人反覆敲著同一把鑰匙。\n\n阿澤把濕透的外套掛在門邊鉤子上，指尖還殘著捷運扶手的涼。店員沒抬頭，只把找零推過來。他本來只想買一罐咖啡，卻在冷藏櫃前停住——那罐他從前和她常喝的氣泡水，標籤褪成差不多的粉。\n\n他沒拿。\n\n門鈴響了一下。門開了。一個撐透明傘的女人側身進來，把傘尖在門墊上頓了兩下。水珠濺上他的鞋面。\n\n他認得那頓傘的節奏。',
          inspirationNotes: '用感官細節開場；延遲揭示人物關係',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '衝突：不該再見面的理由',
          section: '承',
          status: '草稿',
          content:
            '「你怎麼在這裡？」她先開口，聲音比雨小。\n\n阿澤本來可以說：路過。或：加班。但他看著她耳後那顆小痣，忽然說不出任何省事的謊。\n\n「我住附近了。」他說。\n\n她愣了一下，像在核對某個舊地址是否仍然有效。\n\n三年前他們分手時約好：不聯絡、不問、不巧遇。城市很大，理論上夠用。理論總是在便利商店失效。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '轉折：一封沒寄出的訊息',
          section: '轉',
          status: '待寫',
          content:
            '她掏出手機，螢幕亮起一則草稿——收件人是他的舊暱稱，內容只有一行：「雨停了再走。」時間戳是昨晚。\n\n「我沒按送出。」她說，像在承認一件無關緊要的小事。\n\n阿澤這才發現，自己口袋裡那支手機，也有一則同樣未送出的草稿。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '收束：雨還在下',
          section: '合',
          status: '待寫',
          content:
            '他們沒有交換新號碼。只是並肩站在門簷下，看騎樓積水倒映出斑駁的燈箱。\n\n雨沒有要停的意思。\n\n「下次如果再遇到，」她把傘推到他那邊一點，「可以點頭。」\n\n阿澤點了點頭。這次，是給現在的。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '場景', x: 50, y: 50, color: '#2563eb' },
          { id: 'k2', label: '人物欲望', x: 150, y: 40, color: '#7c3aed' },
          { id: 'k3', label: '衝突', x: 180, y: 95, color: '#e11d48' },
          { id: 'k4', label: '物件（信物）', x: 80, y: 110, color: '#d97706' },
          { id: 'k5', label: '余韻', x: 120, y: 70, color: '#059669' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
          { id: 'e4', source: 'k4', target: 'k5' },
        ],
      ),
      goldenQuotes: quotes([
        { id: 'q1', text: '城市很大，理論上夠用。理論總是在便利商店失效。', chapterId: '02' },
      ]),
    }),
  },
  {
    id: 'speech-script',
    name: '演講稿',
    genre: '演說稿',
    description: '開場鉤子、故事、論點、金句、行動呼籲的演講結構範例。',
    icon: '🎤',
    tag: '演講',
    themeHint: '演講稿：口語節奏、故事帶入、金句可記、結尾可行動',
    structureLabel: '講稿架構',
    unitLabel: '段',
    createBook: () => ({
      title: '演講：把注意力還給自己',
      templateId: 'speech-script',
      genre: '演說稿',
      description: '10–12 分鐘演講稿範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '開場（0–60 秒）',
          section: '開場',
          status: '完成',
          content:
            '（上台，停兩秒，看向聽眾）\n\n各位早上醒來，第一件事做了什麼？\n\n如果答案是——解鎖手機，那你不是少數。我自己也曾連續 400 天，在意識到「我還活著」之前，先確認「世界有沒有傳訊給我」。\n\n今天我想談的不是戒手機，而是一件更難的事：把注意力，從「被需要」拿回來，還給「我想成為的人」。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '故事：我失去的三個早上',
          section: '故事',
          status: '草稿',
          content:
            '去年，我連續錯過三次重要對話。不是會議，是跟家人的早餐。\n\n每一次我都在回訊息，每一次我都以為「再兩分鐘」。兩分鐘乘以焦慮，等於整段關係的缺席。\n\n後來我做了一個很小的實驗：鬧鐘響後的前三十分鐘，手機放在另一個房間。\n\n結果不是我變得更有效率——而是我第一次聽見自己在想什麼。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '三個論點',
          section: '論點',
          status: '草稿',
          content:
            '第一，注意力是有限資源，不是道德問題。你不是懶，你是被設計去分心。\n\n第二，深度工作需要邊界，邊界需要儀式。例如：同一張桌子、同一杯水、同一首開始曲。\n\n第三，關係也需要「在場」。在場不是回得快，是聽得進。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '金句與收束 CTA',
          section: '結尾',
          status: '待寫',
          content:
            '金句：你回覆世界的速度，不該快過你回應自己的速度。\n\n請各位今天只做一件事：選一個 30 分鐘，把通知關掉，完成一件你一拖再拖的小事。\n\n做完，告訴旁邊的人你做了什麼。我們用行動，而不是用讚，結束這場演講。\n\n謝謝大家。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '鉤子', x: 50, y: 60, color: '#e11d48' },
          { id: 'k2', label: '故事', x: 120, y: 40, color: '#2563eb' },
          { id: 'k3', label: '論點', x: 180, y: 80, color: '#059669' },
          { id: 'k4', label: 'CTA', x: 100, y: 115, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([
        {
          id: 'q1',
          text: '你回覆世界的速度，不該快過你回應自己的速度。',
          chapterId: '04',
        },
      ]),
    }),
  },
  {
    id: 'book-review',
    name: '書評／影評',
    genre: '評論寫作',
    description: '不劇透主線的評價：摘要、優點、局限、適合誰。',
    icon: '⭐',
    tag: '評論',
    themeHint: '書評影評：有立場、少劇透、論點有證據、給出推薦對象',
    structureLabel: '評論架構',
    unitLabel: '節',
    createBook: () => ({
      title: '書評：《原子習慣》重讀筆記',
      templateId: 'book-review',
      genre: '評論寫作',
      description: '書評寫作範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '一句話評價 + 基本資料',
          section: '總評',
          status: '完成',
          content:
            '★ ★ ★ ★ ☆（4/5）\n\n這不是教你「突然變自律」的雞湯，而是一本把行為拆成可調參數的操作手冊。\n\n作者：James Clear｜類型：習慣／生產力｜適合：想建立系統而非靠意志力的人',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '核心論點（不劇透細節）',
          section: '內容',
          status: '草稿',
          content:
            '書的主軸很清楚：習慣是複利；身份認同先於目標；環境設計往往比激勵演講更有效。\n\n最有用的框架是「讓好習慣顯而易見、有吸引力、易於執行、令人滿足」——反過來也能拆解壞習慣。\n\n讀起來像工具箱：你可以只拿走兩樣，明天就用。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '優點與局限',
          section: '評價',
          status: '草稿',
          content:
            '優點：\n- 例子具體，跨運動、寫作、健康都通\n- 章節短，適合碎片時間\n- 強調系統，減少自我指責\n\n局限：\n- 對「結構性困境」（貧窮、照顧責任、精神健康）著墨較少\n- 部分概念在其他行為科學書也見過，原創性中等\n- 若你已大量閱讀習慣主題，新意有限',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '誰該讀／誰可跳過',
          section: '推薦',
          status: '待寫',
          content:
            '推薦給：剛開始想建立閱讀、運動、寫作節奏的人；帶團隊做流程設計的人。\n\n可跳過：已實踐 GTD／習慣追蹤多年、只想要學術深度的讀者。\n\n我的做法：只實作「習慣堆疊」一週，比整本畫線更有用。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '總評', x: 110, y: 35, color: '#2563eb' },
          { id: 'k2', label: '論點', x: 50, y: 90, color: '#059669' },
          { id: 'k3', label: '局限', x: 170, y: 90, color: '#e11d48' },
          { id: 'k4', label: '受眾', x: 110, y: 120, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k1', target: 'k3' },
          { id: 'e3', source: 'k2', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([
        { id: 'q1', text: '你可以只拿走兩樣工具，明天就用。', chapterId: '02' },
      ]),
    }),
  },
  {
    id: 'interview-profile',
    name: '人物專訪',
    genre: '訪談寫作',
    description: '人物側寫：背景、關鍵對話、轉折、金句與結語。',
    icon: '🎙️',
    tag: '專訪',
    themeHint: '人物專訪：場景帶入、對話真實、少恭維、讓讀者聽見對方聲音',
    structureLabel: '專訪架構',
    unitLabel: '節',
    createBook: () => ({
      title: '專訪：獨立書店店主的十年',
      templateId: 'interview-profile',
      genre: '訪談寫作',
      description: '人物專訪範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '開場側寫',
          section: '側寫',
          status: '完成',
          content:
            '星期二下午三點，店裡只有兩位客人。林曉把退回的書一本本撫平書角，動作像在安撫受驚的動物。\n\n「獨立書店的日常，」她笑，「有一半時間在跟灰塵與現金流說話。」\n\n我們約在她開業滿十年的前一週。牆上仍貼著第一張手寫書單，墨水已淡成淺褐。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '對話：為什麼還要開書店',
          section: '訪談',
          status: '草稿',
          content:
            '問：電子書這麼方便，實體店的意義是什麼？\n\n林：方便解決的是取得，不是相遇。有人是來找一本書，有人是來找一個不被催促的角落。我們賣的其實是「被允許慢慢挑」的權利。\n\n問：這十年最難的一次？\n\n林：疫情。不是沒客人，是不知道「下次」還有沒有。那時我每天只做一件事：把櫥窗換新。像在跟街上說：我們還在。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '轉折與日常方法',
          section: '方法',
          status: '待寫',
          content:
            '她把選書標準寫在一張 A5 紙上，只三條：\n1. 我會推薦給朋友嗎？\n2. 放三年後還站得住嗎？\n3. 有沒有本地作者的位置？\n\n「不追求齊全，」她說，「追求可辯護。」',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '金句與結尾',
          section: '結尾',
          status: '待寫',
          content:
            '臨走前她送我一張書籤，背面印著：「讀完可以還來，人走了位子留給下一個。」\n\n店門外，捷運聲蓋過風鈴。她揮揮手，轉身又去撫平另一本書角。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '人物', x: 110, y: 40, color: '#2563eb' },
          { id: 'k2', label: '場景', x: 45, y: 90, color: '#059669' },
          { id: 'k3', label: '對話', x: 175, y: 90, color: '#7c3aed' },
          { id: 'k4', label: '金句', x: 110, y: 120, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k2', target: 'k1' },
          { id: 'e2', source: 'k1', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([
        { id: 'q1', text: '我們賣的其實是「被允許慢慢挑」的權利。', chapterId: '02' },
      ]),
    }),
  },
  {
    id: 'email-newsletter',
    name: '電子報',
    genre: '電子報',
    description: '主旨、開場、一個重點、資源連結、結尾簽名的電子報範例。',
    icon: '✉️',
    tag: '電子報',
    themeHint: '電子報：主旨清楚、單一重點、可掃讀、結尾有溫暖但不囉嗦',
    structureLabel: '電子報架構',
    unitLabel: '區塊',
    createBook: () => ({
      title: '電子報：每週一封給創作者',
      templateId: 'email-newsletter',
      genre: '電子報',
      description: '創作向電子報範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '主旨列（Subject）',
          section: '主旨',
          status: '完成',
          content:
            '候選主旨：\nA. 本週只寫 200 字，反而寫完一章\nB. 別再找「完美時段」了\nC. 一個讓我少熬夜的寫作節奏\n\n建議：A（具體成果 + 好奇）',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '開場問候 + 鉤子',
          section: '開頭',
          status: '草稿',
          content:
            '嗨，我是小安。\n\n這週我把「每天寫 2000 字」改成「每天寫 200 字且不可刪」。結果三天後，我反而有了一整節能用的草稿。\n\n重點不是字少，是停止用「尚未開始」懲罰自己。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '本週一個方法',
          section: '主體',
          status: '草稿',
          content:
            '方法名稱：地板字數（Floor Words）\n\n規則：\n1. 設定低到可笑的最低字數（例如 200）\n2. 達標前不准開社群\n3. 達標後可停，也可繼續\n\n為什麼有效：它把「身份」從完美主義者，暫時改成「有出現的人」。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '資源 + 結尾',
          section: '結尾',
          status: '待寫',
          content:
            '延伸：\n- 我用的計時：25 分鐘專注／5 分鐘走離螢幕\n- 上週讀者分享的一句話：「寫很差的草稿，也比空白高貴。」\n\n若這封信對你有用，轉寄給一位正在卡關的朋友即可。\n\n下週見，\n小安',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '主旨', x: 50, y: 50, color: '#2563eb' },
          { id: 'k2', label: '單一重點', x: 140, y: 40, color: '#059669' },
          { id: 'k3', label: '方法', x: 180, y: 95, color: '#7c3aed' },
          { id: 'k4', label: 'CTA', x: 90, y: 115, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([{ id: 'q1', text: '寫很差的草稿，也比空白高貴。', chapterId: '04' }]),
    }),
  },
  {
    id: 'case-study',
    name: '案例研究',
    genre: '商業案例',
    description: '背景、挑戰、行動、結果、可複製教訓的案例文範例。',
    icon: '📊',
    tag: '案例',
    themeHint: '案例研究：數據與敘事並存、過程可學、避免只報喜',
    structureLabel: '案例架構',
    unitLabel: '節',
    createBook: () => ({
      title: '案例：小型工作室三個月提升開信率',
      templateId: 'case-study',
      genre: '商業案例',
      description: '商業案例寫作範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '背景與目標',
          section: '背景',
          status: '完成',
          content:
            '客戶：一人公司知識型創作者（訂閱數約 4,200）\n期間：12 週\n起點：平均開信率 18%、點擊率 2.1%\n目標：開信率 ≥ 28%，且退訂率不升高',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '挑戰診斷',
          section: '挑戰',
          status: '草稿',
          content:
            '診斷發現三件事：\n1. 主旨像公告（「第 48 期電子報」）而非利益\n2. 寄送時間固定在訂閱者通勤最忙的時段\n3. 前兩段都在自我介紹，重點太晚出現\n\n假設：把「承諾」提前，比增加發送頻率更有效。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '採取的行動',
          section: '行動',
          status: '草稿',
          content:
            '第 1–2 週：A/B 測試主旨（利益句 vs 好奇句）\n第 3–6 週：開場改為「一句結論 + 為什麼重要」\n第 7–12 週：依開啟熱區調整寄送時段；每封只放一個 CTA\n\n同時停掉「硬塞三個連結」的舊模板。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '結果與可複製教訓',
          section: '結果',
          status: '待寫',
          content:
            '結果（第 12 週移動平均）：\n- 開信率 18% → 31%\n- 點擊率 2.1% → 4.4%\n- 退訂率大致持平（0.4% → 0.35%）\n\n教訓：\n1. 主旨寫「讀者能得到什麼」\n2. 前 50 字決定去留\n3. 少即是多：一個 CTA 勝過三個選項\n\n局限：樣本為單一產業，外推需謹慎。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '目標', x: 110, y: 35, color: '#2563eb' },
          { id: 'k2', label: '診斷', x: 45, y: 90, color: '#e11d48' },
          { id: 'k3', label: '實驗', x: 175, y: 90, color: '#059669' },
          { id: 'k4', label: '結果', x: 110, y: 120, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([{ id: 'q1', text: '前 50 字決定去留。', chapterId: '04' }]),
    }),
  },
  {
    id: 'social-thread',
    name: '社群串文',
    genre: '社群內容',
    description: 'Threads／X 風格：鉤子推文 + 展開要點 + 結尾互動。',
    icon: '💬',
    tag: '社群',
    themeHint: '社群串文：鉤子強、一則一重點、可掃讀、結尾引導留言',
    structureLabel: '串文架構',
    unitLabel: '則',
    createBook: () => ({
      title: '串文：新手寫作 7 個省力技巧',
      templateId: 'social-thread',
      genre: '社群內容',
      description: '社群串文範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '1/ 鉤子',
          section: '鉤子',
          status: '完成',
          content:
            '寫作最耗的不是文筆，是「決定寫什麼」。\n\n我把選擇成本砍掉之後，產能差不多翻倍。\n\n下面 7 個技巧，都是為了少做決策👇',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '2–4/ 技巧前半',
          section: '展開',
          status: '草稿',
          content:
            '2/ 先寫標題候選 10 個，再寫內文。標題是承諾，內文是兌現。\n\n3/ 用「對誰 + 什麼改變」定義一篇，而不是主題名詞。\n壞：談專注力\n好：給遠距工作者的 25 分鐘重啟法\n\n4/ 收集箱與寫作箱分開。靈感進收集箱；寫作時只開一個檔案。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '5–7/ 技巧後半',
          section: '展開',
          status: '草稿',
          content:
            '5/ 地板字數：低到不可能失敗（例如 150 字）。\n\n6/ 完成後才修辭。草稿階段禁止改第一段超過兩次。\n\n7/ 每篇只服務一個讀者問題。想講第二個？開下一篇。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '結尾 CTA',
          section: '互動',
          status: '待寫',
          content:
            '你目前卡在哪一環：選題、開寫，還是修改？\n\n回覆一個字就好：選 / 寫 / 修\n我下週依最多人的痛點寫長文。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '鉤子', x: 60, y: 50, color: '#e11d48' },
          { id: 'k2', label: '清單', x: 140, y: 40, color: '#2563eb' },
          { id: 'k3', label: '互動', x: 160, y: 110, color: '#059669' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
        ],
      ),
      goldenQuotes: quotes([
        { id: 'q1', text: '寫作最耗的不是文筆，是決定寫什麼。', chapterId: '01' },
      ]),
    }),
  },
  {
    id: 'business-proposal',
    name: '企劃／提案',
    genre: '商務寫作',
    description: '問題、方案、時程、預算、風險與下一步的提案範例。',
    icon: '📁',
    tag: '提案',
    themeHint: '商務提案：問題具體、方案可執行、數字清楚、風險誠實',
    structureLabel: '提案架構',
    unitLabel: '節',
    createBook: () => ({
      title: '提案：品牌內容經營季度計畫',
      templateId: 'business-proposal',
      genre: '商務寫作',
      description: '企劃提案範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '摘要（給忙碌決策者）',
          section: '摘要',
          status: '完成',
          content:
            '目標：90 天內將官網博客月訪提升 40%，並產出 12 篇可複用長文。\n做法：雙週主題叢集 + 一條產品故事主線。\n投資：內容製作 18 萬、設計 4 萬、推廣 8 萬。\n風險：審稿延遲；已規劃凍結檔與備援題。\n請求：本週確認主題清單與窗口。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '問題與機會',
          section: '問題',
          status: '草稿',
          content:
            '現況：內容發佈不穩、關鍵字重疊、轉換路徑不清。\n機會：搜尋需求存在，但落地頁敘事與文章脫節。\n成功定義：自然流量、訂閱、諮詢表單三指標同時改善。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '方案與時程',
          section: '方案',
          status: '草稿',
          content:
            'Phase A（第 1–2 週）：訪談、關鍵字、訊息架構\nPhase B（第 3–10 週）：每週 1–2 篇長文 + 社群切片\nPhase C（第 11–12 週）：复盤、選出 3 篇加碼推廣\n\n交付物：內容日曆、12 篇定稿、成效報告。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '預算、風險、下一步',
          section: '商務',
          status: '待寫',
          content:
            '預算明細：（人力／外包／廣告）\n風險：\n- 審稿 > 5 天 → 啟用備援題\n- 素材不足 → 第 1 週完成素材清單簽核\n\n下一步：\n1. 確認本提案\n2. 指定對接人\n3. 啟動 kickoff（90 分鐘）',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '問題', x: 50, y: 70, color: '#e11d48' },
          { id: 'k2', label: '方案', x: 120, y: 40, color: '#2563eb' },
          { id: 'k3', label: '預算', x: 180, y: 80, color: '#d97706' },
          { id: 'k4', label: '風險', x: 110, y: 115, color: '#7c3aed' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k2', target: 'k4' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  {
    id: 'children-story',
    name: '兒童故事',
    genre: '兒童文學',
    description: '重複句式、明確情緒、溫柔轉折的低幼／兒童故事範例。',
    icon: '🌈',
    tag: '兒童',
    themeHint: '兒童故事：句短、畫面清楚、重複有節奏、結尾安全而温暖',
    structureLabel: '故事架構',
    unitLabel: '頁',
    createBook: () => ({
      title: '小雲找到勇氣',
      templateId: 'children-story',
      genre: '兒童文學',
      description: '兒童故事範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '小雲很擔心',
          section: '起',
          status: '完成',
          content:
            '小雲是一朵小小的雲。\n\n別的雲都會變出雨，小雲卻只會變出很小很小的水滴。\n\n「我不行。」小雲說。\n風聽了，輕輕推了它一下：「我們去看看。」',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '路上遇見朋友',
          section: '承',
          status: '草稿',
          content:
            '它們遇見一棵口渴的小樹。\n小樹的葉子軟軟的。\n\n小雲想幫忙，可是水滴太少了。\n\n小樹說：「一點點也可以。慢慢來。」',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '試一次就好',
          section: '轉',
          status: '草稿',
          content:
            '小雲吸了一大口氣。\n先掉一滴。\n再掉一滴。\n\n小樹的葉子亮了一點點。\n螞蟻抬起頭，像在說謝謝。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '原來夠了',
          section: '合',
          status: '待寫',
          content:
            '傍晚，風問：「還覺得自己不行嗎？」\n\n小雲看看小樹，又看看自己的影子。\n\n「我可以一點一點地行。」小雲說。\n\n天上的晚霞聽了，對它笑了。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '主角', x: 100, y: 40, color: '#2563eb' },
          { id: 'k2', label: '擔心', x: 40, y: 90, color: '#e11d48' },
          { id: 'k3', label: '幫助', x: 170, y: 90, color: '#059669' },
          { id: 'k4', label: '成長', x: 100, y: 120, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([{ id: 'q1', text: '我可以一點一點地行。', chapterId: '04' }]),
    }),
  },
  {
    id: 'op-ed',
    name: '專欄／社論',
    genre: '意見專欄',
    description: '公共議題立場文：現象、論證、反方、政策／行動建議。',
    icon: '🏛️',
    tag: '社論',
    themeHint: '專欄社論：立場明確、論證可檢驗、處理反方、建議具體',
    structureLabel: '專欄架構',
    unitLabel: '段',
    createBook: () => ({
      title: '專欄：城市需要「安靜的公共空間」',
      templateId: 'op-ed',
      genre: '意見專欄',
      description: '意見專欄範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '現象切入',
          section: '開頭',
          status: '完成',
          content:
            '捷運車廂裡人人戴著耳機，公園長椅卻越來越少人願意多坐五分鐘。\n\n我們並不缺乏娛樂，我們缺乏「不必消費也能停留」的地方。當城市把每一平方公尺都計價，安靜就變成奢侈品。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '論證',
          section: '論證',
          status: '草稿',
          content:
            '公共空間的價值不只是美觀，而是社會修補：讓不同節奏的人共用同一片陰影。研究反覆指出，可及的綠地與低刺激環境，與壓力指標、鄰里信任相關。\n\n若只打造打卡景點，我們得到的是流量，不是共同生活。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '處理反方',
          section: '反方',
          status: '待寫',
          content:
            '反方會說：維護要錢；空地應用來蓋宅。\n\n的確。但短期土地收益，不該自動壓過長期公共衛生與社會成本。預算可以分級：不是每座公園都要網美級設施，有時一把乾淨的長椅、一排遮蔭就夠。',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '建議與收束',
          section: '建議',
          status: '待寫',
          content:
            '三個可執行方向：\n1. 既有校園／機關離峰開放安靜角\n2. 新建案強制留設「無消費停留帶」\n3. 以使用時數而非打卡數評估空間成效\n\n城市的文明，有時不是更快，而是允許人慢下來而不感到抱歉。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '現象', x: 50, y: 60, color: '#2563eb' },
          { id: 'k2', label: '論證', x: 130, y: 40, color: '#059669' },
          { id: 'k3', label: '反方', x: 180, y: 95, color: '#e11d48' },
          { id: 'k4', label: '建議', x: 90, y: 115, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k2', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([
        {
          id: 'q1',
          text: '城市的文明，有時不是更快，而是允許人慢下來而不感到抱歉。',
          chapterId: '04',
        },
      ]),
    }),
  },
  {
    id: 'meeting-notes',
    name: '會議紀錄',
    genre: '職場文件',
    description: '議程、決議、待辦、負責人與期限的會議紀錄範例。',
    icon: '📝',
    tag: '職場',
    themeHint: '會議紀錄：決議清楚、待辦可追蹤、避免流水帳',
    structureLabel: '紀錄架構',
    unitLabel: '段',
    createBook: () => ({
      title: '會議紀錄：內容產品雙週會',
      templateId: 'meeting-notes',
      genre: '職場文件',
      description: '會議紀錄範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '會議資訊',
          section: '資訊',
          status: '完成',
          content:
            '時間：2026-08-02 14:00–14:45\n出席：Amina（主持）、Ken、Rita、我\n缺席：—\n目的：確認 Q3 內容主題與發布節奏',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '討論摘要',
          section: '討論',
          status: '草稿',
          content:
            '1. 上雙週數據：教學文 CTR 高於觀點文\n2. 主題候選：遠距協作、AI 寫作邊界、新手作品集\n3. 風險：設計資源不足，可能影響封面產出',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '決議',
          section: '決議',
          status: '草稿',
          content:
            '決議 1：Q3 主軸定為「遠距工作者的深度工作」\n決議 2：每週三固定發 1 篇長文；週五發社群切片\n決議 3：封面改用模板化版型，降低設計依賴',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '待辦（Action Items）',
          section: '待辦',
          status: '待寫',
          content:
            '| 待辦 | 負責人 | 期限 |\n| 產出 8 月題目表 | Rita | 08-05 |\n| 設計長文封面模板 | Ken | 08-07 |\n| 更新風格指南（AI 引用規範） | 我 | 08-06 |\n\n下次會議：2026-08-16 14:00',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '議題', x: 60, y: 50, color: '#2563eb' },
          { id: 'k2', label: '決議', x: 150, y: 40, color: '#059669' },
          { id: 'k3', label: '待辦', x: 160, y: 110, color: '#d97706' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
        ],
      ),
      goldenQuotes: [],
    }),
  },
  {
    id: 'sci-fi-flash',
    name: '科幻極短篇',
    genre: '科幻虛構',
    description: '一個概念、一個轉折、一個余味的 500–800 字科幻範例。',
    icon: '🚀',
    tag: '科幻',
    themeHint: '科幻極短篇：一個 speculative 核心、人物仍要有欲望、結尾留問題',
    structureLabel: '故事架構',
    unitLabel: '段',
    createBook: () => ({
      title: '記憶回收日',
      templateId: 'sci-fi-flash',
      genre: '科幻虛構',
      description: '科幻極短篇範例',
      chapters: [
        chapter({
          id: '01',
          chapter: '01',
          title: '設定一槍打完',
          section: '設定',
          status: '完成',
          content:
            '在這個城市，遺忘要付費，記得卻免費。\n\n每到月初，市政廳開放「記憶回收窗口」。你把不想要的片段存進玻璃管，換取稅金折抵。據說最熱門的是後悔與失眠。',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '人物與選擇',
          section: '衝突',
          status: '草稿',
          content:
            '我排到第三十七號，手心全是汗。管子裡是去年冬天——她轉身離開的那晚。\n\n櫃檯後的職員掃了條碼：「品質良好，可折抵 120 點。確認清除？」\n\n清除鍵是綠色的，像在說這是健康的選擇。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '轉折',
          section: '轉折',
          status: '草稿',
          content:
            '我按下去前，職員忽然停手：「等等。系統顯示這段記憶裡有『未結案的承諾』。」\n\n「什麼意思？」\n\n「意思是，」她把管子轉到燈光下，液體裡浮起一行很小的字，「有人在另一端，還在等你記得。」',
        }),
        chapter({
          id: '04',
          chapter: '04',
          title: '余味',
          section: '結尾',
          status: '待寫',
          content:
            '我把管子收回口袋。走出市政廳時，廣告螢幕仍在播：忘記，讓生活更輕。\n\n口袋裡的玻璃管轻轻撞击鑰匙，像一句還沒被清除的問句。',
        }),
      ],
      knowledgeGraph: graph(
        [
          { id: 'k1', label: '設定', x: 55, y: 55, color: '#7c3aed' },
          { id: 'k2', label: '代價', x: 150, y: 40, color: '#e11d48' },
          { id: 'k3', label: '轉折', x: 175, y: 100, color: '#2563eb' },
          { id: 'k4', label: '余味', x: 90, y: 115, color: '#059669' },
        ],
        [
          { id: 'e1', source: 'k1', target: 'k2' },
          { id: 'e2', source: 'k2', target: 'k3' },
          { id: 'e3', source: 'k3', target: 'k4' },
        ],
      ),
      goldenQuotes: quotes([{ id: 'q1', text: '遺忘要付費，記得卻免費。', chapterId: '01' }]),
    }),
  },
];

export const WRITING_TEMPLATES: readonly WritingTemplate[] = TEMPLATES;

export const DEFAULT_TEMPLATE_ID: TemplateId = 'general-article';

export function getTemplate(id: string | undefined | null): WritingTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function createBookFromTemplate(id: TemplateId | string): Book {
  return getTemplate(id).createBook();
}

export function listTemplates(): WritingTemplate[] {
  return [...TEMPLATES];
}
