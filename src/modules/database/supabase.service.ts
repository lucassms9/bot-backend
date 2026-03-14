import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../utils/logger';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;
  private serviceRoleClient: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }

    // Client with anon key (RLS enabled)
    this.client = createClient(supabaseUrl, supabaseKey);

    // Client with service role key (RLS bypassed) - for cron jobs and admin operations
    if (serviceRoleKey) {
      this.serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.logSuccess('SupabaseService', 'Connected to Supabase with service role');
    }

    this.logger.logSuccess('SupabaseService', 'Connected to Supabase successfully');
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Get service role client that bypasses RLS
   * Use this for cron jobs and admin operations
   */
  getServiceRoleClient(): SupabaseClient {
    if (!this.serviceRoleClient) {
      throw new Error('Service role client not available. Please set SUPABASE_SERVICE_ROLE_KEY.');
    }
    return this.serviceRoleClient;
  }
}
