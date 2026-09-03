import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Square, CheckSquare } from 'lucide-react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  onToggleTodo?: (originalLineIndex: number) => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className = '',
  onToggleTodo,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content || !content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-xl">
          📝
        </div>
        <p className="text-xs font-medium">暂无内容预览</p>
        <p className="text-[11px] mt-1 text-zinc-400/80">在编辑模式输入 Markdown 语法即可实时呈现排版效果</p>
      </div>
    );
  }

  // Handle copy code block
  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to parse inline styles: **bold**, *italic*, ~~strike~~, `code`, [link](url), ![img](url)
  const renderInline = (text: string): React.ReactNode => {
    const inlineRegex = /(!?\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g;
    const parts = text.split(inlineRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      // Image: ![alt](url)
      if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
        const match = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (match) {
          return (
            <span key={i} className="my-2 block max-w-full rounded-xl overflow-hidden shadow-xs border border-zinc-200 dark:border-zinc-800">
              <img
                src={match[2]}
                alt={match[1] || '图片'}
                className="max-h-60 w-auto object-contain rounded-xl"
                loading="lazy"
              />
              {match[1] && (
                <span className="block text-center text-[10px] text-zinc-400 py-1 bg-zinc-50 dark:bg-zinc-900/50">
                  {match[1]}
                </span>
              )}
            </span>
          );
        }
      }

      // Link: [text](url)
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          return (
            <a
              key={i}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-0.5 text-blue-500 hover:text-blue-600 hover:underline font-medium"
            >
              <span>{match[1]}</span>
              <ExternalLink className="w-3 h-3 inline ml-0.5 opacity-70" />
            </a>
          );
        }
      }

      // Inline code: `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 text-[11px] font-mono rounded-md bg-zinc-100 dark:bg-zinc-800 text-rose-500 dark:text-rose-400 border border-zinc-200/60 dark:border-zinc-700/60"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold: **bold**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
        return (
          <strong key={i} className="font-bold text-zinc-900 dark:text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic: *italic*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 1) {
        return (
          <em key={i} className="italic text-zinc-700 dark:text-zinc-300">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Strike: ~~strike~~
      if (part.startsWith('~~') && part.endsWith('~~') && part.length > 3) {
        return (
          <del key={i} className="line-through text-zinc-400 dark:text-zinc-500">
            {part.slice(2, -2)}
          </del>
        );
      }

      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  // Split lines and group into blocks (headings, code blocks, lists, blockquotes, paragraphs)
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let codeBlockIndex = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // Code block fences
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const currentCode = codeBuffer.join('\n');
        const currentIndex = codeBlockIndex++;
        blocks.push(
          <div
            key={`code-${idx}`}
            className="my-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 font-mono text-xs shadow-xs"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/80 border-b border-zinc-700/60 text-[11px] text-zinc-400">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                {codeLang && <span className="ml-2 font-mono uppercase text-zinc-300 font-semibold">{codeLang}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(currentCode, currentIndex)}
                className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-zinc-700 text-zinc-300 transition"
                title="复制代码"
              >
                {copiedIndex === currentIndex ? (
                  <>
                    <Check className="w-3 h-3 text-[#07C160]" />
                    <span className="text-[10px] text-[#07C160]">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[10px]">复制</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto leading-relaxed text-[11px] select-text">
              <code>{currentCode}</code>
            </pre>
          </div>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      blocks.push(
        <hr key={`hr-${idx}`} className="my-4 border-t border-zinc-200 dark:border-zinc-800" />
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h1
          key={`h1-${idx}`}
          className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-50 mt-4 mb-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center space-x-1.5"
        >
          <span>{renderInline(trimmed.slice(2))}</span>
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h2
          key={`h2-${idx}`}
          className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-3.5 mb-1.5 flex items-center space-x-1.5"
        >
          <span>{renderInline(trimmed.slice(3))}</span>
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h3-${idx}`}
          className="text-sm sm:text-base font-semibold text-[#07C160] dark:text-[#07C160] mt-3 mb-1"
        >
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      blocks.push(
        <h4
          key={`h4-${idx}`}
          className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-2.5 mb-1"
        >
          {renderInline(trimmed.slice(5))}
        </h4>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ') || trimmed === '>') {
      const quoteText = trimmed.startsWith('> ') ? trimmed.slice(2) : trimmed.slice(1);
      blocks.push(
        <blockquote
          key={`quote-${idx}`}
          className="my-2 pl-3.5 py-1.5 pr-3 rounded-r-xl border-l-[3px] border-[#07C160] bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-700 dark:text-zinc-300 italic shadow-2xs"
        >
          {renderInline(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Task Checklist: - [ ] or - [x]
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isDone = taskMatch[1].toLowerCase() === 'x';
      const taskText = taskMatch[2];
      const currentLineIdx = idx;

      blocks.push(
        <div
          key={`task-${idx}`}
          onClick={() => onToggleTodo && onToggleTodo(currentLineIdx)}
          className={`flex items-start space-x-2 my-1 px-1.5 py-1 rounded-lg transition-colors group ${
            onToggleTodo ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60' : ''
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {isDone ? (
              <CheckSquare className="w-4 h-4 text-[#07C160] transition-transform active:scale-90" />
            ) : (
              <Square className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform active:scale-90" />
            )}
          </div>
          <div
            className={`text-xs leading-relaxed flex-1 select-text ${
              isDone
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-800 dark:text-zinc-200'
            }`}
          >
            {renderInline(taskText)}
          </div>
        </div>
      );
      continue;
    }

    // Unordered List: - or *
    if (/^[-*]\s+/.test(trimmed)) {
      const listText = trimmed.replace(/^[-*]\s+/, '');
      blocks.push(
        <div key={`ul-${idx}`} className="flex items-start space-x-2 my-1 pl-1 text-xs leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-[#07C160] shrink-0 mt-1.5" />
          <span className="text-zinc-800 dark:text-zinc-200 flex-1 select-text">
            {renderInline(listText)}
          </span>
        </div>
      );
      continue;
    }

    // Ordered List: 1. 2. etc.
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const num = olMatch[1];
      const olText = olMatch[2];
      blocks.push(
        <div key={`ol-${idx}`} className="flex items-start space-x-2 my-1 pl-1 text-xs leading-relaxed">
          <span className="font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-500 shrink-0 w-4 text-right">
            {num}.
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 flex-1 select-text">
            {renderInline(olText)}
          </span>
        </div>
      );
      continue;
    }

    // Empty line
    if (!trimmed) {
      blocks.push(<div key={`blank-${idx}`} className="h-2" />);
      continue;
    }

    // Standard paragraph
    blocks.push(
      <p
        key={`p-${idx}`}
        className="my-1.5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed select-text"
      >
        {renderInline(rawLine)}
      </p>
    );
  }

  return (
    <div className={`space-y-0.5 font-sans animate-fade-in ${className}`}>
      {blocks}
    </div>
  );
};
