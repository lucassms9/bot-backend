import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { Logger } from '../../../utils/logger';
import { Bankroll, CreateBankrollDto } from '../interfaces/bankroll.interface';

@Injectable()
export class BankrollRepository {
  private readonly logger = new Logger(BankrollRepository.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Get all user IDs that have a bankroll configured
   * Uses service role client to bypass RLS (for cron jobs)
   */
  async getAllUserIds(): Promise<string[]> {
    const { data, error } = await this.supabase
      .getServiceRoleClient()
      .from('bankroll')
      .select('user_id');

    if (error) {
      this.logger.error(`Error fetching user IDs: ${error.message}`, 'BankrollRepository');
      throw error;
    }

    return (data || []).map((row) => row.user_id);
  }

  /**
   * Get current bankroll for specific user
   */
  async getCurrent(userId: string): Promise<Bankroll | null> {
    const { data, error } = await this.supabase
      .getServiceRoleClient()
      .from('bankroll')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      this.logger.error(`Error fetching bankroll: ${error.message}`, 'BankrollRepository');
      throw error;
    }

    return data as Bankroll;
  }

  /**
   * Get current bankroll for specific user (admin - bypasses RLS)
   * Use this for cron jobs and admin operations
   */
  async getCurrentAsAdmin(userId: string): Promise<Bankroll | null> {
    const { data, error } = await this.supabase
      .getServiceRoleClient()
      .from('bankroll')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      this.logger.error(`Error fetching bankroll (admin): ${error.message}`, 'BankrollRepository');
      throw error;
    }

    return data as Bankroll;
  }

  /**
   * Create initial bankroll for user
   */
  async create(userId: string, dto: CreateBankrollDto): Promise<Bankroll> {
    const { data, error } = await this.supabase
      .getServiceRoleClient()
      .from('bankroll')
      .insert({
        user_id: userId,
        initial_balance: dto.initial_balance,
        current_balance: dto.initial_balance,
        currency: dto.currency || 'BRL',
        stake_percentage: dto.stake_percentage || 10,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating bankroll: ${error.message}`, 'BankrollRepository');
      throw error;
    }

    this.logger.log(
      `Bankroll created for user ${userId}: ${dto.initial_balance} ${dto.currency || 'BRL'} (${dto.stake_percentage || 10}%)`,
      'BankrollRepository',
    );

    return data as Bankroll;
  }

  /**
   * Update current balance
   */
  async updateBalance(userId: string, id: string, newBalance: number): Promise<Bankroll> {
    const { data, error } = await this.supabase
      .getServiceRoleClient()
      .from('bankroll')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating bankroll: ${error.message}`, 'BankrollRepository');
      throw error;
    }

    this.logger.log(
      `Bankroll updated for user ${userId}: new balance = ${newBalance}`,
      'BankrollRepository',
    );

    return data as Bankroll;
  }

  /**
   * Add to balance (for wins)
   */
  async addToBalance(userId: string, id: string, amount: number): Promise<Bankroll> {
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new Error('No bankroll found');
    }

    const newBalance = current.current_balance + amount;
    return this.updateBalance(userId, id, newBalance);
  }

  /**
   * Subtract from balance (for losses)
   */
  async subtractFromBalance(userId: string, id: string, amount: number): Promise<Bankroll> {
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new Error('No bankroll found');
    }

    const newBalance = Math.max(0, current.current_balance - amount);
    return this.updateBalance(userId, id, newBalance);
  }

  /**
   * Reset bankroll to initial balance (revert to original initial_balance)
   */
  async reset(userId: string, id: string): Promise<Bankroll> {
    const current = await this.getCurrent(userId);
    if (!current) {
      throw new Error('No bankroll found');
    }

    return this.updateBalance(userId, id, current.initial_balance);
  }

  /**
   * Reset bankroll with a new starting balance.
   * Updates BOTH initial_balance and current_balance so profit/loss resets to zero.
   */
  async resetToNewBalance(
    userId: string,
    id: string,
    newBalance: number,
    currency?: string,
    stakePercentage?: number,
  ): Promise<Bankroll> {
    const updates: Record<string, unknown> = {
      initial_balance: newBalance,
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    };
    if (currency) updates.currency = currency;
    if (stakePercentage !== undefined) updates.stake_percentage = stakePercentage;

    const { data, error } = await this.supabase
      .getServiceRoleClient()
      .from('bankroll')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error resetting bankroll: ${error.message}`, 'BankrollRepository');
      throw error;
    }

    this.logger.log(
      `Bankroll reset for user ${userId}: new balance = ${newBalance}`,
      'BankrollRepository',
    );

    return data as Bankroll;
  }

  /**
   * Get suggested stake (based on configured percentage of current balance)
   */
  async getSuggestedStake(userId: string): Promise<number> {
    const bankroll = await this.getCurrent(userId);
    if (!bankroll) {
      return 0;
    }

    const percentage = bankroll.stake_percentage / 100;
    return parseFloat((bankroll.current_balance * percentage).toFixed(2));
  }

  /**
   * Get suggested stake (admin - bypasses RLS)
   * Use this for cron jobs and admin operations
   */
  async getSuggestedStakeAsAdmin(userId: string): Promise<number> {
    const bankroll = await this.getCurrentAsAdmin(userId);
    if (!bankroll) {
      return 0;
    }

    const percentage = bankroll.stake_percentage / 100;
    return parseFloat((bankroll.current_balance * percentage).toFixed(2));
  }
}
