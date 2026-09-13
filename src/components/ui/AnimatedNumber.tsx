import React, { useEffect, useState } from 'react';
import { useSpring } from 'motion/react';

/**
 * Count-up number driven by a motion spring. Re-renders only its own
 * text node while animating.
 */
export const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({
  value,
  className,
}) => {
  const spring = useSpring(value, { stiffness: 160, damping: 24 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsub = spring.on('change', v => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return <span className={className}>{display}</span>;
};
