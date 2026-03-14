import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '../../utils/logger';
import { ExtractedOpportunity } from './interfaces/odds-api.interface';

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);
  private readonly minHandicap: number;
  private readonly minOdd: number;
  private readonly maxOdd: number;

  constructor(private configService: ConfigService) {
    this.minHandicap = this.configService.get<number>('MIN_HANDICAP', 1.0);
    this.minOdd = this.configService.get<number>('MIN_ODD', 1.25);
    this.maxOdd = this.configService.get<number>('MAX_ODD', 1.55);
  }

  /**
   * Apply all strategy filters to opportunities
   */
  applyFilters(opportunities: ExtractedOpportunity[]): ExtractedOpportunity[] {
    this.logger.logProcessing(
      'FilterService',
      `Applying filters to ${opportunities.length} opportunities`,
    );

    const filtered = opportunities.filter((opp) => {
      return this.isValidHandicap(opp.handicap) && this.isValidOdd(opp.odd);
    });

    this.logger.logSuccess(
      'FilterService',
      `${filtered.length} opportunities passed filters (${opportunities.length - filtered.length} discarded)`,
    );

    return filtered;
  }

  /**
   * Check if handicap is valid
   */
  isValidHandicap(handicap: number): boolean {
    return handicap >= this.minHandicap;
  }

  /**
   * Check if odd is valid
   */
  isValidOdd(odd: number): boolean {
    return odd >= this.minOdd && odd <= this.maxOdd;
  }

  /**
   * Get filter statistics
   */
  getFilterStats(opportunities: ExtractedOpportunity[]): {
    total: number;
    validHandicap: number;
    validOdd: number;
    validBoth: number;
  } {
    const total = opportunities.length;
    const validHandicap = opportunities.filter((opp) => this.isValidHandicap(opp.handicap)).length;
    const validOdd = opportunities.filter((opp) => this.isValidOdd(opp.odd)).length;
    const validBoth = opportunities.filter(
      (opp) => this.isValidHandicap(opp.handicap) && this.isValidOdd(opp.odd),
    ).length;

    return {
      total,
      validHandicap,
      validOdd,
      validBoth,
    };
  }

  /**
   * Log detailed filter statistics
   */
  logFilterStats(opportunities: ExtractedOpportunity[]): void {
    const stats = this.getFilterStats(opportunities);

    this.logger.log('=== Filter Statistics ===', 'FilterService');
    this.logger.log(`Total opportunities: ${stats.total}`, 'FilterService');
    this.logger.log(
      `Valid handicap (>= ${this.minHandicap}): ${stats.validHandicap}`,
      'FilterService',
    );
    this.logger.log(
      `Valid odd (${this.minOdd} - ${this.maxOdd}): ${stats.validOdd}`,
      'FilterService',
    );
    this.logger.log(`Passed both filters: ${stats.validBoth}`, 'FilterService');
    this.logger.log(`Rejected: ${stats.total - stats.validBoth}`, 'FilterService');
  }
}
