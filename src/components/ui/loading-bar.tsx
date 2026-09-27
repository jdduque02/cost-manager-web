import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function LoadingBar() {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();
  const isLoading = fetchingCount + mutatingCount > 0;
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setFadingOut(false);
      setProgress(30);
      const t1 = setTimeout(() => setProgress(60), 200);
      const t2 = setTimeout(() => setProgress(80), 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    setProgress(100);
    const t1 = setTimeout(() => setFadingOut(true), 300);
    const t2 = setTimeout(() => {
      setVisible(false);
      setFadingOut(false);
      setProgress(0);
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-[9999] h-1 animate-in fade-in",
        fadingOut && "animate-out fade-out",
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
