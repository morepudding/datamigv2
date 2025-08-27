// Système de logging pour le pipeline de migration
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  duration?: number;
}

class Logger {
  private logLevel: LogLevel;
  private logFilePath?: string;
  private logs: LogEntry[] = [];

  constructor(level: LogLevel = LogLevel.INFO, logFilePath?: string) {
    this.logLevel = level;
    this.logFilePath = logFilePath;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(level: LogLevel, module: string, message: string, data?: any, duration?: number): LogEntry {
    return {
      timestamp: new Date(),
      level,
      module,
      message,
      data,
      duration
    };
  }

  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    let message = `[${timestamp}] [${levelName}] [${entry.module}] ${entry.message}`;
    
    if (entry.duration !== undefined) {
      message += ` (${entry.duration}ms)`;
    }
    
    if (entry.data) {
      message += ` ${JSON.stringify(entry.data)}`;
    }
    
    return message;
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.logFilePath) return;

    try {
      const logMessage = this.formatLogMessage(entry) + '\n';
      const logDir = path.dirname(this.logFilePath);
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.appendFileSync(this.logFilePath, logMessage);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, module: string, message: string, data?: any, duration?: number): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, module, message, data, duration);
    this.logs.push(entry);

    // Console output
    const formattedMessage = this.formatLogMessage(entry);
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }

    // File output
    this.writeToFile(entry);
  }

  debug(module: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, module, message, data);
  }

  time(module: string, message: string, data?: any): () => void {
    const startTime = Date.now();
    this.debug(module, `Starting: ${message}`, data);
    
    return () => {
      const duration = Date.now() - startTime;
      this.log(LogLevel.INFO, module, `Completed: ${message}`, data, duration);
    };
  }

  getLogs(level?: LogLevel, module?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (module) {
      filteredLogs = filteredLogs.filter(log => log.module === module);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(filePath: string): void {
    try {
      const logData = this.logs.map(entry => this.formatLogMessage(entry)).join('\n');
      const logDir = path.dirname(filePath);
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, logData);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  }

  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    byModule: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byModule: {} as Record<string, number>
    };

    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
      stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
    });

    return stats;
  }
}

// Instance globale du logger
const logger = new Logger(
  process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG :
  process.env.LOG_LEVEL === 'warn' ? LogLevel.WARN :
  process.env.LOG_LEVEL === 'error' ? LogLevel.ERROR :
  LogLevel.INFO,
  process.env.LOG_FILE
);

export default logger;
