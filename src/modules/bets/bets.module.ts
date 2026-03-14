import { Module } from '@nestjs/common';
import { BetsService } from './bets.service';
import { PairBuilderService } from './pair-builder.service';
import { BetsController } from './bets.controller';
import { BankrollModule } from '../bankroll/bankroll.module';

@Module({
  imports: [BankrollModule],
  controllers: [BetsController],
  providers: [BetsService, PairBuilderService],
  exports: [BetsService, PairBuilderService],
})
export class BetsModule {}
