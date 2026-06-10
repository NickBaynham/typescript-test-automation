/** Severity levels in ascending order. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

/** Structured logger emitting one JSON line per entry. */
export type Logger = Record<
  LogLevel,
  (message: string, context?: Readonly<Record<string, unknown>>) => void
>;

const defaultWrite = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

/** Creates a logger that emits JSON lines at or above the given level. */
export function createLogger(
  level: LogLevel,
  write: (line: string) => void = defaultWrite,
): Logger {
  const threshold = levelOrder.indexOf(level);
  const emit = (entryLevel: LogLevel) => {
    return (message: string, context: Readonly<Record<string, unknown>> = {}): void => {
      if (levelOrder.indexOf(entryLevel) < threshold) {
        return;
      }
      write(JSON.stringify({ level: entryLevel, message, ...context }));
    };
  };
  return { debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error') };
}
