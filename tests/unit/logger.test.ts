import { describe, expect, test, vi } from 'vitest';
import { createLogger } from '../../src/logger.js';

const capture = () => {
  const lines: string[] = [];
  return { lines, write: (line: string) => void lines.push(line) };
};

describe('createLogger', () => {
  test('writes a JSON line with level, message, and context', () => {
    const { lines, write } = capture();
    const logger = createLogger('info', write);

    logger.info('platform ready', { environment: 'local' });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toEqual({
      level: 'info',
      message: 'platform ready',
      environment: 'local',
    });
  });

  test('omits context keys when no context is given', () => {
    const { lines, write } = capture();
    const logger = createLogger('info', write);

    logger.warn('disk almost full');

    expect(JSON.parse(lines[0] ?? '')).toEqual({ level: 'warn', message: 'disk almost full' });
  });

  test('context cannot override the level and message fields', () => {
    const { lines, write } = capture();
    const logger = createLogger('info', write);

    logger.info('real message', { level: 'forged', message: 'forged', extra: 1 });

    expect(JSON.parse(lines[0] ?? '')).toEqual({
      level: 'info',
      message: 'real message',
      extra: 1,
    });
  });

  test('writes newline-terminated lines to stdout by default', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const logger = createLogger('info');

    logger.info('hello');

    expect(write).toHaveBeenCalledWith('{"level":"info","message":"hello"}\n');
    write.mockRestore();
  });

  test.each([
    ['debug', ['debug', 'info', 'warn', 'error']],
    ['info', ['info', 'warn', 'error']],
    ['warn', ['warn', 'error']],
    ['error', ['error']],
  ] as const)('at level %s only emits %j', (threshold, expected) => {
    const { lines, write } = capture();
    const logger = createLogger(threshold, write);

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    const emitted = lines.map((line) => (JSON.parse(line) as { level: string }).level);
    expect(emitted).toEqual(expected);
  });
});
