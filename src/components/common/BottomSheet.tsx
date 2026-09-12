import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { haptics } from '../../utils/haptics';
import { sound } from '../../utils/sound';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: string; // e.g. 'max-h-[90dvh]', 'max-h-[85dvh]'
  contentClassName?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  footer,
  maxHeight = 'max-h-[88dvh]',
  contentClassName = '',
  children,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isContentDragRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Mount/Unmount transitions
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setDragOffset(0);
    } else {
      const timer = setTimeout(() => {
        setIsRendered(false);
        setDragOffset(0);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Mobile Virtual Keyboard Avoidance (via visualViewport API)
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const updateKeyboard = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      // Trigger avoidance only if keyboard height exceeds normal OS chrome (> 50px)
      setKeyboardHeight(offset > 50 ? offset : 0);
    };

    vv.addEventListener('resize', updateKeyboard);
    vv.addEventListener('scroll', updateKeyboard);
    updateKeyboard();

    return () => {
      vv.removeEventListener('resize', updateKeyboard);
      vv.removeEventListener('scroll', updateKeyboard);
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    haptics.impactLight();
    sound.playTap();
    onClose();
  }, [onClose]);

  // Touch Drag-to-Close gestures on Header
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startTimeRef.current = Date.now();
    isContentDragRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    if (deltaY > 0) {
      // Dragging down - apply subtle damping
      setDragOffset(deltaY);
    } else {
      // Dragging up past top - high resistance
      setDragOffset(deltaY * 0.15);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const elapsed = Date.now() - startTimeRef.current;
    const currentY = e.changedTouches[0]?.clientY || startYRef.current;
    const deltaY = currentY - startYRef.current;
    const velocity = deltaY / Math.max(1, elapsed);

    // Dismiss if pulled down > 80px or rapid downward flick (> 0.45 px/ms)
    if (dragOffset > 80 || (deltaY > 40 && velocity > 0.45)) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  // Content pull-down handling when at top (scrollTop <= 0)
  const handleContentTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      startTimeRef.current = Date.now();
      isContentDragRef.current = true;
    }
  };

  const handleContentTouchMove = (e: React.TouchEvent) => {
    if (!isContentDragRef.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    if (deltaY > 5 && contentRef.current && contentRef.current.scrollTop <= 0) {
      setIsDragging(true);
      setDragOffset(deltaY * 0.75);
    }
  };

  const handleContentTouchEnd = (e: React.TouchEvent) => {
    if (!isContentDragRef.current) return;
    isContentDragRef.current = false;
    if (isDragging) {
      handleTouchEnd(e);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-250 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-250 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet Modal Container with Keyboard Avoidance */}
      <div
        ref={sheetRef}
        style={{
          transform: isOpen
            ? `translateY(${Math.max(0, dragOffset)}px)`
            : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          maxHeight: keyboardHeight > 0 ? `calc(100dvh - ${keyboardHeight}px)` : undefined,
        }}
        className={`relative w-full max-w-lg mx-auto bg-white dark:bg-[#16161D] rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.6)] border-t border-x border-zinc-200/80 dark:border-white/10 flex flex-col ${maxHeight} overflow-hidden`}
      >
        {/* Touch gesture header & drag pill */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-2.5 pb-2 px-4 flex flex-col items-center select-none cursor-grab active:cursor-grabbing shrink-0 touch-none"
        >
          {/* Drag Handle Indicator */}
          <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600/80 my-0.5 transition-all" />

          {/* Title row */}
          {(title || headerRight) && (
            <div className="w-full flex items-center justify-between pt-1.5 pb-1">
              <div className="flex flex-col text-left min-w-0 flex-1 pr-2">
                {typeof title === 'string' ? (
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {headerRight}
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition-all tactile-press"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Body with Pull-to-dismiss support */}
        <div
          ref={contentRef}
          onTouchStart={handleContentTouchStart}
          onTouchMove={handleContentTouchMove}
          onTouchEnd={handleContentTouchEnd}
          className={`flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] no-scrollbar ${contentClassName}`}
        >
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-[#1A1A22]/80 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
