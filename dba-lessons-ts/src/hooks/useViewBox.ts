import { useEffect, useRef, useState } from "react";

export type VB = [number, number, number, number];

// smoothly animates the SVG viewBox so the layout re-fits when nodes appear
export function useViewBox(target: VB): string {
  const [v, setV] = useState<VB>(target);
  const ref = useRef<VB>(target);
  const key = target.join();
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { ref.current = target; setV(target); return; }
    let raf = 0;
    const loop = (): void => {
      const c = ref.current;
      const n = c.map((x, i) => x + (target[i] - x) * 0.12) as VB;
      const close = n.every((x, i) => Math.abs(x - target[i]) < 0.4);
      ref.current = close ? target : n;
      setV(ref.current);
      if (!close) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return v.map(x => x.toFixed(1)).join(" ");
}