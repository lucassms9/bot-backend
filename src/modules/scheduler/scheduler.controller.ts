import { Controller, Post, Get } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Logger } from '../../utils/logger';

@Controller('scheduler')
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private tasksService: TasksService) {}

  /**
   * 🧪 ENDPOINT DE TESTE - Executa todo o fluxo do bot manualmente
   * Simula o que o cron faz automaticamente
   */
  @Post('process-now')
  async processNow() {
    this.logger.log('🧪 Manual processing triggered via API', 'SchedulerController');

    try {
      await this.tasksService.processOddsManually();

      return {
        success: true,
        message: 'Processing completed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.logError('SchedulerController', 'Error in manual processing', error);

      return {
        success: false,
        message: error.message || 'Processing failed',
        error: error.toString(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 📊 Health check do scheduler
   */
  @Get('status')
  async getStatus() {
    return {
      status: 'running',
      scheduledTasks: [
        {
          name: 'processOdds',
          schedule: 'Every 30 minutes',
          description: 'Process odds and build bets',
        },
        {
          name: 'healthCheck',
          schedule: 'Every hour',
          description: 'System health check',
        },
      ],
      manualTrigger: 'POST /scheduler/process-now',
      timestamp: new Date().toISOString(),
    };
  }
}
