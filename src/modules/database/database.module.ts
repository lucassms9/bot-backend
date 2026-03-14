import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { EventsRepository } from './repositories/events.repository';
import { OpportunitiesRepository } from './repositories/opportunities.repository';
import { BetsRepository } from './repositories/bets.repository';

@Global()
@Module({
  providers: [
    SupabaseService,
    EventsRepository,
    OpportunitiesRepository,
    BetsRepository,
  ],
  exports: [
    SupabaseService,
    EventsRepository,
    OpportunitiesRepository,
    BetsRepository,
  ],
})
export class DatabaseModule {}
