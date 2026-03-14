import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { Logger } from '../../../utils/logger';
import { Bankroll, CreateBankrollDto, UpdateBankrollDto } from '../interfaces/bankroll.interface';

@Injectable()
export class BankrollRepository {
  private readonly logger = new Logger(BankrollRepository.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Get current bankroll (assumes single user system)
   */
  async getCurrent(): Promise<Bankroll | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('bankroll')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
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
   * Create initial bankroll
   */
  async create(dto: CreateBankrollDto): Promise<Bankroll> {
    const { data, error } = await this.supabase
      .getClient()
      .from('bankroll')
      .insert({
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
      `Bankroll created: ${dto.initial_balance} ${dto.currency || 'BRL'} (${dto.stake_percentage || 10}%)`,
      'BankrollRepository',
    );

    return data as Bankroll;
  }

  /**
   * Update current balance
   */
  async updateBalance(id: string, newBalance: number): Promise<Bankroll> {
    const { data, error } = await this.supabase
      .getClient()
      .from('bankroll')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating bankroll: ${error.message}`, 'BankrollRepository');
      throw error;
    }

    this.logger.log(`Bankroll updated: new balance = ${newBalance}`, 'BankrollRepository');

    return data as Bankroll;
  }

  /**
   * Add to balance (for wins)
   */
  async addToBalance(id: string, amount: number): Promise<Bankroll> {
    const current = await this.getCurrent();
    if (!current) {
      throw new Error('No bankroll found');
    }

    const newBalance = current.current_balance + amount;
    return this.updateBalance(id, newBalance);
  }

  /**
   * Subtract from balance (for losses)
   */
  async subtractFromBalance(id: string, amount: number): Promise<Bankroll> {
    const current = await this.getCurrent();
    if (!current) {
      throw new Error('No bankroll found');
    }

    const newBalance = Math.max(0, current.current_balance - amount);
    return this.updateBalance(id, newBalance);
  }

  /**
   * Reset bankroll to initial balance
   */
  async reset(id: string): Promise<Bankroll> {
    const current = await this.getCurrent();
    if (!current) {
      throw new Error('No bankroll found');
    }

    return this.updateBalance(id, current.initial_balance);
  }

  /**
   * Get suggested stake (based on configured percentage of current balance)
   */
  async getSuggestedStake(): Promise<number> {
    const bankroll = await this.getCurrent();
    if (!bankroll) {
      return 0;
    }

    const percentage = bankroll.stake_percentage / 100;
    return parseFloat((bankroll.current_balance * percentage).toFixed(2));
  }
}
