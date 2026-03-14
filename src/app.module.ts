import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './modules/database/database.module';
import { OddsModule } from './modules/odds/odds.module';
import { RiskModule } from './modules/risk/risk.module';
import { BetsModule } from './modules/bets/bets.module';
import { BankrollModule } from './modules/bankroll/bankroll.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { TestModule } from './modules/test/test.module';
import { HealthModule } from './modules/health/health.module';
import { ApiModule } from './modules/api/api.module';
import { envValidation } from './config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: envValidation,
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Application modules
    DatabaseModule,
    AuthModule,
    OddsModule,
    RiskModule,
    BetsModule,
    BankrollModule,
    SchedulerModule,
    TestModule,
    HealthModule,
    ApiModule,
  ],
})
export class AppModule {}
