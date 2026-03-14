import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { HeuristicCalculator } from './calculators/heuristic-calculator';

@Module({
  providers: [RiskService, HeuristicCalculator],
  exports: [RiskService],
})
export class RiskModule {}
