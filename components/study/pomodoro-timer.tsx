"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, SkipForward, Square, Settings2, Coffee, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatClock, formatDuration } from "@/lib/format";
import { recordStudySession } from "@/lib/actions/study";

type Phase = "focus" | "shortBreak" | "longBreak";

interface Settings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  roundsBeforeLongBreak: number;
  /** When true, a break's countdown begins on its own after a focus block. */
  autoStartBreaks: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreaks: false,
};

/** Fills in fields missing from an older persisted snapshot. */
function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...raw };
}

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

// End-of-phase cues — audio files live in /public.
const FOCUS_DONE_SOUND = "/Coffee_Cup_Down.mp3";
const BREAK_OVER_SOUND = "/break_over.mp3";

/** Plays a sound file from /public once. Best-effort — ignores autoplay blocks. */
function playSound(src: string) {
  try {
    if (typeof Audio === "undefined") return;
    const audio = new Audio(src);
    audio.volume = 1;
    void audio.play().catch(() => {
      // Autoplay policy may block this if the tab has had no interaction.
    });
  } catch {
    // Audio is a nice-to-have; ignore failures.
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
    // A fresh focus block always waits for Start (so we never log time the
    // learner walked away from); a break only rolls on its own when the
    // "Auto-start breaks" toggle is on.
    const autoStart = nextPhase !== "focus" && settings.autoStartBreaks;

    playSound(finishedPhase === "focus" ? FOCUS_DONE_SOUND : BREAK_OVER_SOUND);
    notify(
      finishedPhase === "focus" ? "Focus block done" : "Break's over",
      finishedPhase === "focus"
        ? autoStart
          ? `Nice — your ${nextPhase === "longBreak" ? "long" : "short"} break has started.`
          : `Nice — press start to begin your ${nextPhase === "longBreak" ? "long" : "short"} break.`
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
      const s = normalizeSettings(snap.settings);
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

  // Switches to `nextPhase` and starts its countdown immediately.
  function startPhaseNow(nextPhase: Phase, rounds: number) {
    focusStartedAtRef.current = nextPhase === "focus" ? Date.now() : null;
    const duration = phaseDurationMs(nextPhase, settings);
    const endsAt = Date.now() + duration;
    endsAtRef.current = endsAt;
    setPhase(nextPhase);
    setCompletedFocusRounds(rounds);
    setPausedRemainingMs(duration);
    setDisplayRemainingMs(duration);
    setRunning(true);
    // Start the interval directly rather than waiting on the `running` effect —
    // when a focus block was already running, `running` doesn't change and the
    // effect wouldn't re-fire, leaving the new phase frozen.
    startTicking();
    persist({
      phase: nextPhase,
      completedFocusRounds: rounds,
      running: true,
      endsAt,
      pausedRemainingMs: duration,
      focusStartedAt: focusStartedAtRef.current,
    });
  }

  // "Dodo break" — start a short break right now, on demand. A focus block in
  // progress is logged first if it's worth logging. Doesn't touch the
  // long-break round counter: a break you chose to take isn't a scheduled one.
  function handleDodoBreakNow() {
    if (phase === "focus") {
      const elapsedSeconds = Math.round((phaseDurationMs("focus", settings) - displayRemainingMs) / 1000);
      if (elapsedSeconds >= MIN_LOGGABLE_SECONDS) {
        logSession(elapsedSeconds, settings.focusMin * 60, true);
        toast.success(`Logged ${formatDuration(elapsedSeconds)} of focus.`);
      }
    }
    startPhaseNow("shortBreak", completedFocusRounds);
  }

  type NumericSetting = "focusMin" | "shortBreakMin" | "longBreakMin" | "roundsBeforeLongBreak";

  function updateSetting(key: NumericSetting, raw: string) {
    const limits: Record<NumericSetting, [number, number]> = {
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

  function toggleAutoStartBreaks(value: boolean) {
    const next = { ...settings, autoStartBreaks: value };
    setSettings(next);
    persist({ settings: next });
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

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {running ? (
            <Button onClick={handlePause} disabled={!hydrated}>
              <Pause className="size-4" /> Pause
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={!hydrated}>
              {isFocus ? <Play className="size-4" /> : <Coffee className="size-4" />}
              {isFocus ? "Start" : "Start break"}
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

        {isFocus ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDodoBreakNow}
            disabled={!hydrated}
          >
            <Coffee className="size-4" /> Dodo break · {settings.shortBreakMin} min
          </Button>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
          <Switch
            size="sm"
            checked={settings.autoStartBreaks}
            onCheckedChange={toggleAutoStartBreaks}
            disabled={!hydrated}
          />
          Auto-start breaks {settings.autoStartBreaks ? "on" : "off"}
        </label>
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
