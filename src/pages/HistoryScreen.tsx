import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadSessions, deleteSession, type SessionData } from "@/utils/sessionStorage";
import { SessionCard } from "@/components/SessionCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function HistoryScreen() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionData[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const handleDelete = (id: string) => {
    deleteSession(id);
    setSessions(loadSessions());
  };

  return (
    <div className="min-h-screen px-4 pb-8 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Session History</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-2">No sessions yet</p>
          <p className="text-sm text-muted-foreground mb-6">Start a recording to see your history here</p>
          <Button onClick={() => navigate("/")}>Start Recording</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="relative group">
              <SessionCard session={session} onClick={() => navigate(`/results/${session.id}`)} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(session.id);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
