/**
 * Simple logger utility for the TokenLaunch SDK
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug':
        this.logLevel = LogLevel.DEBUG;
        break;
      case 'info':
        this.logLevel = LogLevel.INFO;
        break;
      case 'warn':
        this.logLevel = LogLevel.WARN;
        break;
      case 'error':
        this.logLevel = LogLevel.ERROR;
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any): void {
    let errorData = error;
    
    // Convert Error objects to serializable format
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    this.log(LogLevel.ERROR, message, errorData);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      data
    };

    // Add to internal log storage
    this.logs.push(entry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    this.consoleOutput(entry);
  }

  private consoleOutput(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${entry.level}:`;

    switch (entry.level) {
      case 'DEBUG':
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case 'INFO':
        console.log(prefix, entry.message, entry.data || '');
        break;
      case 'WARN':
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case 'ERROR':
        console.error(prefix, entry.message, entry.data || '');
        break;
    }
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel, count: number = 50): LogEntry[] {
    return this.logs
      .filter(log => LogLevel[log.level as keyof typeof LogLevel] === level)
      .slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Get log statistics
   */
  getStats(): {
    totalLogs: number;
    debugCount: number;
    infoCount: number;
    warnCount: number;
    errorCount: number;
  } {
    const counts = {
      totalLogs: this.logs.length,
      debugCount: 0,
      infoCount: 0,
      warnCount: 0,
      errorCount: 0
    };

    this.logs.forEach(log => {
      switch (log.level) {
        case 'DEBUG':
          counts.debugCount++;
          break;
        case 'INFO':
          counts.infoCount++;
          break;
        case 'WARN':
          counts.warnCount++;
          break;
        case 'ERROR':
          counts.errorCount++;
          break;
      }
    });

    return counts;
  }
}

// Export singleton instance
export const logger = new Logger();