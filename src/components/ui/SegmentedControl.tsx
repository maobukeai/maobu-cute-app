import React from 'react';
import { motion } from 'motion/react';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';

export interface SegmentedItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface SegmentedControlProps<T extends string> {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Unique id so multiple controls can coexist (motion layoutId scope) */
  groupId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  groupId,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'p-0.5' : 'p-1';
  const itemPad = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5';
  const textCls = size === 'sm' ? 'text-caption' : 'text-sub';

  return (
    <div
      className={`relative flex items-center rounded-full bg-surface-2/90 ${pad} ${className}`}
      role="tablist"
    >
      {items.map(item => {
        const Icon = item.icon;
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (isActive) return;
              haptics.selection();
              sound.playTap();
              onChange(item.id);
            }}
            className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-full tactile-press ${itemPad} ${textCls} font-semibold transition-colors duration-200 min-w-fit ${
              isActive ? 'text-ink' : 'text-ink-2'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`${groupId}-segment-pill`}
                className="absolute inset-0 rounded-full bg-surface shadow-elev-1"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-accent text-white' : 'bg-ink/10 text-ink-2'
                  }`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
