export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
}

let currentLevel: LogLevel = 'error'

export class WarpLogger {
  private static isTestEnv = typeof process !== 'undefined' && process.env.JEST_WORKER_ID !== undefined

  static setLevel(level: LogLevel): void {
    currentLevel = level
  }

  static shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
  }

  static debug(...args: any[]): void {
    if (!WarpLogger.isTestEnv && WarpLogger.shouldLog('debug')) {
      console.debug(...args)
    }
  }

  static info(...args: any[]): void {
    if (!WarpLogger.isTestEnv && WarpLogger.shouldLog('info')) {
      console.info(...args)
    }
  }

  static warn(...args: any[]): void {
    if (!WarpLogger.isTestEnv && WarpLogger.shouldLog('warning')) {
      console.warn(...args)
    }
  }

  static error(...args: any[]): void {
    if (!WarpLogger.isTestEnv && WarpLogger.shouldLog('error')) {
      console.error(...args)
    }
  }
}
