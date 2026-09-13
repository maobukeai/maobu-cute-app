import React from 'react';
import { motion } from 'motion/react';
import { haptics } from '../../utils/haptics';
import { sound } from '../../utils/sound';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

/** iOS-style toggle switch. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => {
      haptics.selection();
      sound.playTap();
      onChange();
    }}
    className={`relative w-[50px] h-[30px] rounded-full transition-colors duration-200 shrink-0 disabled:opacity-40 ${
      checked ? 'bg-ok' : 'bg-ink/15'
    }`}
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 700, damping: 40 }}
      className={`absolute top-[3px] w-6 h-6 rounded-full bg-white shadow-elev-1 ${
        checked ? 'right-[3px]' : 'left-[3px]'
      }`}
    />
  </button>
);
