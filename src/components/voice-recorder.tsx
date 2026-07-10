import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Upload, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error(e);
      setError("Microphone access denied. Allow microphone permission and try again, or upload an audio file instead.");
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
    if (file.size > 25 * 1024 * 1024) {
      setError("File too large. Maximum size is 25MB.");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setUploadedName(file.name);
    onChange(file);
    setState("done");
  }

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

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
        </div>
        {state === "recording" && (
          <div className="font-mono text-sm tabular-nums text-destructive font-bold">
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
                <div className="text-xs mt-0.5">MP3, WAV, M4A, WebM — max 25MB</div>
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
          <>
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 transition-opacity"
            >
              <Square className="size-4" /> Stop recording
            </button>
            <span className="flex items-center gap-2 text-xs text-destructive font-medium">
              <span className="size-2 animate-pulse rounded-full bg-destructive" /> Recording…
            </span>
          </>
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
