// Prompt builders for the note editor AI writing suite.
// Kept out of UI components so the editor stays presentational.

export type NoteAIAction = 'continue' | 'polish' | 'summary' | 'tags' | 'translate';

export interface NoteAIPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function buildNoteAIPrompt(action: NoteAIAction, noteTitle: string, noteContent: string): NoteAIPrompt {
  const title = noteTitle || '未命名笔记';

  switch (action) {
    case 'continue':
      return {
        systemPrompt:
          '你是一位高水平资深知识博主与严谨思考者。请根据用户提供的笔记标题与已有正文，进行深度连贯、逻辑缜密、文字优美的 Markdown 续写与细节延展。直接输出续写的 Markdown 正文，切勿包含任何寒暄或客套说明。',
        userPrompt: `请基于以下已有笔记内容进行自然深入的续写与拓展：\n\n【笔记标题】：${title}\n【已有正文】：\n${noteContent}`,
      };
    case 'polish':
      return {
        systemPrompt:
          '你是一位顶级中文编辑与 Markdown 排版美学大师。请对用户提供的笔记进行文笔打磨、行文结构梳理、段落节奏优化与排版美化，提升专业度与可读性。保留原文全部核心论据与要点，直接输出润色后的全新完整 Markdown 文本，切勿包含多余寒暄。',
        userPrompt: `请对以下笔记进行全面文笔润色与优美排版：\n\n【笔记标题】：${title}\n【原始正文】：\n${noteContent}`,
      };
    case 'summary':
      return {
        systemPrompt:
          '你是一位敏锐高效的思维导图与速读专家。请提炼出用户笔记的核心要点摘要，整理为 3~5 条条理分明、高度浓缩的 Markdown 关键 Takeaways 列表，附带简明行动启示。直接输出列表文本，切勿包含多余寒暄。',
        userPrompt: `请从以下笔记正文中提取核心精髓与关键要点：\n\n【笔记标题】：${title}\n【笔记正文】：\n${noteContent}`,
      };
    case 'tags':
      return {
        systemPrompt:
          '你是一位专业的内容分类与标签专家。请根据用户的笔记标题与正文，提炼出 3~5 个最精准、简明、高价值的标签词，用逗号隔开输出，例如："React19, 前端架构, 并发模式, 性能优化"。不要输出任何多余的解释。',
        userPrompt: `请为以下笔记提取最合适的标签关键词：\n\n【笔记标题】：${title}\n【笔记正文】：\n${noteContent}`,
      };
    case 'translate':
    default:
      return {
        systemPrompt:
          '你是一位精通中英双语的专业翻译专家。若用户笔记主要为中文，请将其精准翻译为专业、优雅的英文 Markdown；若为英文则翻译为地道流利的中文 Markdown。直接输出翻译后的正文，保留所有原始排版标记。',
        userPrompt: `请对以下笔记进行高质量互译：\n\n【笔记正文】：\n${noteContent}`,
      };
  }
}

export const NOTE_AI_ACTION_META: Record<
  NoteAIAction,
  { label: string; completion: 'replace' | 'append' | 'appendSummary' | 'fillTags' }
> = {
  continue: { label: '续写', completion: 'append' },
  polish: { label: '润色', completion: 'replace' },
  summary: { label: '提炼要点', completion: 'appendSummary' },
  tags: { label: '取标签', completion: 'fillTags' },
  translate: { label: '互译', completion: 'replace' },
};
