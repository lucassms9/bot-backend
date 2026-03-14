import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { Logger } from '../../utils/logger';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * 🏥 Health check geral
   */
  @Get()
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }

  /**
   * 🔌 Testar conexão com Supabase
   */
  @Get('supabase')
  async testSupabase() {
    this.logger.log('Testing Supabase connection', 'HealthController');

    try {
      // Tentar uma query simples
      const { data, error } = await this.supabaseService
        .getClient()
        .from('events')
        .select('count')
        .limit(1);

      if (error) {
        this.logger.logError('HealthController', 'Supabase connection failed', error);

        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          troubleshooting: {
            step1: 'Verifique se SUPABASE_URL está correto no .env',
            step2: 'Verifique se SUPABASE_KEY está correto (use anon key)',
            step3: 'Execute o schema.sql no Supabase SQL Editor',
            step4: 'Verifique as permissões RLS (Row Level Security)',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.logger.logSuccess('HealthController', 'Supabase connection successful!');

      return {
        success: true,
        message: 'Supabase connection successful',
        supabaseUrl: process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_KEY,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.logError('HealthController', 'Unexpected error', error);

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🗄️ Verificar tabelas do banco
   */
  @Get('database')
  async checkDatabase() {
    const results = {
      events: { exists: false, count: 0 },
      opportunities: { exists: false, count: 0 },
      bets: { exists: false, count: 0 },
    };

    try {
      // Check events table
      const eventsCheck = await this.supabaseService
        .getClient()
        .from('events')
        .select('*', { count: 'exact', head: true });

      if (!eventsCheck.error) {
        results.events.exists = true;
        results.events.count = eventsCheck.count || 0;
      }

      // Check opportunities table
      const oppsCheck = await this.supabaseService
        .getClient()
        .from('opportunities')
        .select('*', { count: 'exact', head: true });

      if (!oppsCheck.error) {
        results.opportunities.exists = true;
        results.opportunities.count = oppsCheck.count || 0;
      }

      // Check bets table
      const betsCheck = await this.supabaseService
        .getClient()
        .from('bets')
        .select('*', { count: 'exact', head: true });

      if (!betsCheck.error) {
        results.bets.exists = true;
        results.bets.count = betsCheck.count || 0;
      }

      const allTablesExist =
        results.events.exists && results.opportunities.exists && results.bets.exists;

      return {
        success: allTablesExist,
        tables: results,
        message: allTablesExist
          ? 'All tables exist and are accessible'
          : 'Some tables are missing. Run database/schema.sql in Supabase SQL Editor',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        tables: results,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
