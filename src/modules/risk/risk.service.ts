import { Injectable } from '@nestjs/common';
import { HeuristicCalculator } from './calculators/heuristic-calculator';
import { Logger } from '../../utils/logger';

export interface RiskInput {
  handicap: number;
  odd: number;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(private heuristicCalculator: HeuristicCalculator) {}

  /**
   * Calculate risk score for an opportunity
   */
  calculateRisk(input: RiskInput): number {
    const risk = this.heuristicCalculator.calculate(input.handicap, input.odd);

    this.logger.debug(
      `Risk calculated for handicap ${input.handicap}, odd ${input.odd}: ${risk.toFixed(2)}`,
      'RiskService',
    );

    return risk;
  }

  /**
   * Calculate risk for multiple opportunities
   */
  calculateBulkRisk(inputs: RiskInput[]): number[] {
    return inputs.map((input) => this.calculateRisk(input));
  }

  /**
   * Get risk category label
   */
  getRiskCategory(risk: number): string {
    if (risk < 0.5) return 'Very Low';
    if (risk < 1.0) return 'Low';
    if (risk < 1.5) return 'Medium';
    if (risk < 2.0) return 'High';
    return 'Very High';
  }
}
