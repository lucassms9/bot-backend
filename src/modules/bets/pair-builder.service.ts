import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpportunitiesRepository } from '../database/repositories/opportunities.repository';
import { UserOpportunitiesRepository } from '../database/repositories/user-opportunities.repository';
import { OpportunityStatus } from '../../common/constants/strategy.constants';
import { CreateBetDto } from '../database/interfaces/bet.interface';
import { Logger } from '../../utils/logger';

@Injectable()
export class PairBuilderService {
  private readonly logger = new Logger(PairBuilderService.name);
  private readonly minPairOdd: number;

  constructor(
    private opportunitiesRepository: OpportunitiesRepository,
    private userOpportunitiesRepository: UserOpportunitiesRepository,
    private configService: ConfigService,
  ) {
    this.minPairOdd = this.configService.get<number>('MIN_PAIR_ODD') || 1.6;
  }

  /**
   * Build bet pairs for a specific user from their pending user_opportunities.
   * Marks the used ones as 'paired' in user_opportunities (per-user, not global).
   */
  async buildPairsForUser(userId: string): Promise<CreateBetDto[]> {
    this.logger.logProcessing('PairBuilderService', `Building pairs for user ${userId}`);

    // 1. Fetch this user's pending opportunities with event data
    const allPending =
      await this.userOpportunitiesRepository.findPendingForUserWithEventData(userId);

    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Expire stale global opportunities (event date is in the past)
    const staleIds = allPending
      .filter((opp) => {
        const dateStr = new Date(opp.events.commence_time).toISOString().split('T')[0];
        return dateStr < todayStr;
      })
      .map((opp) => opp.id)
      .filter(Boolean) as string[];

    if (staleIds.length > 0) {
      await this.opportunitiesRepository.updateManyStatus(staleIds, OpportunityStatus.DISCARDED);
      await this.userOpportunitiesRepository.updateManyStatusForUser(userId, staleIds, 'discarded');
    }

    // 3. Only use future/today opportunities
    const opportunities = allPending.filter((opp) => {
      const dateStr = new Date(opp.events.commence_time).toISOString().split('T')[0];
      return dateStr >= todayStr;
    });

    if (opportunities.length < 2) {
      this.logger.logWarning(
        'PairBuilderService',
        `Not enough valid opportunities for user ${userId} (found ${opportunities.length})`,
      );
      return [];
    }

    this.logger.log(
      `${opportunities.length} valid pending opportunities for user ${userId}`,
      'PairBuilderService',
    );

    // 4. Pairing algorithm
    const pairs: CreateBetDto[] = [];
    const pairedIds = new Set<string>();
    const pairedEventIds = new Set<string>();
    let sameDayPairs = 0;
    let crossDayPairs = 0;

    const groupedByDate = this.groupByDate(opportunities);

    // Phase 1: same-day
    for (const [date, opps] of groupedByDate.entries()) {
      if (opps.length < 2) continue;
      this.logger.debug(`Pairing ${opps.length} opportunities on ${date}`, 'PairBuilderService');

      for (let i = 0; i < opps.length - 1; i++) {
        const game1 = opps[i];
        if (!game1.id || pairedIds.has(game1.id) || pairedEventIds.has(game1.event_id)) continue;

        for (let j = i + 1; j < opps.length; j++) {
          const game2 = opps[j];
          if (!game2.id || pairedIds.has(game2.id) || pairedEventIds.has(game2.event_id)) continue;

          if (this.isValidPair(game1, game2)) {
            pairs.push(this.createPair(game1, game2));
            pairedIds.add(game1.id);
            pairedIds.add(game2.id);
            pairedEventIds.add(game1.event_id);
            pairedEventIds.add(game2.event_id);
            sameDayPairs++;
            break;
          }
        }
      }
    }

    // Phase 2: cross-day for leftovers
    const unpaired = opportunities.filter(
      (opp) => opp.id && !pairedIds.has(opp.id) && !pairedEventIds.has(opp.event_id),
    );

    if (unpaired.length >= 2) {
      unpaired.sort(
        (a, b) =>
          new Date(a.events.commence_time).getTime() - new Date(b.events.commence_time).getTime(),
      );

      for (let i = 0; i < unpaired.length - 1; i++) {
        const game1 = unpaired[i];
        if (!game1.id || pairedIds.has(game1.id) || pairedEventIds.has(game1.event_id)) continue;

        let bestMatch: any = null;
        let smallestDateDiff = Infinity;

        for (let j = i + 1; j < unpaired.length; j++) {
          const game2 = unpaired[j];
          if (!game2.id || pairedIds.has(game2.id) || pairedEventIds.has(game2.event_id)) continue;

          if (this.isValidPair(game1, game2)) {
            const diff = Math.abs(
              new Date(game1.events.commence_time).getTime() -
                new Date(game2.events.commence_time).getTime(),
            );
            if (diff < smallestDateDiff) {
              smallestDateDiff = diff;
              bestMatch = game2;
            }
          }
        }

        if (bestMatch) {
          pairs.push(this.createPair(game1, bestMatch));
          pairedIds.add(game1.id!);
          pairedIds.add(bestMatch.id!);
          pairedEventIds.add(game1.event_id);
          pairedEventIds.add(bestMatch.event_id);
          crossDayPairs++;
        }
      }
    }

    this.logger.logSuccess(
      'PairBuilderService',
      `User ${userId}: ${pairs.length} pairs (${sameDayPairs} same-day, ${crossDayPairs} cross-date)`,
    );

    // 5. Mark used opportunities as paired in user_opportunities (per-user only)
    if (pairedIds.size > 0) {
      await this.userOpportunitiesRepository.updateManyStatusForUser(
        userId,
        Array.from(pairedIds),
        'paired',
      );
    }

    return pairs;
  }

  private groupByDate(opportunities: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    for (const opp of opportunities) {
      const dateKey = new Date(opp.events.commence_time).toISOString().split('T')[0];
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
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

  private isValidPair(game1: any, game2: any): boolean {
    if (game1.event_id === game2.event_id) return false;
    return game1.odd * game2.odd >= this.minPairOdd;
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
