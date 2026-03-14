import { Injectable } from '@nestjs/common';
import { BetsRepository } from '../database/repositories/bets.repository';
import { CreateBetDto, Bet } from '../database/interfaces/bet.interface';
import { BetResult } from '../../common/constants/strategy.constants';
import { BankrollService } from '../bankroll/bankroll.service';
import { Logger } from '../../utils/logger';

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(
    private betsRepository: BetsRepository,
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
    totalProfit: number;
  }> {
    const [total, pending, won, lost, partial, totalProfit] = await Promise.all([
      this.betsRepository.findAll(userId),
      this.betsRepository.countByResult(userId, BetResult.PENDING),
      this.betsRepository.countByResult(userId, BetResult.WON),
      this.betsRepository.countByResult(userId, BetResult.LOST),
      this.betsRepository.countByResult(userId, BetResult.PARTIAL),
      this.betsRepository.getTotalProfit(userId),
    ]);

    return {
      total: total.length,
      pending,
      won,
      lost,
      partial,
      totalProfit,
    };
  }
}
