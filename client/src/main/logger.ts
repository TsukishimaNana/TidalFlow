type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type ConsoleMethod = 'debug' | 'info' | 'warn' | 'error';

interface LogLevelConfig {
  label: string;
  color: string;
  method: ConsoleMethod;
}

const ANSI_RESET = '\u001b[0m';

const LOG_LEVELS: Record<LogLevel, LogLevelConfig> = {
  debug: {
    label: 'DEBUG',
    color: '\u001b[90m',
    method: 'debug'
  },
  info: {
    label: 'INFO',
    color: '\u001b[36m',
    method: 'info'
  },
  warn: {
    label: 'WARN',
    color: '\u001b[33m',
    method: 'warn'
  },
  error: {
    label: 'ERROR',
    color: '\u001b[31m',
    method: 'error'
  }
};

class MainLogger {
  debug(message: string, ...details: unknown[]): void {
    this.write('debug', message, details);
  }

  info(message: string, ...details: unknown[]): void {
    this.write('info', message, details);
  }

  warn(message: string, ...details: unknown[]): void {
    this.write('warn', message, details);
  }

  error(message: string, ...details: unknown[]): void {
    this.write('error', message, details);
  }

  private write(level: LogLevel, message: string, details: unknown[]): void {
    const config = LOG_LEVELS[level];
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [Main] [${config.label}] ${message}`;
    const writeToConsole = console[config.method].bind(console) as (...data: unknown[]) => void;

    writeToConsole(`${config.color}${formattedMessage}${ANSI_RESET}`, ...details);
  }
}

export const logger = new MainLogger();
