import { useParams, useNavigate } from "react-router-dom";
import { loadSessions } from "@/utils/sessionStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpeedChart } from "@/components/SpeedChart";
import { formatDuration, countTotalFillers } from "@/utils/speechAnalysis";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, Zap, TrendingUp, MessageSquare, Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ResultsScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessions = loadSessions();
  const session = sessions.find(s => s.id === id);

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground mb-4">Session not found</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const totalFillers = countTotalFillers(session.fillerCounts);

  return (
    <div className="min-h-screen px-4 pb-8 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Session Results</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(session.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Clarity Score */}
      <Card className="mb-4">
        <CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground font-medium mb-2">Clarity Score</p>
          <p className="text-5xl font-bold text-primary mb-3">{session.clarityScore}</p>
          <Progress value={session.clarityScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold text-foreground">{session.avgWPM}</span>
            <span className="text-xs text-muted-foreground">Avg WPM</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold text-foreground">{session.peakWPM}</span>
            <span className="text-xs text-muted-foreground">Peak WPM</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold text-foreground">{formatDuration(session.durationSeconds)}</span>
            <span className="text-xs text-muted-foreground">Duration</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-1">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold text-foreground">{totalFillers}</span>
            <span className="text-xs text-muted-foreground">Filler Words</span>
          </CardContent>
        </Card>
      </div>

      {/* Speed Chart */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Speaking Speed Over Time</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <SpeedChart data={session.wpmHistory} />
        </CardContent>
      </Card>

      {/* Filler Word Breakdown */}
      {totalFillers > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filler Words</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(session.fillerCounts).map(([word, count]) => (
                <span
                  key={word}
                  className="px-3 py-1 rounded-full bg-pace-caution/10 text-pace-caution text-sm font-medium"
                >
                  "{word}" × {count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {session.tips.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary font-bold">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Transcript */}
      {session.transcript && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <p className="text-sm text-muted-foreground leading-relaxed">{session.transcript}</p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button className="flex-1" onClick={() => navigate("/")}>
          New Session
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => navigate("/history")}>
          View History
        </Button>
      </div>
    </div>
  );
}
