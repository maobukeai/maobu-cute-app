import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Square, CheckSquare, FileText } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center py-12 text-center text-ink-3">
        <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mb-2">
          <FileText className="w-5 h-5 text-ink-3" strokeWidth={1.8} />
        </div>
        <p className="text-xs font-medium">暂无内容预览</p>
        <p className="text-caption mt-1 text-ink-3/80">在编辑模式输入 Markdown 语法即可实时呈现排版效果</p>
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
            <span key={i} className="my-2 block max-w-full rounded-xl overflow-hidden shadow-xs border border-line dark:border-line">
              <img
                src={match[2]}
                alt={match[1] || '图片'}
                className="max-h-60 w-auto object-contain rounded-xl"
                loading="lazy"
              />
              {match[1] && (
                <span className="block text-center text-caption text-ink-3 py-1 bg-zinc-50 dark:bg-surface-2/50">
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
            className="px-1.5 py-0.5 mx-0.5 text-caption font-mono rounded-md bg-surface-2 dark:bg-surface-2 text-rose-500 dark:text-rose-400 border border-line/60 dark:border-line/60"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold: **bold**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
        return (
          <strong key={i} className="font-bold text-ink dark:text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic: *italic*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 1) {
        return (
          <em key={i} className="italic text-ink-2">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Strike: ~~strike~~
      if (part.startsWith('~~') && part.endsWith('~~') && part.length > 3) {
        return (
          <del key={i} className="line-through text-ink-3">
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
            className="my-3 rounded-xl overflow-hidden border border-line dark:border-line bg-surface-2 text-zinc-100 font-mono text-xs shadow-xs"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-surface-2 border-b border-line/60 text-caption text-ink-3">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                {codeLang && <span className="ml-2 font-mono uppercase text-ink-3 font-semibold">{codeLang}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(currentCode, currentIndex)}
                className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-surface-2 text-ink-3 transition"
                title="复制代码"
              >
                {copiedIndex === currentIndex ? (
                  <>
                    <Check className="w-3 h-3 text-accent" />
                    <span className="text-caption text-accent">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-caption">复制</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto leading-relaxed text-caption select-text">
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
        <hr key={`hr-${idx}`} className="my-4 border-t border-line dark:border-line" />
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h1
          key={`h1-${idx}`}
          className="text-lg sm:text-xl font-black text-ink dark:text-zinc-50 mt-4 mb-2 pb-1.5 border-b border-line dark:border-line flex items-center space-x-1.5"
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
          className="text-base sm:text-lg font-bold text-ink dark:text-zinc-100 mt-3.5 mb-1.5 flex items-center space-x-1.5"
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
          className="text-sm sm:text-base font-semibold text-accent mt-3 mb-1"
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
          className="text-xs sm:text-sm font-semibold text-ink-2 mt-2.5 mb-1"
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
          className="my-2 pl-3.5 py-1.5 pr-3 rounded-r-xl border-l-[3px] border-accent bg-surface-2/60 text-xs text-ink-2 italic shadow-2xs"
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
            onToggleTodo ? 'cursor-pointer hover:bg-surface-2' : ''
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {isDone ? (
              <CheckSquare className="w-4 h-4 text-accent transition-transform active:scale-90" />
            ) : (
              <Square className="w-4 h-4 text-ink-3 group-hover:text-ink-2 transition-transform active:scale-90" />
            )}
          </div>
          <div
            className={`text-xs leading-relaxed flex-1 select-text ${
              isDone
                ? 'line-through text-ink-3'
                : 'text-ink'
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
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
          <span className="text-ink flex-1 select-text">
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
          <span className="font-mono text-caption font-bold text-ink-3 shrink-0 w-4 text-right">
            {num}.
          </span>
          <span className="text-ink flex-1 select-text">
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

    // Table (e.g. | col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && !inCodeBlock) {
      const nextLine = lines[idx + 1]?.trim() || '';
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(nextLine)) {
        const headerCells = trimmed
          .slice(1, -1)
          .split('|')
          .map(c => c.trim());
        const alignMatch = nextLine.slice(1, -1).split('|').map(s => {
          const t = s.trim();
          if (t.startsWith(':') && t.endsWith(':')) return 'center';
          if (t.endsWith(':')) return 'right';
          return 'left';
        });

        idx += 1; // skip separator
        const rows: string[][] = [];
        while (idx + 1 < lines.length) {
          const nextRow = lines[idx + 1].trim();
          if (nextRow.startsWith('|') && nextRow.endsWith('|')) {
            idx++;
            rows.push(nextRow.slice(1, -1).split('|').map(c => c.trim()));
          } else {
            break;
          }
        }

        blocks.push(
          <div key={`table-${idx}`} className="my-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-2 text-ink-2 font-semibold">
                <tr>
                  {headerCells.map((h, hi) => (
                    <th key={hi} className="px-3 py-2 border-b border-line" style={{ textAlign: (alignMatch[hi] || 'left') as any }}>
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-surface-2/40">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-ink" style={{ textAlign: (alignMatch[ci] || 'left') as any }}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Standard paragraph
    blocks.push(
      <p
        key={`p-${idx}`}
        className="my-1.5 text-xs sm:text-sm text-ink leading-relaxed select-text"
      >
        {renderInline(rawLine)}
      </p>
    );
  }

  // If stream ended inside a code block or hasn't closed the backticks yet, flush buffer
  if (inCodeBlock && codeBuffer.length > 0) {
    const currentCode = codeBuffer.join('\n');
    const currentIndex = codeBlockIndex;
    blocks.push(
      <div
        key="code-unclosed"
        className="my-3 rounded-xl overflow-hidden border border-line dark:border-line bg-surface-2 text-zinc-100 font-mono text-xs shadow-xs"
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-2 border-b border-line/60 text-caption text-ink-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
            {codeLang && <span className="ml-2 font-mono uppercase text-ink-3 font-semibold">{codeLang}</span>}
          </div>
          <button
            type="button"
            onClick={() => handleCopyCode(currentCode, currentIndex)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-surface-2 text-ink-3 transition"
            title="复制代码"
          >
            {copiedIndex === currentIndex ? (
              <>
                <Check className="w-3 h-3 text-accent" />
                <span className="text-caption text-accent">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-caption">复制</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3 overflow-x-auto leading-relaxed text-caption select-text">
          <code>{currentCode}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={`space-y-0.5 font-sans animate-fade-in ${className}`}>
      {blocks}
    </div>
  );
};
