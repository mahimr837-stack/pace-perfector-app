import { cn } from "@/lib/utils";
import type { PaceLevel } from "@/utils/speechAnalysis";

interface SpeedIndicatorProps {
  wpm: number;
  paceLevel: PaceLevel;
}

const PACE_CONFIG: Record<PaceLevel, { label: string; colorClass: string; ringClass: string }> = {
  idle: { label: "Ready", colorClass: "text-muted-foreground", ringClass: "border-border" },
  good: { label: "Good pace", colorClass: "text-pace-good", ringClass: "border-pace-good" },
  caution: { label: "Slightly fast", colorClass: "text-pace-caution", ringClass: "border-pace-caution" },
  fast: { label: "Too fast!", colorClass: "text-pace-fast", ringClass: "border-pace-fast" },
};

export function SpeedIndicator({ wpm, paceLevel }: SpeedIndicatorProps) {
  const config = PACE_CONFIG[paceLevel];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-500",
          config.ringClass
        )}
      >
        <span className={cn("text-5xl font-bold tabular-nums transition-colors duration-500", config.colorClass)}>
          {wpm || "—"}
        </span>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">WPM</span>
      </div>
      <span className={cn("text-sm font-medium transition-colors duration-500", config.colorClass)}>
        {config.label}
      </span>
    </div>
  );
}
