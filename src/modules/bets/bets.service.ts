import { Injectable, NotFoundException } from '@nestjs/common';
import { BetsRepository } from '../database/repositories/bets.repository';
import { OpportunitiesRepository } from '../database/repositories/opportunities.repository';
import { UserOpportunitiesRepository } from '../database/repositories/user-opportunities.repository';
import { CreateBetDto, Bet } from '../database/interfaces/bet.interface';
import { BetResult } from '../../common/constants/strategy.constants';
import { BankrollService } from '../bankroll/bankroll.service';
import { Logger } from '../../utils/logger';

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(
    private betsRepository: BetsRepository,
    private opportunitiesRepository: OpportunitiesRepository,
    private userOpportunitiesRepository: UserOpportunitiesRepository,
    private bankrollService: BankrollService,
  ) {}

  /**
   * Create a single bet for a specific user
   */
  async create(userId: string, betDto: CreateBetDto): Promise<Bet> {
    this.logger.logProcessing('BetsService', `Creating bet for user ${userId}`);

    // Add suggested stake (10% of bankroll)
    const suggestedStake = await this.bankrollService.getSuggestedStake(userId);
    const betWithStake = {
      ...betDto,
      suggested_stake: suggestedStake,
    };

    return this.betsRepository.create(userId, betWithStake);
  }

  /**
   * Create multiple bets for a specific user
   */
  async createMany(userId: string, bets: CreateBetDto[]): Promise<Bet[]> {
    if (bets.length === 0) {
      this.logger.logWarning('BetsService', 'No bets to create');
      return [];
    }

    this.logger.logProcessing('BetsService', `Creating ${bets.length} bets for user ${userId}`);

    // Add suggested stake to all bets
    const suggestedStake = await this.bankrollService.getSuggestedStake(userId);
    const betsWithStake = bets.map((bet) => ({
      ...bet,
      suggested_stake: suggestedStake,
    }));

    return this.betsRepository.createMany(userId, betsWithStake);
  }

  /**
   * Undo a pending bet: delete it and restore its two opportunities to PENDING
   * so they become available for pairing again.
   */
  async undoBet(userId: string, betId: string): Promise<void> {
    this.logger.logProcessing('BetsService', `Undoing bet ${betId} for user ${userId}`);

    const bet = await this.betsRepository.findById(userId, betId);
    if (!bet) {
      throw new NotFoundException(`Bet ${betId} not found for user ${userId}`);
    }

    if (bet.result !== BetResult.PENDING) {
      throw new Error('Only pending bets can be undone');
    }

    // Delete the bet first
    await this.betsRepository.delete(userId, betId);

    // Restore both opportunities to PENDING in the user's user_opportunities
    // (not globally — other users' states are unaffected)
    await this.userOpportunitiesRepository.restoreToPendingForUser(userId, [
      bet.game1_id,
      bet.game2_id,
    ]);

    this.logger.logSuccess(
      'BetsService',
      `Bet ${betId} deleted — user_opportunities for ${bet.game1_id} and ${bet.game2_id} restored to pending for user ${userId}`,
    );
  }

  /**
   * Get all bets for a specific user
   */
  async findAll(userId: string): Promise<Bet[]> {
    return this.betsRepository.findAll(userId);
  }

  /**
   * Get bets by result for a specific user
   */
  async findByResult(userId: string, result: BetResult): Promise<Bet[]> {
    return this.betsRepository.findByResult(userId, result);
  }

  /**
   * Get pending bets for a specific user
   */
  async getPendingBets(userId: string): Promise<Bet[]> {
    return this.findByResult(userId, BetResult.PENDING);
  }

  /**
   * Update bet result for a specific user
   */
  async updateResult(
    userId: string,
    id: string,
    result: BetResult,
    profit?: number,
  ): Promise<void> {
    this.logger.logProcessing('BetsService', `Updating bet result to ${result} for user ${userId}`);
    await this.betsRepository.updateResult(userId, id, result, profit);
  }

  /**
   * Get statistics for a specific user
   */
  async getStatistics(userId: string): Promise<{
    total: number;
    pending: number;
    won: number;
    lost: number;
    partial: number;
    void: number;
    expired: number;
    totalProfit: number;
  }> {
    const [total, pending, won, lost, partial, voidBets, expired, totalProfit] = await Promise.all([
      this.betsRepository.findAll(userId),
      this.betsRepository.countByResult(userId, BetResult.PENDING),
      this.betsRepository.countByResult(userId, BetResult.WON),
      this.betsRepository.countByResult(userId, BetResult.LOST),
      this.betsRepository.countByResult(userId, BetResult.PARTIAL),
      this.betsRepository.countByResult(userId, BetResult.VOID),
      this.betsRepository.countByResult(userId, BetResult.EXPIRED),
      this.betsRepository.getTotalProfit(userId),
    ]);

    return {
      total: total.length,
      pending,
      won,
      lost,
      partial,
      void: voidBets,
      expired,
      totalProfit,
    };
  }
}
