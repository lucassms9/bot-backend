import { Logger as NestLogger } from '@nestjs/common';

export class Logger extends NestLogger {
  logProcessing(context: string, message: string, data?: any) {
    this.log(`📊 ${message}`, context);
    if (data) {
      this.debug(JSON.stringify(data, null, 2), context);
    }
  }

  logSuccess(context: string, message: string, data?: any) {
    this.log(`✅ ${message}`, context);
    if (data) {
      this.debug(JSON.stringify(data, null, 2), context);
    }
  }

  logWarning(context: string, message: string, data?: any) {
    this.warn(`⚠️ ${message}`, context);
    if (data) {
      this.debug(JSON.stringify(data, null, 2), context);
    }
  }

  logError(context: string, message: string, error?: any) {
    this.error(`❌ ${message}`, error?.stack || '', context);
  }

  logAPI(context: string, method: string, url: string) {
    this.debug(`🌐 ${method} ${url}`, context);
  }

  logDB(context: string, operation: string, table: string) {
    this.debug(`💾 ${operation} on ${table}`, context);
  }
}
