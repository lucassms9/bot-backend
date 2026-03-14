import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { Bet, CreateBetDto } from '../interfaces/bet.interface';
import { BetResult } from '../../../common/constants/strategy.constants';
import { Logger } from '../../../utils/logger';

@Injectable()
export class BetsRepository {
  private readonly logger = new Logger(BetsRepository.name);
  private readonly tableName = 'bets';

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Create new bet
   */
  async create(betDto: CreateBetDto): Promise<Bet> {
    this.logger.logDB('BetsRepository', 'INSERT', this.tableName);

    const dataToInsert = {
      ...betDto,
      result: betDto.result || BetResult.PENDING,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      this.logger.logError('BetsRepository', 'Error creating bet', error);
      throw error;
    }

    this.logger.logSuccess(
      'BetsRepository',
      `Bet created with odd ${betDto.odd_total.toFixed(2)}`,
    );
    return data;
  }

  /**
   * Bulk create bets
   */
  async createMany(bets: CreateBetDto[]): Promise<Bet[]> {
    if (bets.length === 0) {
      return [];
    }

    this.logger.logDB('BetsRepository', 'BULK INSERT', this.tableName);

    const dataToInsert = bets.map((bet) => ({
      ...bet,
      result: bet.result || BetResult.PENDING,
    }));

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .insert(dataToInsert)
      .select();

    if (error) {
      this.logger.logError('BetsRepository', 'Error bulk creating bets', error);
      throw error;
    }

    this.logger.logSuccess('BetsRepository', `${data.length} bets created`);
    return data;
  }

  /**
   * Find bets by result
   */
  async findByResult(result: BetResult): Promise<Bet[]> {
    this.logger.logDB('BetsRepository', 'SELECT', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .eq('result', result)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.logError('BetsRepository', 'Error finding by result', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Find all bets
   */
  async findAll(): Promise<Bet[]> {
    this.logger.logDB('BetsRepository', 'SELECT ALL', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.logError('BetsRepository', 'Error finding all bets', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update bet result and profit
   */
  async updateResult(id: string, result: BetResult, profit?: number): Promise<void> {
    this.logger.logDB('BetsRepository', 'UPDATE', this.tableName);

    const updateData: any = { result };
    if (profit !== undefined) {
      updateData.profit = profit;
    }

    const { error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      this.logger.logError('BetsRepository', 'Error updating result', error);
      throw error;
    }

    this.logger.logSuccess('BetsRepository', `Bet result updated to ${result}`);
  }

  /**
   * Get bets count by result
   */
  async countByResult(result: BetResult): Promise<number> {
    const { count, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('result', result);

    if (error) {
      this.logger.logError('BetsRepository', 'Error counting by result', error);
      throw error;
    }

    return count || 0;
  }

  /**
   * Get total profit
   */
  async getTotalProfit(): Promise<number> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('profit');

    if (error) {
      this.logger.logError('BetsRepository', 'Error calculating total profit', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    return data.reduce((sum, bet) => sum + (bet.profit || 0), 0);
  }
}
