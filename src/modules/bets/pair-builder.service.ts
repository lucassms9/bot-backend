import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpportunitiesRepository } from '../database/repositories/opportunities.repository';
import { OpportunityStatus } from '../../common/constants/strategy.constants';
import { CreateBetDto } from '../database/interfaces/bet.interface';
import { Logger } from '../../utils/logger';

@Injectable()
export class PairBuilderService {
  private readonly logger = new Logger(PairBuilderService.name);
  private readonly minPairOdd: number;
  private readonly minTimeDiffHours: number;

  constructor(
    private opportunitiesRepository: OpportunitiesRepository,
    private configService: ConfigService,
  ) {
    this.minPairOdd = this.configService.get<number>('MIN_PAIR_ODD') || 1.6;
    this.minTimeDiffHours = 2; // Default 2 hours
  }

  /**
   * Build bet pairs from pending opportunities
   * Prioritizes pairing games on the same day, then by proximity
   * Note: suggested_stake will be added when user creates the bet
   */
  async buildPairs(): Promise<CreateBetDto[]> {
    this.logger.logProcessing('PairBuilderService', 'Building bet pairs with date priority');

    // Get pending opportunities with event data (includes commence_time)
    const opportunities = await this.opportunitiesRepository.findByStatusWithEventData(
      OpportunityStatus.PENDING,
    );

    if (opportunities.length < 2) {
      this.logger.logWarning(
        'PairBuilderService',
        `Not enough opportunities to pair (found ${opportunities.length})`,
      );
      return [];
    }

    this.logger.log(`Found ${opportunities.length} pending opportunities`, 'PairBuilderService');

    // Group opportunities by date (day)
    const groupedByDate = this.groupByDate(opportunities);
    this.logger.log(`Grouped into ${groupedByDate.size} different dates`, 'PairBuilderService');

    const pairs: CreateBetDto[] = [];
    const pairedIds: Set<string> = new Set();
    let sameDayPairs = 0;
    let crossDayPairs = 0;

    // Phase 1: Try to pair within same day
    for (const [date, opps] of groupedByDate.entries()) {
      if (opps.length < 2) continue;

      this.logger.debug(`Pairing ${opps.length} opportunities on ${date}`, 'PairBuilderService');

      for (let i = 0; i < opps.length - 1; i++) {
        const game1 = opps[i];
        if (!game1.id || pairedIds.has(game1.id)) continue;

        for (let j = i + 1; j < opps.length; j++) {
          const game2 = opps[j];
          if (!game2.id || pairedIds.has(game2.id)) continue;

          if (this.isValidPair(game1, game2)) {
            const pair = this.createPair(game1, game2);
            pairs.push(pair);
            pairedIds.add(game1.id);
            pairedIds.add(game2.id);
            sameDayPairs++;

            this.logger.debug(
              `Same-day pair: ${game1.team} + ${game2.team} on ${date} = ${pair.odd_total}`,
              'PairBuilderService',
            );

            break;
          }
        }
      }
    }

    // Phase 2: Pair remaining opportunities by date proximity
    const unpaired = opportunities.filter((opp) => opp.id && !pairedIds.has(opp.id));

    if (unpaired.length >= 2) {
      this.logger.log(
        `${unpaired.length} unpaired opportunities, trying cross-date pairing`,
        'PairBuilderService',
      );

      // Sort by date to pair closest dates
      unpaired.sort((a, b) => {
        const dateA = new Date(a.events.commence_time).getTime();
        const dateB = new Date(b.events.commence_time).getTime();
        return dateA - dateB;
      });

      for (let i = 0; i < unpaired.length - 1; i++) {
        const game1 = unpaired[i];
        if (!game1.id || pairedIds.has(game1.id)) continue;

        let bestMatch: any = null;
        let smallestDateDiff = Infinity;

        for (let j = i + 1; j < unpaired.length; j++) {
          const game2 = unpaired[j];
          if (!game2.id || pairedIds.has(game2.id)) continue;

          if (this.isValidPair(game1, game2)) {
            const dateDiff = Math.abs(
              new Date(game1.events.commence_time).getTime() -
                new Date(game2.events.commence_time).getTime(),
            );

            if (dateDiff < smallestDateDiff) {
              smallestDateDiff = dateDiff;
              bestMatch = game2;
            }
          }
        }

        if (bestMatch) {
          const pair = this.createPair(game1, bestMatch);
          pairs.push(pair);
          pairedIds.add(game1.id!);
          pairedIds.add(bestMatch.id!);
          crossDayPairs++;

          const daysDiff = (smallestDateDiff / (1000 * 60 * 60 * 24)).toFixed(1);
          this.logger.debug(
            `Cross-date pair: ${game1.team} + ${bestMatch.team} (${daysDiff} days apart) = ${pair.odd_total}`,
            'PairBuilderService',
          );
        }
      }
    }

    this.logger.logSuccess(
      'PairBuilderService',
      `Created ${pairs.length} pairs: ${sameDayPairs} same-day, ${crossDayPairs} cross-date`,
    );

    // Update paired opportunities status
    if (pairedIds.size > 0) {
      await this.opportunitiesRepository.updateManyStatus(
        Array.from(pairedIds),
        OpportunityStatus.PAIRED,
      );
    }

    return pairs;
  }

  /**
   * Group opportunities by date (day only, ignoring time)
   */
  private groupByDate(opportunities: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    for (const opp of opportunities) {
      const date = new Date(opp.events.commence_time);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(opp);
    }

    return grouped;
  }

  /**
   * Create pair object from two opportunities
   */
  private createPair(game1: any, game2: any): CreateBetDto {
    const oddTotal = game1.odd * game2.odd;
    const riskTotal = game1.risk_score + game2.risk_score;

    return {
      game1_id: game1.id,
      game2_id: game2.id,
      odd_total: Math.round(oddTotal * 100) / 100,
      risk_total: Math.round(riskTotal * 100) / 100,
    };
  }

  /**
   * Validate if two opportunities can be paired
   */
  private isValidPair(game1: any, game2: any): boolean {
    // Rule 1: Different events
    if (game1.event_id === game2.event_id) {
      return false;
    }

    // Rule 2: Minimum odd total
    const oddTotal = game1.odd * game2.odd;
    if (oddTotal < this.minPairOdd) {
      return false;
    }

    // Rule 3: Different times (if available)
    // This would require fetching event data, simplified for now
    // In production, you'd join with events table

    return true;
  }

  /**
   * Get pairing statistics
   */
  async getPairingStats(): Promise<{
    pendingOpportunities: number;
    possiblePairs: number;
    minOddRequired: number;
  }> {
    const pending = await this.opportunitiesRepository.countByStatus(OpportunityStatus.PENDING);

    const possiblePairs = Math.floor(pending / 2);

    return {
      pendingOpportunities: pending,
      possiblePairs,
      minOddRequired: this.minPairOdd,
    };
  }

  /**
   * Validate pair manually (for testing)
   */
  validatePairManually(
    odd1: number,
    odd2: number,
  ): {
    isValid: boolean;
    oddTotal: number;
    reason?: string;
  } {
    const oddTotal = odd1 * odd2;

    if (oddTotal < this.minPairOdd) {
      return {
        isValid: false,
        oddTotal,
        reason: `Odd total ${oddTotal.toFixed(2)} is below minimum ${this.minPairOdd}`,
      };
    }

    return {
      isValid: true,
      oddTotal,
    };
  }
}
