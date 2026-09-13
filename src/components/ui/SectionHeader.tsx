import React from 'react';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

/** Small uppercase-style section label with an optional trailing action. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, className = '' }) => (
  <div className={`flex items-center justify-between px-1 mb-2.5 ${className}`}>
    <h3 className="text-caption font-semibold text-ink-3 tracking-wide select-none">{title}</h3>
    {action}
  </div>
);
