import { Module } from '@nestjs/common';
import { BetsService } from './bets.service';
import { PairBuilderService } from './pair-builder.service';
import { BetsController } from './bets.controller';
import { BankrollModule } from '../bankroll/bankroll.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BankrollModule, AuthModule],
  controllers: [BetsController],
  providers: [BetsService, PairBuilderService],
  exports: [BetsService, PairBuilderService],
})
export class BetsModule {}
