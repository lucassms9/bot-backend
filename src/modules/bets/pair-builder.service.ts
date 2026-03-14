import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpportunitiesRepository } from '../database/repositories/opportunities.repository';
import { BankrollRepository } from '../database/repositories/bankroll.repository';
import { OpportunityStatus } from '../../common/constants/strategy.constants';
import { CreateBetDto } from '../database/interfaces/bet.interface';
import { Logger } from '../../utils/logger';
import { getHoursDiff } from '../../utils/date.helper';

@Injectable()
export class PairBuilderService {
  private readonly logger = new Logger(PairBuilderService.name);
  private readonly minPairOdd: number;
  private readonly minTimeDiffHours: number;

  constructor(
    private opportunitiesRepository: OpportunitiesRepository,
    private bankrollRepository: BankrollRepository,
    private configService: ConfigService,
  ) {
    this.minPairOdd = this.configService.get<number>('MIN_PAIR_ODD') || 1.6;
    this.minTimeDiffHours = 2; // Default 2 hours
  }

  /**
   * Build bet pairs from pending opportunities
   */
  async buildPairs(): Promise<CreateBetDto[]> {
    this.logger.logProcessing('PairBuilderService', 'Building bet pairs');

    // 1. Get suggested stake from bankroll
    const suggestedStake = await this.bankrollRepository.getSuggestedStake();

    if (suggestedStake > 0) {
      this.logger.log(
        `Suggested stake from bankroll: R$ ${suggestedStake.toFixed(2)}`,
        'PairBuilderService',
      );
    }

    // 2. Get pending opportunities sorted by risk score
    const opportunities = await this.opportunitiesRepository.findByStatus(
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

    // 3. Build pairs
    const pairs: CreateBetDto[] = [];
    const pairedIds: Set<string> = new Set();

    for (let i = 0; i < opportunities.length - 1; i++) {
      const game1 = opportunities[i];

      // Skip if already paired or no ID
      if (!game1.id || pairedIds.has(game1.id)) {
        continue;
      }

      for (let j = i + 1; j < opportunities.length; j++) {
        const game2 = opportunities[j];

        // Skip if already paired or no ID
        if (!game2.id || pairedIds.has(game2.id)) {
          continue;
        }

        // Validate pair
        if (this.isValidPair(game1, game2)) {
          const oddTotal = game1.odd * game2.odd;
          const riskTotal = game1.risk_score + game2.risk_score;

          pairs.push({
            game1_id: game1.id,
            game2_id: game2.id,
            odd_total: Math.round(oddTotal * 100) / 100,
            risk_total: Math.round(riskTotal * 100) / 100,
            suggested_stake: suggestedStake > 0 ? suggestedStake : undefined,
          });

          // Mark as paired
          pairedIds.add(game1.id);
          pairedIds.add(game2.id);

          this.logger.debug(
            `Paired: ${game1.team} (${game1.odd}) + ${game2.team} (${game2.odd}) = ${oddTotal.toFixed(2)}${suggestedStake > 0 ? ` | Stake: R$ ${suggestedStake.toFixed(2)}` : ''}`,
            'PairBuilderService',
          );

          break; // Move to next game1
        }
      }
    }

    this.logger.logSuccess(
      'PairBuilderService',
      `Created ${pairs.length} pairs from ${opportunities.length} opportunities`,
    );

    // 4. Update paired opportunities status
    if (pairedIds.size > 0) {
      await this.opportunitiesRepository.updateManyStatus(
        Array.from(pairedIds),
        OpportunityStatus.PAIRED,
      );
    }

    return pairs;
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
