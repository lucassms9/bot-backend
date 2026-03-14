import { Injectable } from '@nestjs/common';
import { BetsRepository } from '../database/repositories/bets.repository';
import { CreateBetDto, Bet } from '../database/interfaces/bet.interface';
import { BetResult } from '../../common/constants/strategy.constants';
import { Logger } from '../../utils/logger';

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(private betsRepository: BetsRepository) {}

  /**
   * Create a single bet
   */
  async create(betDto: CreateBetDto): Promise<Bet> {
    this.logger.logProcessing('BetsService', 'Creating bet');
    return this.betsRepository.create(betDto);
  }

  /**
   * Create multiple bets
   */
  async createMany(bets: CreateBetDto[]): Promise<Bet[]> {
    if (bets.length === 0) {
      this.logger.logWarning('BetsService', 'No bets to create');
      return [];
    }

    this.logger.logProcessing('BetsService', `Creating ${bets.length} bets`);
    return this.betsRepository.createMany(bets);
  }

  /**
   * Get all bets
   */
  async findAll(): Promise<Bet[]> {
    return this.betsRepository.findAll();
  }

  /**
   * Get bets by result
   */
  async findByResult(result: BetResult): Promise<Bet[]> {
    return this.betsRepository.findByResult(result);
  }

  /**
   * Get pending bets
   */
  async getPendingBets(): Promise<Bet[]> {
    return this.findByResult(BetResult.PENDING);
  }

  /**
   * Update bet result
   */
  async updateResult(id: string, result: BetResult, profit?: number): Promise<void> {
    this.logger.logProcessing('BetsService', `Updating bet result to ${result}`);
    await this.betsRepository.updateResult(id, result, profit);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    won: number;
    lost: number;
    partial: number;
    totalProfit: number;
  }> {
    const [total, pending, won, lost, partial, totalProfit] = await Promise.all([
      this.betsRepository.findAll(),
      this.betsRepository.countByResult(BetResult.PENDING),
      this.betsRepository.countByResult(BetResult.WON),
      this.betsRepository.countByResult(BetResult.LOST),
      this.betsRepository.countByResult(BetResult.PARTIAL),
      this.betsRepository.getTotalProfit(),
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
