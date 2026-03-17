import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { SchedulerController } from './scheduler.controller';
import { OddsModule } from '../odds/odds.module';
import { RiskModule } from '../risk/risk.module';
import { BetsModule } from '../bets/bets.module';

@Module({
  imports: [OddsModule, RiskModule, BetsModule],
  controllers: [SchedulerController],
  providers: [TasksService],
  exports: [TasksService],
})
export class SchedulerModule {}
