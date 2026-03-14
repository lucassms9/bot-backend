import { Injectable, NotFoundException } from '@nestjs/common';
import { BankrollRepository } from '../database/repositories/bankroll.repository';
import { Logger } from '../../utils/logger';
import {
  Bankroll,
  CreateBankrollDto,
  UpdateBankrollDto,
} from '../database/interfaces/bankroll.interface';

@Injectable()
export class BankrollService {
  private readonly logger = new Logger(BankrollService.name);

  constructor(private bankrollRepository: BankrollRepository) {}

  /**
   * Get current bankroll
   */
  async getCurrent(): Promise<Bankroll> {
    const bankroll = await this.bankrollRepository.getCurrent();

    if (!bankroll) {
      throw new NotFoundException('Bankroll not found. Please create one first.');
    }

    return bankroll;
  }

  /**
   * Create or update bankroll
   */
  async createOrUpdate(dto: CreateBankrollDto): Promise<Bankroll> {
    const existing = await this.bankrollRepository.getCurrent();

    if (existing) {
      // Update existing
      return this.bankrollRepository.updateBalance(existing.id, dto.initial_balance);
    }

    // Create new
    return this.bankrollRepository.create(dto);
  }

  /**
   * Update balance manually
   */
  async updateBalance(newBalance: number): Promise<Bankroll> {
    const current = await this.getCurrent();
    return this.bankrollRepository.updateBalance(current.id, newBalance);
  }

  /**
   * Get suggested stake (based on configured percentage of current balance)
   */
  async getSuggestedStake(): Promise<number> {
    return this.bankrollRepository.getSuggestedStake();
  }

  /**
   * Process bet result and update balance
   */
  async processBetResult(
    betId: string,
    result: 'won' | 'lost',
    stake: number,
    odd: number,
  ): Promise<Bankroll> {
    const current = await this.getCurrent();

    if (result === 'won') {
      const profit = stake * (odd - 1);
      this.logger.log(
        `Bet ${betId} won! Adding ${profit.toFixed(2)} to balance`,
        'BankrollService',
      );
      return this.bankrollRepository.addToBalance(current.id, profit);
    } else {
      this.logger.log(
        `Bet ${betId} lost! Subtracting ${stake.toFixed(2)} from balance`,
        'BankrollService',
      );
      return this.bankrollRepository.subtractFromBalance(current.id, stake);
    }
  }

  /**
   * Process bet result with final value (profit or loss) informed by user
   */
  async processBetResultWithFinalValue(
    betId: string,
    result: 'won' | 'lost',
    finalValue: number,
  ): Promise<Bankroll> {
    const current = await this.getCurrent();

    if (result === 'won') {
      this.logger.log(
        `Bet ${betId} won! Adding ${finalValue.toFixed(2)} to balance`,
        'BankrollService',
      );
      return this.bankrollRepository.addToBalance(current.id, finalValue);
    } else {
      this.logger.log(
        `Bet ${betId} lost! Subtracting ${finalValue.toFixed(2)} from balance`,
        'BankrollService',
      );
      return this.bankrollRepository.subtractFromBalance(current.id, finalValue);
    }
  }

  /**
   * Reset bankroll to initial balance
   */
  async reset(): Promise<Bankroll> {
    const current = await this.getCurrent();
    return this.bankrollRepository.reset(current.id);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    currentBalance: number;
    initialBalance: number;
    profit: number;
    profitPercentage: number;
    suggestedStake: number;
    stakePercentage: number;
  }> {
    const bankroll = await this.getCurrent();
    const profit = bankroll.current_balance - bankroll.initial_balance;
    const profitPercentage = (profit / bankroll.initial_balance) * 100;
    const suggestedStake = await this.getSuggestedStake();

    return {
      currentBalance: bankroll.current_balance,
      initialBalance: bankroll.initial_balance,
      profit,
      profitPercentage,
      suggestedStake,
      stakePercentage: bankroll.stake_percentage,
    };
  }
}
