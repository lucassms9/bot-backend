import { Injectable } from '@nestjs/common';
import { STRATEGY_CONFIG } from '../../../common/constants/strategy.constants';

/**
 * Heuristic Risk Calculator
 * 
 * Formula: risk = (2 - handicap) * HANDICAP_WEIGHT + (odd - MIN_ODD) * ODD_WEIGHT
 * 
 * Logic:
 * - Higher handicap = Lower risk (more margin of safety)
 * - Higher odd = Higher risk (bookmaker sees it as less likely)
 * 
 * Examples:
 * - handicap +1.5, odd 1.32 → risk = 0.39 (Very Low)
 * - handicap +1.0, odd 1.50 → risk = 1.00 (Low)
 * - handicap +1.0, odd 1.25 → risk = 0.50 (Very Low)
 */
@Injectable()
export class HeuristicCalculator {
  private readonly handicapWeight = STRATEGY_CONFIG.HANDICAP_WEIGHT;
  private readonly oddWeight = STRATEGY_CONFIG.ODD_WEIGHT;
  private readonly minOdd = STRATEGY_CONFIG.MIN_ODD;

  /**
   * Calculate risk score
   */
  calculate(handicap: number, odd: number): number {
    // Component 1: Handicap risk
    // The closer to +2, the safer (less risk)
    const handicapRisk = (2 - handicap) * this.handicapWeight;

    // Component 2: Odd risk
    // Higher odds = higher risk
    const oddRisk = (odd - this.minOdd) * this.oddWeight;

    // Total risk
    const totalRisk = handicapRisk + oddRisk;

    // Round to 2 decimal places
    return Math.round(totalRisk * 100) / 100;
  }

  /**
   * Get individual risk components for debugging
   */
  getComponents(handicap: number, odd: number) {
    const handicapRisk = (2 - handicap) * this.handicapWeight;
    const oddRisk = (odd - this.minOdd) * this.oddWeight;
    const totalRisk = this.calculate(handicap, odd);

    return {
      handicapRisk: Math.round(handicapRisk * 100) / 100,
      oddRisk: Math.round(oddRisk * 100) / 100,
      totalRisk,
    };
  }

  /**
   * Validate input ranges
   */
  isValidInput(handicap: number, odd: number): boolean {
    return (
      handicap >= 0 &&
      handicap <= 5 &&
      odd >= 1.0 &&
      odd <= 10.0
    );
  }
}
