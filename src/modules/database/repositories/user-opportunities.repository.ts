import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { UserOpportunity } from '../interfaces/user-opportunity.interface';
import { Logger } from '../../../utils/logger';

type UserOppStatus = 'pending' | 'paired' | 'discarded';

@Injectable()
export class UserOpportunitiesRepository {
  private readonly logger = new Logger(UserOpportunitiesRepository.name);
  private readonly tableName = 'user_opportunities';

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Create user_opportunity rows for a user+opportunity list (upsert; safe to call twice).
   */
  async createManyForUser(
    userId: string,
    opportunityIds: string[],
    status: UserOppStatus = 'pending',
  ): Promise<void> {
    if (opportunityIds.length === 0) return;

    this.logger.logDB(
      'UserOpportunitiesRepository',
      'UPSERT bulk',
      `${opportunityIds.length} rows for user ${userId}`,
    );

    const rows = opportunityIds.map((opportunity_id) => ({
      user_id: userId,
      opportunity_id,
      status,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .upsert(rows, { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true });

    if (error) {
      this.logger.logError(
        'UserOpportunitiesRepository',
        'Error creating user_opportunities',
        error,
      );
      throw error;
    }
  }

  /**
   * Add a single new opportunity to ALL existing users (called when a new opportunity arrives).
   * Receives the list of userIds that should receive it.
   */
  async addOpportunityForUsers(opportunityId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const rows = userIds.map((user_id) => ({
      user_id,
      opportunity_id: opportunityId,
      status: 'pending' as UserOppStatus,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .upsert(rows, { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true });

    if (error) {
      this.logger.logError(
        'UserOpportunitiesRepository',
        'Error adding opportunity for users',
        error,
      );
      throw error;
    }
  }

  /**
   * Get pending user_opportunities for a user joined with event data (for pairing).
   */
  async findPendingForUserWithEventData(userId: string): Promise<any[]> {
    this.logger.logDB('UserOpportunitiesRepository', 'SELECT pending with events', userId);

    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select(
        `
        opportunity_id,
        status,
        opportunities!inner(
          id,
          event_id,
          team,
          handicap,
          odd,
          bookmaker,
          risk_score,
          status,
          created_at,
          events!inner(
            commence_time,
            home_team,
            away_team,
            league
          )
        )
      `,
      )
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      this.logger.logError('UserOpportunitiesRepository', 'Error fetching pending for user', error);
      throw error;
    }

    // Flatten: return opportunity-shaped objects (same shape PairBuilderService expects)
    return (data || []).map((row: any) => ({
      ...row.opportunities,
      // override id to be the opportunity id (already set inside opportunities)
    }));
  }

  /**
   * Mark user_opportunity rows as a given status for a specific user.
   */
  async updateManyStatusForUser(
    userId: string,
    opportunityIds: string[],
    status: UserOppStatus,
  ): Promise<void> {
    if (opportunityIds.length === 0) return;

    const { error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('opportunity_id', opportunityIds);

    if (error) {
      this.logger.logError(
        'UserOpportunitiesRepository',
        `Error updating status to ${status}`,
        error,
      );
      throw error;
    }

    this.logger.logSuccess(
      'UserOpportunitiesRepository',
      `${opportunityIds.length} rows → ${status} for user ${userId}`,
    );
  }

  /**
   * Restore paired opportunities back to pending for a specific user
   * (used when a bet is undone).
   */
  async restoreToPendingForUser(userId: string, opportunityIds: string[]): Promise<void> {
    return this.updateManyStatusForUser(userId, opportunityIds, 'pending');
  }

  /**
   * Check whether a user already has a row for the given opportunity.
   */
  async exists(userId: string, opportunityId: string): Promise<boolean> {
    const { count, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('opportunity_id', opportunityId);

    if (error) return false;
    return (count ?? 0) > 0;
  }

  /**
   * Get all status rows for a user (used for diagnostics).
   */
  async findAllForUser(userId: string): Promise<UserOpportunity[]> {
    const { data, error } = await this.supabaseService
      .getServiceRoleClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []) as UserOpportunity[];
  }
}
