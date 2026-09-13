import React from 'react';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';

type Variant = 'primary' | 'soft' | 'ghost' | 'neutral' | 'danger' | 'danger-soft';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Haptic intensity on press; 'none' disables */
  haptic?: 'light' | 'medium' | 'none';
  /** Silence the tap sound (e.g. rapid repeated clicks) */
  mute?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-glow-accent',
  soft: 'bg-accent/10 text-accent',
  ghost: 'text-ink-2 active:bg-surface-2',
  neutral: 'bg-surface-2 text-ink',
  danger: 'bg-danger text-white',
  'danger-soft': 'bg-danger/10 text-danger',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-caption rounded-full',
  md: 'h-10 px-4 text-sub rounded-full',
  lg: 'h-12 px-6 text-body rounded-full',
  icon: 'h-10 w-10 rounded-full',
  'icon-sm': 'h-8 w-8 rounded-full',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  type = 'button',
  variant = 'primary',
  size = 'md',
  haptic = 'light',
  mute = false,
  onClick,
  className = '',
  children,
  ...rest
}, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (haptic === 'light') haptics.impactLight();
    if (haptic === 'medium') haptics.impactMedium();
    if (!mute) sound.playTap();
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold select-none whitespace-nowrap tactile-press disabled:opacity-40 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
