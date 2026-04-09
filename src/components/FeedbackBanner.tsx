import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FeedbackBannerProps {
  message: string | null;
}

export function FeedbackBanner({ message }: FeedbackBannerProps) {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setVisible(true);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setDisplayMessage(null), 300);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!displayMessage) return null;

  return (
    <div
      className={cn(
        "px-4 py-2 rounded-full bg-pace-fast/10 text-pace-fast text-sm font-medium transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
    >
      {displayMessage}
    </div>
  );
}
