import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Upload, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_SECONDS = 30;   // minimum recording length
const MAX_SECONDS = 120;  // maximum recording length (2 minutes)

type Props = {
  lang: string;
  prompt: string;
  required?: boolean;
  onChange: (blob: Blob | null) => void;
};

export function VoiceRecorder({ lang, prompt, required, onChange }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [tooShort, setTooShort] = useState(false);
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
      setTooShort(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
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
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          // Auto-stop at 2 minutes
          if (next >= MAX_SECONDS) {
            clearInterval(timerRef.current!);
            recRef.current?.stop();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
      setError("Microphone access denied. Allow microphone permission and try again, or upload an audio file instead.");
    }
  }

  function stop() {
    if (seconds < MIN_SECONDS) {
      setTooShort(true);
      return; // Don't stop yet — show warning but keep recording
    }
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stop();
  }

  function forceStop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stop();
    setTooShort(false);
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setState("idle");
    setSeconds(0);
    setTooShort(false);
    setUploadedName(null);
    onChange(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4", "audio/ogg", "audio/m4a", "audio/x-m4a"];
    if (!allowed.some(t => file.type.includes(t.split("/")[1]) || file.name.match(/\.(mp3|wav|webm|mp4|m4a|ogg)$/i))) {
      setError("Please upload an audio file (MP3, WAV, M4A, WebM, OGG).");
      return;
    }
    // 2 min at ~128kbps ≈ 2MB. Cap uploaded audio at 10MB to be safe.
    if (file.size > 10 * 1024 * 1024) {
      setError("Audio file too large. Maximum size is 10MB (approx 2 minutes at standard quality).");
      return;
    }
    setError(null);
    setTooShort(false);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setUploadedName(file.name);
    onChange(file);
    setState("done");
  }

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  // Progress percentage toward max (0–100)
  const progressPct = Math.min((seconds / MAX_SECONDS) * 100, 100);
  const minReached = seconds >= MIN_SECONDS;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Mic className="size-4" />
            {lang} voice note
            {required && <span className="text-destructive">*</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{prompt}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Clock className="size-3" />
            <span>30 sec minimum · 2 min maximum</span>
          </div>
        </div>
        {state === "recording" && (
          <div className={cn(
            "font-mono text-sm tabular-nums font-bold transition-colors",
            seconds >= MAX_SECONDS - 10
              ? "text-destructive animate-pulse"
              : minReached ? "text-emerald-600" : "text-destructive"
          )}>
            {mm}:{ss}
          </div>
        )}
      </div>

      {/* Mode tabs — only shown when idle */}
      {state === "idle" && (
        <div className="mb-4 flex rounded-lg border border-border overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => { setMode("record"); setError(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 font-medium transition-colors",
              mode === "record" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sand",
            )}
          >
            <Mic className="size-3.5" /> Record live
          </button>
          <button
            type="button"
            onClick={() => { setMode("upload"); setError(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 font-medium transition-colors",
              mode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sand",
            )}
          >
            <Upload className="size-3.5" /> Upload file
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === "idle" && mode === "record" && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-soft"
          >
            <Mic className="size-4" /> Start recording
          </button>
        )}

        {state === "idle" && mode === "upload" && (
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border bg-sand p-4 hover:border-primary transition-colors">
              <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Upload className="size-4" />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Click to upload</span> an audio file
                <div className="text-xs mt-0.5">MP3, WAV, M4A, WebM — max 10MB · 30 sec – 2 min</div>
              </div>
            </div>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.webm,.ogg,.mp4,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}

        {state === "recording" && (
          <div className="flex-1 space-y-3">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    progressPct >= 100
                      ? "bg-destructive"
                      : minReached
                      ? "bg-emerald-500"
                      : "bg-amber-400"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className={minReached ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                  {minReached ? "✓ Min reached" : `${MIN_SECONDS - seconds}s until min`}
                </span>
                <span className={seconds >= MAX_SECONDS - 10 ? "text-destructive font-semibold" : ""}>
                  {MAX_SECONDS - seconds}s left
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={stop}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90",
                  minReached
                    ? "bg-emerald-600 text-white"
                    : "bg-destructive text-destructive-foreground"
                )}
              >
                <Square className="size-4" />
                {minReached ? "Stop & save" : "Stop recording"}
              </button>
              <span className="flex items-center gap-2 text-xs text-destructive font-medium">
                <span className="size-2 animate-pulse rounded-full bg-destructive" /> Recording…
              </span>
            </div>

            {tooShort && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
                <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">Recording too short.</span> Please continue for at least {MIN_SECONDS} seconds.
                  Still want to stop?{" "}
                  <button type="button" onClick={forceStop} className="underline font-semibold">
                    Stop anyway
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {state === "done" && audioUrl && (
          <div className="flex-1 space-y-3">
            {uploadedName && (
              <div className="flex items-center gap-2 text-sm font-medium text-success-foreground">
                <CheckCircle2 className="size-4 text-success" /> {uploadedName}
              </div>
            )}
            <audio src={audioUrl} controls className="h-10 w-full rounded-lg">
              <track kind="captions" />
            </audio>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
            >
              <RotateCcw className="size-3.5" />
              {uploadedName ? "Upload different file" : "Re-record"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
