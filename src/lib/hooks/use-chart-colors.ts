import { useMemo } from "react";
import { useTheme } from "next-themes";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useChartColors() {
  const { resolvedTheme } = useTheme();

  return useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      chart1: cssVar("--chart-1"),
      chart2: cssVar("--chart-2"),
      chart3: cssVar("--chart-3"),
      chart4: cssVar("--chart-4"),
      chart5: cssVar("--chart-5"),
      border: cssVar("--border"),
      mutedFg: cssVar("--muted-foreground"),
      card: cssVar("--card"),
      cardBorder: cssVar("--border"),
      foreground: cssVar("--foreground"),
      destructive: cssVar("--destructive"),
      primary: cssVar("--primary"),
      surface2: cssVar("--surface-2"),
      isDark,
    };
  }, [resolvedTheme]);
}
