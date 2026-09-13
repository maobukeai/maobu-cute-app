import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Shared 1-second ticker that publishes the current unix second through
 * context. Components that need a live countdown consume the hook, so a
 * tick re-renders only those small leaves — never the list/page that
 * hosts them. Ticking pauses while the page is hidden.
 */
const NowSecondContext = createContext<number>(Math.floor(Date.now() / 1000));

export function useNowSecond(): number {
  return useContext(NowSecondContext);
}

export const NowSecondProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (intervalId) return;
      setNowSec(Math.floor(Date.now() / 1000));
      intervalId = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <NowSecondContext.Provider value={nowSec}>{children}</NowSecondContext.Provider>;
};

/** Remaining seconds in the TOTP window that contains `nowSec`. */
export function remainingSeconds(nowSec: number, period: number): number {
  return period - (nowSec % period);
}
