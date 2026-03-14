import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { BankrollModule } from '../bankroll/bankroll.module';
import { BetsModule } from '../bets/bets.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BankrollModule, BetsModule, AuthModule],
  controllers: [ApiController],
})
export class ApiModule {}
