import { cn } from "@/lib/utils";
import { Mic, Square } from "lucide-react";

interface MicButtonProps {
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function MicButton({ isListening, onToggle, disabled }: MicButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95",
        isListening
          ? "bg-pace-fast text-white shadow-pace-fast/30 shadow-xl"
          : "bg-primary text-primary-foreground shadow-primary/20 hover:shadow-xl"
      )}
    >
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-pace-fast/30 animate-ping" />
          <span className="absolute inset-[-8px] rounded-full border-2 border-pace-fast/20 animate-pulse" />
        </>
      )}
      {isListening ? (
        <Square className="w-10 h-10 relative z-10" fill="currentColor" />
      ) : (
        <Mic className="w-10 h-10 relative z-10" />
      )}
    </button>
  );
}
