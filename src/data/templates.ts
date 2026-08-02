/**
 * Writing project templates — multi-genre article / book starters.
 * Finance is one option among many; default is general article writing.
 */

import type { Book, Chapter, KnowledgeGraphData, GoldenQuote } from '../types';

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
  | 'travel-story';

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
  partial: Omit<Chapter, 'added' | 'deleted' | 'retention' | 'rewrite' | 'lastSaved' | 'wordCount'> & {
    wordCount?: number;
    added?: number;
    deleted?: number;
    retention?: number;
    rewrite?: number;
  }
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
  edges: Array<{ id: string; source: string; target: string }>
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
            '用一個具體場景、問題或數據抓住讀者。\n\n說明本文要回答的核心問題，以及讀者讀完後能帶走什麼。',
          inspirationNotes: '開場可用故事、反常識觀點或近期事件',
        }),
        chapter({
          id: '02',
          chapter: '02',
          title: '主體：三個關鍵論點',
          section: '主體',
          status: '待寫',
          content: '論點一：…\n\n論點二：…\n\n論點三：…\n\n每個論點搭配例子或證據。',
        }),
        chapter({
          id: '03',
          chapter: '03',
          title: '收束：行動與下一步',
          section: '結尾',
          status: '待寫',
          content: '總結核心訊息，給讀者一個可執行的下一步或開放式思考。',
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
        ]
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
          content: '財務自由不是單一事件，而是一系列可重複的條件累積。\n\n心態、能力、資產、系統，四層結構。',
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
        ]
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
        ]
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
        ]
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
        ]
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
        ]
      ),
      goldenQuotes: quotes([{ id: 'q1', text: '文案不是寫產品，是寫讀者變好的樣子。', chapterId: '01' }]),
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
        ]
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
        ]
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
        ]
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
        ]
      ),
      goldenQuotes: [],
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
