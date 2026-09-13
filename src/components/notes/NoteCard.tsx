import React from 'react';
import { NoteItem } from '../../types';
import { Pin, Star, Trash2 } from 'lucide-react';
import { SwipeableItem } from '../common/SwipeableItem';
import { motion } from 'motion/react';

interface NoteCardProps {
  note: NoteItem;
  onOpen: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onToggleFavorite: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

/** Memoized: while typing in search only the changed rows re-render. */
export const NoteCard = React.memo<NoteCardProps>(function NoteCard({ note, onOpen, onTogglePin, onToggleFavorite, onDelete }) {
  const snippet = note.content.replace(/[#*`~>-]/g, '').trim();

  return (
    <SwipeableItem
      leftAction={{
        label: note.isPinned ? '取消置顶' : '置顶笔记',
        icon: <Pin className="w-4 h-4 text-white" />,
        colorClass: 'bg-warn text-white',
        onTrigger: () => onTogglePin(note.id),
      }}
      rightActions={[
        {
          label: note.isFavorite ? '取消收藏' : '收藏',
          icon: <Star className="w-3.5 h-3.5 text-white" />,
          colorClass: 'bg-warn text-white',
          onClick: () => onToggleFavorite(note.id),
        },
        {
          label: '删除',
          icon: <Trash2 className="w-3.5 h-3.5 text-white" />,
          colorClass: 'bg-danger text-white',
          onClick: () => onDelete(note.id),
        },
      ]}
      className="rounded-2xl h-full"
    >
      <motion.div
        whileTap={{ scale: 0.985 }}
        onClick={() => onOpen(note.id)}
        className={`bg-surface border rounded-2xl p-4 cursor-pointer h-full flex flex-col transition-shadow hover:shadow-elev-2 ${
          note.isPinned ? 'border-warn/40 shadow-elev-1' : 'border-line shadow-elev-1'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sub font-semibold text-ink leading-snug line-clamp-2 flex-1 min-w-0 break-words">
            {note.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {note.isPinned && <Pin className="w-3.5 h-3.5 text-warn fill-warn" />}
            {note.isFavorite && <Star className="w-3.5 h-3.5 text-warn fill-warn" />}
          </div>
        </div>

        <p className="text-caption text-ink-2 mt-1.5 line-clamp-2 leading-relaxed flex-1">{snippet}</p>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line/70 text-[11px] text-ink-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2 py-0.5 rounded-full bg-surface-2 text-ink-2 font-medium shrink-0">
              {note.category}
            </span>
            <span className="truncate">
              {note.tags.slice(0, 2).map(t => `#${t}`).join(' ')}
            </span>
          </div>
          <span className="shrink-0 ml-2">{note.updatedAt.split('T')[0]}</span>
        </div>
      </motion.div>
    </SwipeableItem>
  );
});