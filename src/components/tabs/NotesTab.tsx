import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NoteItem, AccentColor } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { GeneratedNoteOutput } from '../../utils/ai';
import { Screen, Chip, Button, EmptyState } from '../ui';
import { Search, X, PenLine, Plus, StickyNote } from 'lucide-react';
import { NoteCard } from '../notes/NoteCard';
import { NoteEditor } from '../notes/NoteEditor';
import { AINoteSheet } from '../notes/AINoteSheet';

/** Hard cap for one render pass — very large lists expand on demand. */
const LIST_RENDER_CAP = 100;

interface NotesTabProps {
  notes: NoteItem[];
  onUpdateNotes: (newNotes: NoteItem[]) => void;
  accentColor: AccentColor;
  onSwitchToAITab?: () => void;
}

const CATEGORIES = ['all', '指南', '工作', '学习', '生活', '灵感', '代码'];

export const NotesTab: React.FC<NotesTabProps> = ({ notes, onUpdateNotes, onSwitchToAITab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [editorSeed, setEditorSeed] = useState<{ title: string; content: string; category: string; tags: string[] } | null>(null);

  // AI generator
  const [showAINote, setShowAINote] = useState(false);

  const persist = (updated: NoteItem[]) => {
    onUpdateNotes(updated);
    db.saveNotes(updated);
  };

  const filteredNotes = useMemo(
    () =>
      notes
        .filter(note => {
          const matchCat = selectedCategory === 'all' || note.category === selectedCategory;
          const q = deferredSearch.toLowerCase().trim();
          const matchSearch =
            !q ||
            note.title.toLowerCase().includes(q) ||
            note.content.toLowerCase().includes(q) ||
            note.tags.some(t => t.toLowerCase().includes(q));
          return matchCat && matchSearch;
        })
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    [notes, selectedCategory, deferredSearch]
  );

  const [renderAll, setRenderAll] = useState(false);
  const visibleNotes = renderAll ? filteredNotes : filteredNotes.slice(0, LIST_RENDER_CAP);

  const handleToggleFavorite = useCallback(
    (noteId: string) => {
      sound.playTap();
      persist(
        notes.map(n => (n.id === noteId ? { ...n, isFavorite: !n.isFavorite, updatedAt: new Date().toISOString() } : n))
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes]
  );

  const handleTogglePin = useCallback(
    (noteId: string) => {
      sound.playTap();
      persist(
        notes.map(n => (n.id === noteId ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n))
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      haptics.impactMedium();
      sound.playTap();
      persist(notes.filter(n => n.id !== noteId));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes]
  );

  const handleOpenNote = useCallback(
    (noteId: string) => {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      setEditingNote(note);
      setEditorSeed(null);
      setShowEditor(true);
      sound.playTap();
    },
    [notes]
  );

  const handleSaveNote = (draft: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    isPinned: boolean;
    isFavorite: boolean;
  }) => {
    sound.playSuccess();
    if (editingNote) {
      persist(
        notes.map(n =>
          n.id === editingNote.id
            ? { ...n, ...draft, updatedAt: new Date().toISOString() }
            : n
        )
      );
    } else {
      const newNote: NoteItem = {
        id: 'n_' + Date.now(),
        ...draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist([newNote, ...notes]);
    }
    setShowEditor(false);
    setEditingNote(null);
    setEditorSeed(null);
  };

  const handleAdoptAINote = (result: GeneratedNoteOutput) => {
    sound.playSuccess();
    const newNote: NoteItem = {
      id: 'n_' + Date.now(),
      title: result.title,
      content: result.content,
      category: result.category,
      tags: result.tags,
      isPinned: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist([newNote, ...notes]);
    setShowAINote(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden cat-bg-canvas">
      <Screen className="max-w-3xl mx-auto w-full">
        {/* Search + actions */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索标题、正文、标签…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-sub rounded-full bg-surface border border-line text-ink placeholder:text-ink-3 outline-none focus:ring-2 ring-accent/40 shadow-elev-1 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-surface-2 text-ink-3 hover:text-ink tactile-press"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button variant="soft" size="md" onClick={() => setShowAINote(true)} haptic="medium" title="帮我写笔记">
            <PenLine className="w-4 h-4" />
            <span>帮我写</span>
          </Button>
          <Button
            variant="primary"
            size="icon"
            haptic="medium"
            onClick={() => {
              setEditingNote(null);
              setEditorSeed(null);
              setShowEditor(true);
            }}
            title="新建笔记"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </Button>
        </div>

        {/* Category chips */}
        <div className="-mx-4 px-4 flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
          {CATEGORIES.map(cat => (
            <Chip key={cat} selected={selectedCategory === cat} onClick={() => setSelectedCategory(cat)}>
              {cat === 'all' ? '全部' : cat}
            </Chip>
          ))}
        </div>

        {/* Notes grid */}
        {filteredNotes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={searchQuery ? '没有匹配的笔记' : '这里还没有笔记'}
            hint="记录点滴灵感与生活火花，也可以让 AI 帮你起笔"
            actionLabel="写第一条笔记"
            onAction={() => {
              setEditingNote(null);
              setEditorSeed(null);
              setShowEditor(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <AnimatePresence>
              {visibleNotes.map((note, idx) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={{
                    type: 'spring', stiffness: 420, damping: 36,
                    delay: Math.min(idx * 0.04, 0.28),
                  }}
                >
                  <NoteCard
                    note={note}
                    onOpen={handleOpenNote}
                    onTogglePin={handleTogglePin}
                    onToggleFavorite={handleToggleFavorite}
                    onDelete={handleDeleteNote}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {!renderAll && filteredNotes.length > LIST_RENDER_CAP && (
              <button
                onClick={() => setRenderAll(true)}
                className="col-span-full w-full py-3 text-caption font-semibold text-ink-2 bg-surface border border-line rounded-2xl tactile-press"
              >
                显示全部 {filteredNotes.length} 条
              </button>
            )}
          </div>
        )}
      </Screen>

      {/* Editor */}
      <NoteEditor
        isOpen={showEditor}
        editingNote={editingNote}
        seed={editorSeed}
        onClose={() => {
          setShowEditor(false);
          setEditingNote(null);
          setEditorSeed(null);
        }}
        onSave={handleSaveNote}
      />

      {/* AI note creator */}
      <AINoteSheet
        isOpen={showAINote}
        onClose={() => setShowAINote(false)}
        onAdopt={handleAdoptAINote}
        onOpenInEditor={result => {
          setShowAINote(false);
          setEditingNote(null);
          setEditorSeed({ title: result.title, content: result.content, category: result.category, tags: result.tags });
          setShowEditor(true);
        }}
        onGoToAISettings={() => onSwitchToAITab?.()}
      />
    </div>
  );
};
