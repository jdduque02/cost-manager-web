import { useEffect, useState } from "react";

export function useCountUp(
  target: number,
  { duration = 1200, delay = 0 }: { duration?: number; delay?: number } = {},
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(target);
      return;
    }

    let raf = 0;
    let start: number | null = null;

    const timer = setTimeout(() => {
      const tick = (t: number) => {
        if (start === null) start = t;
        const progress = Math.min((t - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}
