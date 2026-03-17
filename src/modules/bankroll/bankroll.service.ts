import { Injectable, NotFoundException } from '@nestjs/common';
import { BankrollRepository } from '../database/repositories/bankroll.repository';
import { Logger } from '../../utils/logger';
import { Bankroll, CreateBankrollDto } from '../database/interfaces/bankroll.interface';

@Injectable()
export class BankrollService {
  private readonly logger = new Logger(BankrollService.name);

  constructor(private bankrollRepository: BankrollRepository) {}

  /**
   * Get current bankroll for specific user
   */
  async getCurrent(userId: string): Promise<Bankroll> {
    const bankroll = await this.bankrollRepository.getCurrent(userId);

    if (!bankroll) {
      throw new NotFoundException('Bankroll not found. Please create one first.');
    }

    return bankroll;
  }

  /**
   * Create or update bankroll for specific user
   */
  async createOrUpdate(userId: string, dto: CreateBankrollDto): Promise<Bankroll> {
    const existing = await this.bankrollRepository.getCurrent(userId);

    if (existing) {
      // Update existing — always update both initial_balance and current_balance so
      // manually editing the balance never creates fake profit/loss entries.
      return this.bankrollRepository.resetToNewBalance(
        userId,
        existing.id,
        dto.initial_balance,
        dto.currency,
        dto.stake_percentage,
      );
    }

    // Create new
    return this.bankrollRepository.create(userId, dto);
  }

  /**
   * Reset bankroll to a new starting balance (clears profit/loss history).
   * Both initial_balance and current_balance are set to the new value.
   */
  async resetToNewBalance(
    userId: string,
    newBalance: number,
    currency?: string,
    stakePercentage?: number,
  ): Promise<Bankroll> {
    const current = await this.getCurrent(userId);
    return this.bankrollRepository.resetToNewBalance(
      userId,
      current.id,
      newBalance,
      currency,
      stakePercentage,
    );
  }

  /**
   * Update balance manually
   */
  async updateBalance(userId: string, newBalance: number): Promise<Bankroll> {
    const current = await this.getCurrent(userId);
    return this.bankrollRepository.updateBalance(userId, current.id, newBalance);
  }

  /**
   * Get suggested stake (based on configured percentage of current balance)
   */
  async getSuggestedStake(userId: string): Promise<number> {
    return this.bankrollRepository.getSuggestedStake(userId);
  }

  /**
   * Process bet result and update balance
   */
  async processBetResult(
    userId: string,
    betId: string,
    result: 'won' | 'lost',
    stake: number,
    odd: number,
  ): Promise<Bankroll> {
    const current = await this.getCurrent(userId);

    if (result === 'won') {
      const profit = stake * (odd - 1);
      this.logger.log(
        `Bet ${betId} won! Adding ${profit.toFixed(2)} to balance`,
        'BankrollService',
      );
      return this.bankrollRepository.addToBalance(userId, current.id, profit);
    } else {
      this.logger.log(
        `Bet ${betId} lost! Subtracting ${stake.toFixed(2)} from balance`,
        'BankrollService',
      );
      return this.bankrollRepository.subtractFromBalance(userId, current.id, stake);
    }
  }

  /**
   * Process bet result with final value (profit or loss) informed by user
   */
  async processBetResultWithFinalValue(
    userId: string,
    betId: string,
    result: 'won' | 'lost' | 'void',
    finalValue: number,
  ): Promise<Bankroll> {
    const current = await this.getCurrent(userId);

    if (result === 'won') {
      this.logger.log(
        `Bet ${betId} won! Adding ${finalValue.toFixed(2)} to balance`,
        'BankrollService',
      );
      return this.bankrollRepository.addToBalance(userId, current.id, finalValue);
    } else if (result === 'lost') {
      this.logger.log(
        `Bet ${betId} lost! Subtracting ${finalValue.toFixed(2)} from balance`,
        'BankrollService',
      );
      return this.bankrollRepository.subtractFromBalance(userId, current.id, finalValue);
    } else {
      // void - stake returned, just return current bankroll without changes
      this.logger.log(
        `Bet ${betId} void! Stake ${finalValue.toFixed(2)} returned to balance`,
        'BankrollService',
      );
      // Actually we should add the stake back since it was probably deducted
      return this.bankrollRepository.addToBalance(userId, current.id, finalValue);
    }
  }

  /**
   * Reset bankroll to initial balance
   */
  async reset(userId: string): Promise<Bankroll> {
    const current = await this.getCurrent(userId);
    return this.bankrollRepository.reset(userId, current.id);
  }

  /**
   * Get statistics for specific user
   */
  async getStats(userId: string): Promise<{
    currentBalance: number;
    initialBalance: number;
    profit: number;
    profitPercentage: number;
    suggestedStake: number;
    stakePercentage: number;
  }> {
    const bankroll = await this.getCurrent(userId);
    const profit = bankroll.current_balance - bankroll.initial_balance;
    const profitPercentage = (profit / bankroll.initial_balance) * 100;
    const suggestedStake = await this.getSuggestedStake(userId);

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
