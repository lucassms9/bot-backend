import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { EventsRepository } from './repositories/events.repository';
import { OpportunitiesRepository } from './repositories/opportunities.repository';
import { BetsRepository } from './repositories/bets.repository';
import { BankrollRepository } from './repositories/bankroll.repository';

@Global()
@Module({
  providers: [
    SupabaseService,
    EventsRepository,
    OpportunitiesRepository,
    BetsRepository,
    BankrollRepository,
  ],
  exports: [
    SupabaseService,
    EventsRepository,
    OpportunitiesRepository,
    BetsRepository,
    BankrollRepository,
  ],
})
export class DatabaseModule {}
