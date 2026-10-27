/** Silence before an in-flight prompt is treated as hung. */
export const DEFAULT_PROMPT_IDLE_TIMEOUT_MS = 1_800_000;

/** Safety cap for a prompt that keeps producing traffic indefinitely. */
export const DEFAULT_PROMPT_ABSOLUTE_TIMEOUT_MS = 86_400_000;

export function promptTimerDelayMs(args: {
  startedAt: number;
  lastActivityAt: number;
  now: number;
  idleMs: number;
  absoluteMs: number;
}): number {
  const idleRemaining = args.idleMs <= 0
    ? Number.POSITIVE_INFINITY
    : Math.max(0, args.idleMs - (args.now - args.lastActivityAt));
  const absoluteRemaining = args.absoluteMs <= 0
    ? Number.POSITIVE_INFINITY
    : Math.max(0, args.absoluteMs - (args.now - args.startedAt));
  return Math.min(idleRemaining, absoluteRemaining);
}
