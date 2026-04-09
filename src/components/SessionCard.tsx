import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/utils/speechAnalysis";
import type { SessionData } from "@/utils/sessionStorage";
import { Clock, Zap, BarChart3 } from "lucide-react";

interface SessionCardProps {
  session: SessionData;
  onClick: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const date = new Date(session.date);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span className="text-xs text-muted-foreground">
            {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(session.durationSeconds)}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            {session.avgWPM} WPM
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            {session.clarityScore}/100
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
