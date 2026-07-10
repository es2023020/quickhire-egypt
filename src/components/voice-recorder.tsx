import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  lang: string;
  prompt: string;
  required?: boolean;
  onChange: (blob: Blob | null) => void;
};

export function VoiceRecorder({ lang, prompt, required, onChange }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function start() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onChange(blob);
        setState("done");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error(e);
      setError("Microphone permission denied. Please allow access and try again.");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stop();
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setState("idle");
    setSeconds(0);
    onChange(null);
  }

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            {lang} voice note{required && <span className="ml-1 text-destructive">*</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{prompt}</p>
        </div>
        <div className={cn(
          "font-mono text-sm tabular-nums",
          state === "recording" ? "text-destructive" : "text-muted-foreground",
        )}>
          {mm}:{ss}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {state === "idle" && (
          <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Mic className="size-4" /> Start recording
          </button>
        )}
        {state === "recording" && (
          <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90">
            <Square className="size-4" /> Stop
          </button>
        )}
        {state === "done" && audioUrl && (
          <>
            <audio src={audioUrl} controls className="h-9 flex-1">
              <track kind="captions" />
            </audio>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
              <RotateCcw className="size-4" /> Re-record
            </button>
          </>
        )}
        {state === "recording" && (
          <span className="ml-2 inline-flex items-center gap-2 text-xs text-destructive">
            <span className="size-2 animate-pulse rounded-full bg-destructive" /> Recording…
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Prevent unused import warning
void Play;
