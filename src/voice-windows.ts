// Windows system speech (STT + TTS) via System.Speech — no xAI key, no ffmpeg.
// Spawned as a long-lived PowerShell process; JSON lines on stdout for events.
//
// Why sync Recognize + stop-file:
// - RecognizeAsync event handlers often never fire under redirected stdio.
// - Console.ReadLine on a worker thread is flaky when stdin is a pipe.
// - Host drops a stop-file to end the session cleanly.
import { spawn, ChildProcess, execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export type WindowsVoiceEvent =
  | { type: "partial"; text: string }
  | { type: "final"; text: string; confidence?: number }
  | { type: "ready"; culture?: string; recognizer?: string }
  | { type: "error"; message: string }
  | { type: "stopped" }
  | { type: "log"; message: string };

/** Embedded PowerShell listener. Emits one JSON object per line on stdout.
 *  Arg 0 = stop-file path (create this file to end the session). */
const WINDOWS_STT_SCRIPT = `
param(
  [Parameter(Mandatory = $true)][string]$StopFile
)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try {
  Add-Type -AssemblyName System.Speech
} catch {
  @{ type = 'error'; message = ("System.Speech unavailable: " + $_.Exception.Message) } | ConvertTo-Json -Compress
  exit 1
}

function Emit($obj) {
  try {
    $line = ($obj | ConvertTo-Json -Compress -Depth 5)
    [Console]::Out.WriteLine($line)
    [Console]::Out.Flush()
  } catch {}
}

function ShouldStop {
  try { return (Test-Path -LiteralPath $StopFile) } catch { return $true }
}

$eng = $null
try {
  # Clean leftover stop file from a previous crash.
  try { if (Test-Path -LiteralPath $StopFile) { Remove-Item -LiteralPath $StopFile -Force } } catch {}

  $installed = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
  if (-not $installed -or $installed.Count -lt 1) {
    Emit @{ type = 'error'; message = 'No System.Speech recognizers installed. Install a Windows Desktop Speech language (e.g. English US) under Language settings.' }
    exit 1
  }

  $preferred = $null
  $cur = [System.Globalization.CultureInfo]::CurrentCulture.Name
  foreach ($r in $installed) {
    if ($r.Culture.Name -eq $cur) { $preferred = $r; break }
  }
  if (-not $preferred) {
    foreach ($r in $installed) {
      if ($r.Culture.Name -eq 'en-US') { $preferred = $r; break }
    }
  }
  if (-not $preferred) { $preferred = $installed[0] }

  Emit @{ type = 'log'; message = ("recognizer=" + $preferred.Culture.Name + " | " + $preferred.Name) }
  Emit @{ type = 'log'; message = ("stopFile=" + $StopFile) }

  $eng = New-Object System.Speech.Recognition.SpeechRecognitionEngine($preferred.Culture)
  try {
    $eng.SetInputToDefaultAudioDevice()
  } catch {
    Emit @{ type = 'error'; message = ("Microphone open failed: " + $_.Exception.Message + " - close other apps using the mic exclusively, then retry.") }
    exit 1
  }

  $dictation = New-Object System.Speech.Recognition.DictationGrammar
  $eng.LoadGrammar($dictation)

  try { $eng.EndSilenceTimeout = [TimeSpan]::FromMilliseconds(500) } catch {}
  try { $eng.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromMilliseconds(750) } catch {}
  # Max seconds of speech for one Recognize() call (prevents infinite hang).
  try { $eng.BabbleTimeout = [TimeSpan]::FromSeconds(20) } catch {}

  Emit @{
    type = 'ready'
    culture = $preferred.Culture.Name
    recognizer = $preferred.Name
  }

  # Sync loop: works without a WinForms message pump / async events.
  $loops = 0
  while (-not (ShouldStop)) {
    try {
      $loops++
      if (($loops % 6) -eq 0) {
        Emit @{ type = 'log'; message = ("listening... loops=" + $loops) }
      }
      # initialSilenceTimeout: how long to wait for speech to *start*.
      $result = $eng.Recognize([TimeSpan]::FromMilliseconds(1200))
      if ($result -and $result.Text) {
        $text = ([string]$result.Text).Trim()
        if ($text.Length -gt 0) {
          $conf = 0.0
          try { $conf = [double]$result.Confidence } catch {}
          Emit @{ type = 'log'; message = ("heard conf=" + [math]::Round($conf, 2) + " text=" + $text) }
          Emit @{ type = 'final'; text = $text; confidence = $conf }
        }
      }
    } catch {
      if (-not (ShouldStop)) {
        Emit @{ type = 'log'; message = ("recognize: " + $_.Exception.Message) }
      }
    }
  }
} catch {
  Emit @{ type = 'error'; message = $_.Exception.Message }
  exit 1
} finally {
  try {
    if ($eng) {
      try { $eng.RecognizeAsyncCancel() } catch {}
      try { $eng.Dispose() } catch {}
    }
  } catch {}
  Emit @{ type = 'stopped' }
}
`.trim();

function sessionDir(): string {
  const dir = path.join(os.tmpdir(), "grok-windows-voice");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTempScript(): string {
  const file = path.join(sessionDir(), "windows-stt.ps1");
  // UTF-8 BOM so Windows PowerShell 5.1 parses correctly (no BOM => system
  // ANSI; multi-byte UTF-8 can corrupt the script and kill recognition).
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  fs.writeFileSync(file, Buffer.concat([bom, Buffer.from(WINDOWS_STT_SCRIPT, "utf8")]));
  return file;
}

/**
 * Continuous Windows dictation session. Emits:
 *  - "partial" { text, speechFinal }
 *  - "final" { text, confidence? }
 *  - "ready"
 *  - "error" { message }
 *  - "ended"
 */
export class WindowsVoiceSession extends EventEmitter {
  private proc?: ChildProcess;
  private buf = "";
  private _active = false;
  private finals: string[] = [];
  private lastPartial = "";
  private log?: (m: string) => void;
  private stopFile?: string;

  get active(): boolean {
    return this._active;
  }

  get transcript(): string {
    const base = this.finals.join(" ").replace(/\s+/g, " ").trim();
    const p = this.lastPartial.trim();
    if (!p) return base;
    if (!base) return p;
    const last = this.finals[this.finals.length - 1] || "";
    if (p === last || p.toLowerCase() === last.toLowerCase()) return base;
    if (p.toLowerCase().startsWith(base.toLowerCase())) return p;
    return `${base} ${p}`.replace(/\s+/g, " ").trim();
  }

  async start(opts: { log?: (m: string) => void } = {}): Promise<void> {
    if (this.proc) throw new Error("Windows voice session already running.");
    if (process.platform !== "win32") {
      throw new Error("Windows system speech is only available on Windows.");
    }
    this.log = opts.log;
    this.finals = [];
    this.lastPartial = "";
    this.buf = "";

    const scriptPath = writeTempScript();
    this.stopFile = path.join(sessionDir(), `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.flag`);
    try {
      if (fs.existsSync(this.stopFile)) fs.unlinkSync(this.stopFile);
    } catch {
      /* ignore */
    }

    this.log?.(`[voice:win] start: powershell -STA -File ${scriptPath} -StopFile ${this.stopFile}`);

    const proc = spawn(
      "powershell.exe",
      [
        "-STA",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-StopFile",
        this.stopFile,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    this.proc = proc;
    this._active = true;

    let stderr = "";
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-2000);
      this.log?.(`[voice:win] stderr: ${d.toString().trim().slice(0, 240)}`);
    });
    proc.stdout?.on("data", (d) => this.onStdout(d.toString()));

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const onReady = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const onFail = (msg: string) => {
        if (settled) return;
        settled = true;
        this.requestStop();
        try {
          proc.kill();
        } catch {
          /* ignore */
        }
        this.cleanup();
        reject(new Error(msg));
      };

      this.once("ready", onReady);
      this.once("error", (e: Error) => onFail(e.message));

      proc.on("error", (err) => onFail(`Failed to start PowerShell STT: ${err.message}`));
      proc.on("exit", (code) => {
        this._active = false;
        this.proc = undefined;
        if (!settled) {
          const tail = stderr.trim().slice(0, 300);
          onFail(
            code
              ? `Windows speech exited early (code ${code})${tail ? `: ${tail}` : ""}`
              : "Windows speech exited before ready.",
          );
        } else {
          this.emit("ended");
        }
      });

      setTimeout(() => {
        if (!settled) {
          onFail(
            "Windows speech timed out starting. Install Desktop speech (System.Speech) and ensure the default mic is free.",
          );
        }
      }, 12000);
    });
  }

  private requestStop(): void {
    if (!this.stopFile) return;
    try {
      fs.writeFileSync(this.stopFile, "stop\n", "utf8");
    } catch {
      /* ignore */
    }
  }

  async stop(): Promise<string> {
    const text = this.transcript;
    const proc = this.proc;
    this.requestStop();
    if (!proc) {
      this.cleanup();
      return text;
    }
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        try {
          proc.kill();
        } catch {
          /* ignore */
        }
        resolve();
      }, 4000);
      proc.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    this.cleanup();
    return this.transcript || text;
  }

  cancel(): void {
    const proc = this.proc;
    this.requestStop();
    if (proc) {
      try {
        proc.kill();
      } catch {
        /* ignore */
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this._active = false;
    this.proc = undefined;
    if (this.stopFile) {
      try {
        fs.unlinkSync(this.stopFile);
      } catch {
        /* ignore */
      }
      this.stopFile = undefined;
    }
  }

  private onStdout(chunk: string): void {
    this.buf += chunk;
    let idx: number;
    while ((idx = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, idx).replace(/\r$/, "").trim();
      this.buf = this.buf.slice(idx + 1);
      if (!line) continue;
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    let msg: WindowsVoiceEvent;
    try {
      msg = JSON.parse(line) as WindowsVoiceEvent;
    } catch {
      this.log?.(`[voice:win] non-json: ${line.slice(0, 120)}`);
      return;
    }
    switch (msg.type) {
      case "ready":
        this.log?.(
          `[voice:win] ready culture=${(msg as any).culture || "?"} recognizer=${(msg as any).recognizer || "?"}`,
        );
        this.emit("ready");
        break;
      case "log":
        this.log?.(`[voice:win] ${(msg as any).message || ""}`);
        break;
      case "partial": {
        const t = (msg.text || "").trim();
        if (!t) break;
        this.lastPartial = t;
        const base = this.finals.join(" ").replace(/\s+/g, " ").trim();
        const display = base ? `${base} ${t}`.replace(/\s+/g, " ").trim() : t;
        this.emit("partial", { text: display, speechFinal: false });
        break;
      }
      case "final": {
        const t = (msg.text || "").trim();
        if (t) {
          this.finals.push(t);
          this.lastPartial = "";
          this.emit("partial", { text: this.transcript, speechFinal: true });
          this.emit("final", { text: t, confidence: msg.confidence });
        }
        break;
      }
      case "error":
        this.log?.(`[voice:win] error: ${msg.message}`);
        this.emit("error", new Error(msg.message || "Windows speech error"));
        break;
      case "stopped":
        this.log?.("[voice:win] stopped");
        break;
      default:
        break;
    }
  }
}

/** Speak text with the Windows SAPI synthesizer (fire-and-forget). */
export function speakWindowsTts(
  text: string,
  opts: { log?: (m: string) => void; rate?: number } = {},
): Promise<void> {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return Promise.resolve();
  if (process.platform !== "win32") return Promise.resolve();

  const spoken = cleaned.length > 1200 ? cleaned.slice(0, 1200) + "…" : cleaned;
  const rate = typeof opts.rate === "number" ? Math.max(-10, Math.min(10, opts.rate)) : 1;

  const escaped = spoken.replace(/'/g, "''");
  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.Rate = ${rate} } catch {}
try { $s.Speak('${escaped}') } finally { $s.Dispose() }
`.trim();

  opts.log?.(`[voice:win] tts: ${spoken.slice(0, 80)}${spoken.length > 80 ? "…" : ""}`);

  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 },
      (err) => {
        if (err) opts.log?.(`[voice:win] tts error: ${err.message}`);
        resolve();
      },
    );
  });
}

/** Strip markdown-ish noise so TTS is less painful. */
export function plainTextForTts(markdown: string): string {
  return (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
