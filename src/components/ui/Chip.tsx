import React from 'react';
import { motion } from 'motion/react';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

/** Filter pill used across list screens. Solid accent when selected. */
export const Chip: React.FC<ChipProps> = ({ selected = false, onClick, children, className = '' }) => {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={() => {
        haptics.selection();
        sound.playTap();
        onClick?.();
      }}
      className={`shrink-0 h-8 px-3.5 rounded-full text-caption font-semibold inline-flex items-center gap-1 select-none transition-colors duration-200 ${
        selected
          ? 'bg-accent text-white shadow-glow-accent'
          : 'bg-surface border border-line text-ink-2'
      } ${className}`}
    >
      {children}
    </motion.button>
  );
};
