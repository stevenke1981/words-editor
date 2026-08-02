// Data models based on spec.md — multi-genre writing projects

export interface Chapter {
  id: string;
  chapter: string;
  title: string;
  section: string;
  status: '完成' | '草稿' | '待寫';
  content: string;
  wordCount: number;
  added: number;
  deleted: number;
  retention: number; // 0-100
  rewrite: number; // 0-100 percent
  lastSaved: string;
  inspirationNotes?: string;
  references?: Array<{ date: string; title: string }>;
  illustration?: string;
}

export interface GoldenQuote {
  id: string;
  text: string;
  chapterId?: string;
  createdAt: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'chapter' | 'entity';
  x: number;
  y: number;
  color?: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/** A writing project (book, article series, long-form piece, etc.) */
export interface Book {
  title: string;
  /** Template used to bootstrap this project */
  templateId?: string;
  /** Genre label, e.g. 一般寫作 / 技術文件 / 財經非虛構 */
  genre?: string;
  /** Short project blurb */
  description?: string;
  chapters: Chapter[];
  knowledgeGraph: KnowledgeGraphData;
  goldenQuotes: GoldenQuote[];
}
