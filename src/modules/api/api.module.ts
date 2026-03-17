import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { BankrollModule } from '../bankroll/bankroll.module';
import { BetsModule } from '../bets/bets.module';
import { AuthModule } from '../auth/auth.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [BankrollModule, BetsModule, AuthModule, SchedulerModule],
  controllers: [ApiController],
})
export class ApiModule {}
