import React from 'react';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  /** Extra bottom clearance for the floating dock (default on) */
  dockClearance?: boolean;
}

/** Standard scrollable page container: unified padding + scroll behavior.
 *  Marked with data-header-scroll so the header can collapse on scroll. */
export const Screen: React.FC<ScreenProps> = ({ children, className = '', dockClearance = true }) => (
  <div
    data-header-scroll
    className={`flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-6 ${
      dockClearance ? 'pb-[calc(96px+env(safe-area-inset-bottom,0px))]' : ''
    } no-scrollbar ${className}`}
  >
    {children}
  </div>
);
