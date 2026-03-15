import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { Opportunity, CreateOpportunityDto } from '../interfaces/opportunity.interface';
import { OpportunityStatus } from '../../../common/constants/strategy.constants';
import { Logger } from '../../../utils/logger';

@Injectable()
export class OpportunitiesRepository {
  private readonly logger = new Logger(OpportunitiesRepository.name);
  private readonly tableName = 'opportunities';

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Create new opportunity
   */
  async create(opportunityDto: CreateOpportunityDto): Promise<Opportunity> {
    this.logger.logDB('OpportunitiesRepository', 'INSERT', this.tableName);

    const dataToInsert = {
      ...opportunityDto,
      status: opportunityDto.status || OpportunityStatus.PENDING,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      this.logger.logError('OpportunitiesRepository', 'Error creating opportunity', error);
      throw error;
    }

    this.logger.logSuccess(
      'OpportunitiesRepository',
      `Opportunity created: ${opportunityDto.team} ${opportunityDto.handicap}`,
    );
    return data;
  }

  /**
   * Bulk create opportunities
   */
  async createMany(opportunities: CreateOpportunityDto[]): Promise<Opportunity[]> {
    if (opportunities.length === 0) {
      return [];
    }

    this.logger.logDB('OpportunitiesRepository', 'BULK INSERT', this.tableName);

    const dataToInsert = opportunities.map((opp) => ({
      ...opp,
      status: opp.status || OpportunityStatus.PENDING,
    }));

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .insert(dataToInsert)
      .select();

    if (error) {
      this.logger.logError('OpportunitiesRepository', 'Error bulk creating opportunities', error);
      throw error;
    }

    this.logger.logSuccess('OpportunitiesRepository', `${data.length} opportunities created`);
    return data;
  }

  /**
   * Find opportunities by status
   */
  async findByStatus(status: OpportunityStatus): Promise<Opportunity[]> {
    this.logger.logDB('OpportunitiesRepository', 'SELECT', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .order('risk_score', { ascending: true });

    if (error) {
      this.logger.logError('OpportunitiesRepository', 'Error finding by status', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update opportunity status
   */
  async updateStatus(id: string, status: OpportunityStatus): Promise<void> {
    this.logger.logDB('OpportunitiesRepository', 'UPDATE', this.tableName);

    const { error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .update({ status })
      .eq('id', id);

    if (error) {
      this.logger.logError('OpportunitiesRepository', 'Error updating status', error);
      throw error;
    }

    this.logger.logSuccess('OpportunitiesRepository', `Status updated to ${status}`);
  }

  /**
   * Update multiple opportunities status
   */
  async updateManyStatus(ids: string[], status: OpportunityStatus): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    this.logger.logDB('OpportunitiesRepository', 'BULK UPDATE', this.tableName);

    const { error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .update({ status })
      .in('id', ids);

    if (error) {
      this.logger.logError('OpportunitiesRepository', 'Error bulk updating status', error);
      throw error;
    }

    this.logger.logSuccess(
      'OpportunitiesRepository',
      `${ids.length} opportunities updated to ${status}`,
    );
  }

  /**
   * Find opportunity by ID
   */
  async findById(id: string): Promise<Opportunity | null> {
    this.logger.logDB('OpportunitiesRepository', 'SELECT', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.logger.logError('OpportunitiesRepository', 'Error finding by ID', error);
      throw error;
    }

    return data;
  }

  /**
   * Get opportunities count by status
   */
  async countByStatus(status: OpportunityStatus): Promise<number> {
    const { count, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    if (error) {
      this.logger.logError('OpportunitiesRepository', 'Error counting by status', error);
      throw error;
    }

    return count || 0;
  }

  /**
   * Find existing opportunity by unique characteristics
   * Returns null if not found
   */
  async findByCharacteristics(
    eventId: string,
    team: string,
    handicap: number,
    bookmaker: string,
  ): Promise<Opportunity | null> {
    this.logger.logDB('OpportunitiesRepository', 'SELECT BY CHARACTERISTICS', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .eq('event_id', eventId)
      .eq('team', team)
      .eq('handicap', handicap)
      .eq('bookmaker', bookmaker)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      this.logger.logError('OpportunitiesRepository', 'Error finding by characteristics', error);
      throw error;
    }

    return data;
  }

  /**
   * Create opportunity only if it doesn't exist
   * Returns existing or newly created opportunity
   */
  async findOrCreate(opportunityDto: CreateOpportunityDto): Promise<Opportunity> {
    // Check if already exists
    const existing = await this.findByCharacteristics(
      opportunityDto.event_id,
      opportunityDto.team,
      opportunityDto.handicap,
      opportunityDto.bookmaker,
    );

    if (existing) {
      this.logger.log(
        `Opportunity already exists: ${opportunityDto.team} ${opportunityDto.handicap}`,
        'OpportunitiesRepository',
      );
      return existing;
    }

    // Create new
    return this.create(opportunityDto);
  }
}
