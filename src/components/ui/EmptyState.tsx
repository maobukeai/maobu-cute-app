import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  hint,
  actionLabel,
  onAction,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-14 px-6 text-center select-none ${className}`}>
    <div className="w-16 h-16 rounded-3xl bg-accent/10 text-accent flex items-center justify-center animate-cat-float">
      <Icon className="w-7 h-7" strokeWidth={1.6} />
    </div>
    <h3 className="text-headline font-bold text-ink mt-4">{title}</h3>
    {hint && <p className="text-sub text-ink-2 mt-1.5 max-w-[260px] leading-relaxed">{hint}</p>}
    {actionLabel && onAction && (
      <Button variant="soft" size="md" className="mt-5" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
