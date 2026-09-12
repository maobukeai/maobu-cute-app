import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { haptics } from '../../utils/haptics';

export interface SwipeAction {
  label: string;
  icon?: ReactNode;
  colorClass: string; // e.g. 'bg-red-500 text-white'
  onClick: () => void;
}

interface SwipeableItemProps {
  children: ReactNode;
  rightActions?: SwipeAction[];
  leftAction?: {
    label: string;
    icon?: ReactNode;
    colorClass: string;
    onTrigger: () => void;
  };
  className?: string;
  disabled?: boolean;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  rightActions = [],
  leftAction,
  className = '',
  disabled = false,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpenRight, setIsOpenRight] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasVibratedRef = useRef(false);

  const maxRightOffset = rightActions.length * 70; // 70px per action button
  const leftTriggerThreshold = 90; // swipe right to trigger

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (isOpenRight && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOffsetX(0);
        setIsOpenRight(false);
      }
    };
    document.addEventListener('touchstart', handleGlobalClick);
    document.addEventListener('mousedown', handleGlobalClick);
    return () => {
      document.removeEventListener('touchstart', handleGlobalClick);
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [isOpenRight]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalRef.current = null;
    isDraggingRef.current = true;
    hasVibratedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    // Determine direction on first significant movement
    if (isHorizontalRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalRef.current) return;

    // User is swiping horizontally
    let newOffset = (isOpenRight ? -maxRightOffset : 0) + deltaX;

    // Boundary constraints with resistance
    if (newOffset < -maxRightOffset) {
      newOffset = -maxRightOffset + (newOffset + maxRightOffset) * 0.2;
    } else if (newOffset > 0) {
      if (!leftAction) {
        newOffset = newOffset * 0.15;
      } else {
        newOffset = Math.min(newOffset, leftTriggerThreshold + 30);
        if (newOffset >= leftTriggerThreshold && !hasVibratedRef.current) {
          haptics.selection();
          hasVibratedRef.current = true;
        }
      }
    }

    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    if (disabled || !isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (!isHorizontalRef.current) {
      return;
    }

    // Check left trigger (swipe right)
    if (leftAction && offsetX >= leftTriggerThreshold) {
      haptics.impactMedium();
      leftAction.onTrigger();
      setOffsetX(0);
      setIsOpenRight(false);
      return;
    }

    // Check right reveal (swipe left)
    if (offsetX < -35 && rightActions.length > 0) {
      setOffsetX(-maxRightOffset);
      setIsOpenRight(true);
      haptics.selection();
    } else {
      setOffsetX(0);
      setIsOpenRight(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left Action Background (Reveal on Swiping Right) */}
      {leftAction && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center px-5 font-medium text-xs rounded-l-2xl transition-opacity duration-150 ${
            leftAction.colorClass
          } ${offsetX > 20 ? 'opacity-100' : 'opacity-0 pointer-events-none invisible'}`}
          style={{
            width: `${Math.max(0, offsetX)}px`,
            display: offsetX > 5 ? 'flex' : 'none',
          }}
        >
          <div className="flex items-center space-x-1.5 whitespace-nowrap overflow-hidden">
            {leftAction.icon}
            <span className="font-bold">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right Action Buttons (Reveal on Swiping Left) */}
      {rightActions.length > 0 && (
        <div
          className={`absolute inset-y-0 right-0 flex items-stretch z-0 transition-opacity duration-150 ${
            offsetX < -5 || isOpenRight ? 'opacity-100' : 'opacity-0 pointer-events-none invisible'
          }`}
          style={{
            width: `${maxRightOffset}px`,
            display: isOpenRight || offsetX < -5 ? 'flex' : 'none',
          }}
        >
          {rightActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={e => {
                e.stopPropagation();
                haptics.impactLight();
                action.onClick();
                setOffsetX(0);
                setIsOpenRight(false);
              }}
              className={`flex-1 flex flex-col items-center justify-center text-xs font-semibold px-2 transition-transform active:brightness-90 ${action.colorClass}`}
            >
              {action.icon && <div className="mb-0.5">{action.icon}</div>}
              <span className="text-[11px] leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Foreground Content */}
      <div
        className="relative z-10 bg-white dark:bg-[#18181E] transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${offsetX}px)`,
          transitionDuration: isDraggingRef.current ? '0ms' : '220ms',
        }}
      >
        {children}
      </div>
    </div>
  );
};
