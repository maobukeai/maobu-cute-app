import React from 'react';

interface ProgressRingProps {
  /** 0 - 1 */
  value: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
  /** Follow the runtime accent by default */
  color?: string;
}

/** Animated SVG progress ring driven by the runtime accent color. */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 48,
  stroke = 4.5,
  children,
  className = '',
  color,
}) => {
  const clamped = Math.min(1, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--ink) / 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? 'var(--theme-accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
};
