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
  async create(userId: string, betDto: CreateBetDto): Promise<Bet> {
    this.logger.logDB('BetsRepository', 'INSERT', this.tableName);

    const dataToInsert = {
      ...betDto,
      user_id: userId,
      result: betDto.result || BetResult.PENDING,
    };

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
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
      `Bet created for user ${userId} with odd ${betDto.odd_total.toFixed(2)}`,
    );
    return data;
  }

  /**
   * Bulk create bets
   */
  async createMany(userId: string, bets: CreateBetDto[]): Promise<Bet[]> {
    if (bets.length === 0) {
      return [];
    }

    this.logger.logDB('BetsRepository', 'BULK INSERT', this.tableName);

    const dataToInsert = bets.map((bet) => ({
      ...bet,
      user_id: userId,
      result: bet.result || BetResult.PENDING,
    }));

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .insert(dataToInsert)
      .select();

    if (error) {
      this.logger.logError('BetsRepository', 'Error bulk creating bets', error);
      throw error;
    }

    this.logger.logSuccess('BetsRepository', `${data.length} bets created for user ${userId}`);
    return data;
  }

  /**
   * Bulk create bets using service role (bypasses RLS)
   * Use this for cron jobs and admin operations
   */
  async createManyAsAdmin(userId: string, bets: CreateBetDto[]): Promise<Bet[]> {
    if (bets.length === 0) {
      return [];
    }

    this.logger.logDB('BetsRepository', 'BULK INSERT (ADMIN)', this.tableName);

    const dataToInsert = bets.map((bet) => ({
      ...bet,
      user_id: userId,
      result: bet.result || BetResult.PENDING,
    }));

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .insert(dataToInsert)
      .select();

    if (error) {
      this.logger.logError('BetsRepository', 'Error bulk creating bets (admin)', error);
      throw error;
    }

    this.logger.logSuccess('BetsRepository', `${data.length} bets created for user ${userId} (admin)`);
    return data;
  }

  /**
   * Find bets by result for specific user
   */
  async findByResult(userId: string, result: BetResult): Promise<Bet[]> {
    this.logger.logDB('BetsRepository', 'SELECT', this.tableName);

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('result', result)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.logError('BetsRepository', 'Error finding by result', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Find all bets for specific user
   */
  async findAll(userId: string): Promise<Bet[]> {
    this.logger.logDB('BetsRepository', 'SELECT ALL', this.tableName);

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
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
  async updateResult(
    userId: string,
    id: string,
    result: BetResult,
    profit?: number,
  ): Promise<void> {
    this.logger.logDB('BetsRepository', 'UPDATE', this.tableName);

    const updateData: any = { result };
    if (profit !== undefined) {
      updateData.profit = profit;
    }

    const { error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.logger.logError('BetsRepository', 'Error updating result', error);
      throw error;
    }

    this.logger.logSuccess('BetsRepository', `Bet result updated to ${result}`);
  }

  /**
   * Get bets count by result for specific user
   */
  async countByResult(userId: string, result: BetResult): Promise<number> {
    const { count, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('result', result);

    if (error) {
      this.logger.logError('BetsRepository', 'Error counting by result', error);
      throw error;
    }

    return count || 0;
  }

  /**
   * Get total profit for specific user
   */
  async getTotalProfit(userId: string): Promise<number> {
    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select('profit')
      .eq('user_id', userId);

    if (error) {
      this.logger.logError('BetsRepository', 'Error calculating total profit', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    return data.reduce((sum, bet) => sum + (bet.profit || 0), 0);
  }

  /**
   * Find bet by ID for specific user
   */
  async findById(userId: string, id: string): Promise<Bet | null> {
    this.logger.logDB('BetsRepository', 'SELECT BY ID', this.tableName);

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.logger.logError('BetsRepository', 'Error finding by ID', error);
      throw error;
    }

    return data;
  }

  /**
   * Update bet for specific user
   */
  async update(userId: string, id: string, updates: Partial<Bet>): Promise<Bet> {
    this.logger.logDB('BetsRepository', 'UPDATE', this.tableName);

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.logError('BetsRepository', 'Error updating bet', error);
      throw error;
    }

    this.logger.logSuccess('BetsRepository', `Bet ${id} updated for user ${userId}`);
    return data;
  }
}
