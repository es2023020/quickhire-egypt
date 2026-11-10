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
      return;
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

    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum allowed size is 10MB.");
      return;
    }

    setError(null);
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      if (duration < MIN_SECONDS) {
        setError(`Audio file is too short (${Math.round(duration)}s). Minimum recording length is ${MIN_SECONDS} seconds.`);
        URL.revokeObjectURL(objectUrl);
        return;
      }
      if (duration > MAX_SECONDS + 15) {
        setError(`Audio file is too long (${Math.round(duration / 60)} min). Maximum allowed length is 2 minutes.`);
        URL.revokeObjectURL(objectUrl);
        return;
      }

      setAudioUrl(objectUrl);
      setUploadedName(file.name);
      onChange(file);
      setState("done");
    };

    audio.onerror = () => {
      setAudioUrl(objectUrl);
      setUploadedName(file.name);
      onChange(file);
      setState("done");
    };
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const minReached = seconds >= MIN_SECONDS;
  const progressPct = Math.min((seconds / MAX_SECONDS) * 100, 100);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface-1 p-6 md:p-7 shadow-xl shadow-black/40">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Mic className="size-4" />
            <span>{lang} Voice Note</span>
            {required && <span className="text-destructive">*</span>}
          </div>
          <p className="mt-1 text-sm text-[#E4E4E7]/90 leading-relaxed font-normal">{prompt}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>30 sec minimum · 2 min maximum</span>
          </div>
        </div>
        {state === "recording" && (
          <div className={cn(
            "font-mono text-sm tabular-nums font-bold px-3 py-1 rounded-lg border",
            seconds >= MAX_SECONDS - 10
              ? "text-destructive border-destructive/40 bg-destructive/10 animate-pulse"
              : minReached
              ? "text-primary border-primary/40 bg-primary/10"
              : "text-amber-400 border-amber-400/40 bg-amber-400/10"
          )}>
            {mm}:{ss}
          </div>
        )}
      </div>

      {/* Mode tabs — only shown when idle */}
      {state === "idle" && (
        <div className="mb-5 flex rounded-xl border border-white/10 bg-surface-2 p-1 text-sm">
          <button
            type="button"
            onClick={() => { setMode("record"); setError(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-bold transition-all cursor-pointer",
              mode === "record"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.25)]"
                : "text-muted-foreground hover:text-white hover:bg-white/[0.04]",
            )}
          >
            <Mic className="size-3.5" /> Record Live
          </button>
          <button
            type="button"
            onClick={() => { setMode("upload"); setError(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-bold transition-all cursor-pointer",
              mode === "upload"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(182,255,46,0.25)]"
                : "text-muted-foreground hover:text-white hover:bg-white/[0.04]",
            )}
          >
            <Upload className="size-3.5" /> Upload Audio File
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {state === "idle" && mode === "record" && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2.5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Mic className="size-4" /> Start Recording
          </button>
        )}

        {state === "idle" && mode === "upload" && (
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-white/15 bg-surface-2 p-5 hover:border-primary/60 hover:bg-surface-3 transition-colors">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Upload className="size-5" />
              </div>
              <div className="text-sm text-zinc-300">
                <span className="font-bold text-primary">Click to select audio</span> from device
                <div className="text-xs text-muted-foreground mt-0.5">MP3, WAV, M4A, WebM (up to 10MB)</div>
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
          <div className="flex-1 space-y-4">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    progressPct >= 100
                      ? "bg-destructive"
                      : minReached
                      ? "bg-primary shadow-[0_0_8px_rgba(182,255,46,0.6)]"
                      : "bg-amber-400"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span className={minReached ? "text-primary font-bold" : "text-amber-400 font-semibold"}>
                  {minReached ? "✓ Minimum reached (30s)" : `${MIN_SECONDS - seconds}s until minimum`}
                </span>
                <span className={seconds >= MAX_SECONDS - 10 ? "text-destructive font-semibold" : ""}>
                  {MAX_SECONDS - seconds}s max left
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={stop}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all cursor-pointer",
                  minReached
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_18px_rgba(182,255,46,0.6)]"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}
              >
                <Square className="size-4" />
                {minReached ? "Stop & Save" : "Stop Recording"}
              </button>
              <span className="flex items-center gap-2 text-xs text-primary font-medium">
                <span className="size-2 animate-pulse rounded-full bg-primary" /> Recording Live…
              </span>
            </div>

            {tooShort && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5">
                <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <span className="font-bold">Recording under 30 seconds.</span> Please continue speaking so the AI evaluator has enough speech samples.
                  <button type="button" onClick={forceStop} className="ml-2 underline font-semibold text-white">
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
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="size-4" /> {uploadedName}
              </div>
            )}
            <audio src={audioUrl} controls className="h-10 w-full rounded-xl" />
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              {uploadedName ? "Upload Different Audio" : "Re-record Pitch"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
