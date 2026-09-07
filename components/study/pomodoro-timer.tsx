"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, SkipForward, Square, Settings2, Coffee, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatClock, formatDuration } from "@/lib/format";
import { recordStudySession } from "@/lib/actions/study";

type Phase = "focus" | "shortBreak" | "longBreak";

interface Settings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  roundsBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  roundsBeforeLongBreak: 4,
};

const STORAGE_KEY = "vocab-builder:pomodoro";
const MIN_LOGGABLE_SECONDS = 60;

interface Snapshot {
  settings: Settings;
  phase: Phase;
  completedFocusRounds: number;
  running: boolean;
  endsAt: number | null;
  pausedRemainingMs: number;
  focusStartedAt: number | null;
}

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

function phaseDurationMs(phase: Phase, settings: Settings): number {
  const minutes =
    phase === "focus"
      ? settings.focusMin
      : phase === "shortBreak"
        ? settings.shortBreakMin
        : settings.longBreakMin;
  return minutes * 60 * 1000;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Short two-tone chime via the Web Audio API — no asset to bundle. */
function chime() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.36);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Audio is a nice-to-have; ignore failures (autoplay policy, no device).
  }
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, silent: true });
    }
  } catch {
    // Ignore — notifications are best-effort.
  }
}

export function PomodoroTimer({
  todaySeconds,
  todaySessions,
}: {
  todaySeconds: number;
  todaySessions: number;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("focus");
  const [completedFocusRounds, setCompletedFocusRounds] = useState(0);
  const [running, setRunning] = useState(false);
  const [pausedRemainingMs, setPausedRemainingMs] = useState(phaseDurationMs("focus", DEFAULT_SETTINGS));
  const [displayRemainingMs, setDisplayRemainingMs] = useState(pausedRemainingMs);
  const [showSettings, setShowSettings] = useState(false);

  const [loggedSeconds, setLoggedSeconds] = useState(todaySeconds);
  const [loggedSessions, setLoggedSessions] = useState(todaySessions);

  const endsAtRef = useRef<number | null>(null);
  const focusStartedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // handlePhaseComplete is defined below; the tick needs a stable reference to it.
  const onCompleteRef = useRef<() => void>(() => {});

  const persist = useCallback(
    (over: Partial<Snapshot> = {}) => {
      const snapshot: Snapshot = {
        settings,
        phase,
        completedFocusRounds,
        running,
        endsAt: endsAtRef.current,
        pausedRemainingMs,
        focusStartedAt: focusStartedAtRef.current,
        ...over,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Best-effort persistence only.
      }
    },
    [settings, phase, completedFocusRounds, running, pausedRemainingMs],
  );

  const logSession = useCallback(
    (durationSeconds: number, plannedSeconds: number, endedEarly: boolean) => {
      setLoggedSeconds((s) => s + durationSeconds);
      setLoggedSessions((n) => n + 1);
      recordStudySession({
        durationSeconds,
        plannedSeconds,
        endedEarly,
        startedAtMs: focusStartedAtRef.current ?? Date.now() - durationSeconds * 1000,
      })
        .then((result) => {
          if (!result.success) toast.error(result.error);
        })
        .catch(() => toast.error("Couldn't save that session."));
    },
    [],
  );

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Advance from the phase that just elapsed to the next one.
  const handlePhaseComplete = useCallback(() => {
    stopTicking();
    endsAtRef.current = null;

    const finishedPhase = phase;
    let nextPhase: Phase;
    let nextRounds = completedFocusRounds;

    if (finishedPhase === "focus") {
      const focusSeconds = settings.focusMin * 60;
      logSession(focusSeconds, focusSeconds, false);
      focusStartedAtRef.current = null;
      nextRounds = completedFocusRounds + 1;
      if (nextRounds >= settings.roundsBeforeLongBreak) {
        nextPhase = "longBreak";
        nextRounds = 0;
      } else {
        nextPhase = "shortBreak";
      }
    } else {
      nextPhase = "focus";
    }

    const nextDuration = phaseDurationMs(nextPhase, settings);
    // Breaks roll on automatically; a fresh focus block waits for Start so we
    // never log time the learner walked away from.
    const autoStart = nextPhase !== "focus";

    chime();
    notify(
      finishedPhase === "focus" ? "Focus block done" : "Break's over",
      finishedPhase === "focus"
        ? `Nice — take a ${nextPhase === "longBreak" ? "long" : "short"} break.`
        : "Back to it. Press start when you're ready.",
    );

    setCompletedFocusRounds(nextRounds);
    setPhase(nextPhase);
    setPausedRemainingMs(nextDuration);
    setDisplayRemainingMs(nextDuration);

    if (autoStart) {
      const endsAt = Date.now() + nextDuration;
      endsAtRef.current = endsAt;
      setRunning(true);
      persist({
        phase: nextPhase,
        completedFocusRounds: nextRounds,
        running: true,
        endsAt,
        pausedRemainingMs: nextDuration,
        focusStartedAt: null,
      });
    } else {
      setRunning(false);
      persist({
        phase: nextPhase,
        completedFocusRounds: nextRounds,
        running: false,
        endsAt: null,
        pausedRemainingMs: nextDuration,
        focusStartedAt: null,
      });
    }
  }, [phase, completedFocusRounds, settings, stopTicking, logSession, persist]);

  useEffect(() => {
    onCompleteRef.current = handlePhaseComplete;
  }, [handlePhaseComplete]);

  const startTicking = useCallback(() => {
    stopTicking();
    intervalRef.current = setInterval(() => {
      const endsAt = endsAtRef.current;
      if (endsAt == null) return;
      const remaining = endsAt - Date.now();
      if (remaining <= 0) {
        setDisplayRemainingMs(0);
        onCompleteRef.current();
      } else {
        setDisplayRemainingMs(remaining);
      }
    }, 250);
  }, [stopTicking]);

  // Hydrate from localStorage once on mount. This is exactly the "sync React
  // state from an external store on load" case the rule below can't see past —
  // the `hydrated` gate keeps the pre-hydration render deterministic for SSR.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let snap: Snapshot | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) snap = JSON.parse(raw) as Snapshot;
    } catch {
      snap = null;
    }

    if (snap && snap.settings) {
      const s = snap.settings;
      setSettings(s);
      setCompletedFocusRounds(snap.completedFocusRounds ?? 0);
      focusStartedAtRef.current = snap.focusStartedAt ?? null;

      if (snap.running && snap.endsAt) {
        const remaining = snap.endsAt - Date.now();
        if (remaining > 0) {
          setPhase(snap.phase);
          endsAtRef.current = snap.endsAt;
          setPausedRemainingMs(snap.pausedRemainingMs);
          setDisplayRemainingMs(remaining);
          setRunning(true);
        } else {
          // The phase elapsed while the page was closed — credit a focus
          // block if that's what was running, then land on the next phase.
          if (snap.phase === "focus") {
            const focusSeconds = s.focusMin * 60;
            setLoggedSeconds((v) => v + focusSeconds);
            setLoggedSessions((n) => n + 1);
            recordStudySession({
              durationSeconds: focusSeconds,
              plannedSeconds: focusSeconds,
              endedEarly: false,
              startedAtMs: snap.focusStartedAt ?? snap.endsAt - focusSeconds * 1000,
            }).catch(() => {});
          }
          const rounds = snap.phase === "focus" ? (snap.completedFocusRounds ?? 0) + 1 : snap.completedFocusRounds ?? 0;
          const goLong = snap.phase === "focus" && rounds >= s.roundsBeforeLongBreak;
          const next: Phase = snap.phase === "focus" ? (goLong ? "longBreak" : "shortBreak") : "focus";
          focusStartedAtRef.current = null;
          setCompletedFocusRounds(goLong ? 0 : rounds);
          setPhase(next);
          setPausedRemainingMs(phaseDurationMs(next, s));
          setDisplayRemainingMs(phaseDurationMs(next, s));
          setRunning(false);
        }
      } else {
        setPhase(snap.phase ?? "focus");
        const remaining = snap.pausedRemainingMs ?? phaseDurationMs(snap.phase ?? "focus", s);
        setPausedRemainingMs(remaining);
        setDisplayRemainingMs(remaining);
        setRunning(false);
      }
    }

    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Keep the ticking interval in sync with `running`.
  useEffect(() => {
    if (running) startTicking();
    else stopTicking();
    return stopTicking;
  }, [running, startTicking, stopTicking]);

  function handleStart() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const endsAt = Date.now() + displayRemainingMs;
    endsAtRef.current = endsAt;
    if (phase === "focus" && focusStartedAtRef.current == null) {
      focusStartedAtRef.current = Date.now() - (phaseDurationMs("focus", settings) - displayRemainingMs);
    }
    setRunning(true);
    persist({ running: true, endsAt, focusStartedAt: focusStartedAtRef.current });
  }

  function handlePause() {
    stopTicking();
    endsAtRef.current = null;
    setPausedRemainingMs(displayRemainingMs);
    setRunning(false);
    persist({ running: false, endsAt: null, pausedRemainingMs: displayRemainingMs });
  }

  function resetToPhase(nextPhase: Phase, rounds: number) {
    stopTicking();
    endsAtRef.current = null;
    focusStartedAtRef.current = null;
    const duration = phaseDurationMs(nextPhase, settings);
    setPhase(nextPhase);
    setCompletedFocusRounds(rounds);
    setPausedRemainingMs(duration);
    setDisplayRemainingMs(duration);
    setRunning(false);
    persist({
      phase: nextPhase,
      completedFocusRounds: rounds,
      running: false,
      endsAt: null,
      pausedRemainingMs: duration,
      focusStartedAt: null,
    });
  }

  function handleReset() {
    resetToPhase(phase, completedFocusRounds);
  }

  // Focus phase: log whatever was completed (if it's worth logging), then
  // start a clean focus block.
  function handleStop() {
    const elapsedSeconds = Math.round((phaseDurationMs("focus", settings) - displayRemainingMs) / 1000);
    if (elapsedSeconds >= MIN_LOGGABLE_SECONDS) {
      logSession(elapsedSeconds, settings.focusMin * 60, true);
      toast.success(`Logged ${formatDuration(elapsedSeconds)} of focus.`);
    } else {
      toast.message("Session too short to log.");
    }
    resetToPhase("focus", completedFocusRounds);
  }

  // Break phase: jump straight to the next focus block, nothing to record.
  function handleSkipBreak() {
    resetToPhase("focus", completedFocusRounds);
  }

  function updateSetting(key: keyof Settings, raw: string) {
    const limits: Record<keyof Settings, [number, number]> = {
      focusMin: [1, 120],
      shortBreakMin: [1, 60],
      longBreakMin: [1, 60],
      roundsBeforeLongBreak: [2, 8],
    };
    const [min, max] = limits[key];
    const next = { ...settings, [key]: clampInt(Number(raw), min, max, settings[key]) };
    setSettings(next);
    if (!running) {
      const duration = phaseDurationMs(phase, next);
      setPausedRemainingMs(duration);
      setDisplayRemainingMs(duration);
      persist({ settings: next, pausedRemainingMs: duration });
    } else {
      persist({ settings: next });
    }
  }

  const totalMs = phaseDurationMs(phase, settings);
  const fraction = totalMs > 0 ? Math.min(1, Math.max(0, 1 - displayRemainingMs / totalMs)) : 0;
  const isFocus = phase === "focus";
  const roundInCycle = (completedFocusRounds % settings.roundsBeforeLongBreak) + (isFocus ? 1 : 0);

  const RADIUS = 84;
  const CIRC = 2 * Math.PI * RADIUS;

  return (
    <div
      className={cn(
        "shadow-brutal flex flex-col items-center gap-6 rounded-xl border-2 border-foreground bg-card p-6",
        !isFocus && "bg-emerald-500/5",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {isFocus ? (
          <Brain className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <Coffee className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        )}
        <span>{PHASE_LABEL[phase]}</span>
        {isFocus ? (
          <span className="text-muted-foreground">
            · round {Math.min(roundInCycle, settings.roundsBeforeLongBreak)}/{settings.roundsBeforeLongBreak}
          </span>
        ) : null}
      </div>

      <div className="relative flex size-52 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className={cn("transition-[stroke-dashoffset] duration-300", isFocus ? "stroke-primary" : "stroke-emerald-500")}
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fraction)}
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="font-heading text-5xl font-semibold tabular-nums tracking-tight">
            {formatClock(displayRemainingMs / 1000)}
          </span>
          <span className="text-xs text-muted-foreground">{running ? "in progress" : "paused"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {running ? (
          <Button onClick={handlePause} disabled={!hydrated}>
            <Pause className="size-4" /> Pause
          </Button>
        ) : (
          <Button onClick={handleStart} disabled={!hydrated}>
            <Play className="size-4" /> Start
          </Button>
        )}
        <Button variant="outline" onClick={handleReset} disabled={!hydrated}>
          <RotateCcw className="size-4" /> Reset
        </Button>
        {isFocus ? (
          <Button variant="outline" onClick={handleStop} disabled={!hydrated}>
            <Square className="size-4" /> Stop &amp; log
          </Button>
        ) : (
          <Button variant="outline" onClick={handleSkipBreak} disabled={!hydrated}>
            <SkipForward className="size-4" /> Skip break
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col items-center gap-1 border-t pt-4 text-center">
        <p className="text-sm">
          <span className="font-semibold">{formatDuration(loggedSeconds)}</span> focused today
        </p>
        <p className="text-xs text-muted-foreground">
          {loggedSessions} session{loggedSessions === 1 ? "" : "s"} logged
        </p>
      </div>

      <div className="w-full">
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={showSettings}
        >
          <Settings2 className="size-3.5" /> Timer settings
        </button>
        {showSettings ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <SettingField
              label="Focus (min)"
              value={settings.focusMin}
              disabled={running}
              onChange={(v) => updateSetting("focusMin", v)}
            />
            <SettingField
              label="Short break (min)"
              value={settings.shortBreakMin}
              disabled={running}
              onChange={(v) => updateSetting("shortBreakMin", v)}
            />
            <SettingField
              label="Long break (min)"
              value={settings.longBreakMin}
              disabled={running}
              onChange={(v) => updateSetting("longBreakMin", v)}
            />
            <SettingField
              label="Rounds / long break"
              value={settings.roundsBeforeLongBreak}
              disabled={running}
              onChange={(v) => updateSetting("roundsBeforeLongBreak", v)}
            />
            {running ? (
              <p className="col-span-2 text-[11px] text-muted-foreground">
                Pause the timer to change these.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SettingField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Input
        key={value}
        type="number"
        inputMode="numeric"
        defaultValue={value}
        disabled={disabled}
        onBlur={(e) => onChange(e.target.value)}
        className="h-8"
      />
    </label>
  );
}
