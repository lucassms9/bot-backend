import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OddsService } from '../odds/odds.service';
import { ParserService } from '../odds/parser.service';
import { FilterService } from '../odds/filter.service';
import { RiskService } from '../risk/risk.service';
import { PairBuilderService } from '../bets/pair-builder.service';
import { BankrollRepository } from '../database/repositories/bankroll.repository';
import { BetsRepository } from '../database/repositories/bets.repository';
import { EventsRepository } from '../database/repositories/events.repository';
import { OpportunitiesRepository } from '../database/repositories/opportunities.repository';
import { UserOpportunitiesRepository } from '../database/repositories/user-opportunities.repository';
import { Logger } from '../../utils/logger';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private isProcessing = false;

  constructor(
    private configService: ConfigService,
    private oddsService: OddsService,
    private parserService: ParserService,
    private filterService: FilterService,
    private riskService: RiskService,
    private pairBuilderService: PairBuilderService,
    private bankrollRepository: BankrollRepository,
    private betsRepository: BetsRepository,
    private eventsRepository: EventsRepository,
    private opportunitiesRepository: OpportunitiesRepository,
    private userOpportunitiesRepository: UserOpportunitiesRepository,
  ) {}

  /**
   * Main scheduled task - Process odds and create bets for all users
   * Runs daily at 10 AM (configurable via CRON env variable)
   *
   * Creates opportunities (shared) and bets for each user (personalized with their bankroll)
   */
  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'processOdds',
  })
  async processOdds() {
    if (this.isProcessing) {
      this.logger.logWarning('TasksService', 'Previous processing still running, skipping...');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    this.logger.log('═══════════════════════════════════════', 'TasksService');
    this.logger.log('🚀 Starting scheduled odds processing', 'TasksService');
    this.logger.log('═══════════════════════════════════════', 'TasksService');

    try {
      // Step 0: Expire stale open bets (past event dates, still PENDING)
      this.logger.logProcessing('TasksService', 'Step 0/6: Expiring stale open bets');
      try {
        const expiredCount = await this.expireStaleOpenBets();
        if (expiredCount > 0) {
          this.logger.logWarning(
            'TasksService',
            `Expired ${expiredCount} bets with past event dates`,
          );
        }
      } catch (expireError) {
        // Non-blocking: log and continue with the rest of the pipeline
        this.logger.logError(
          'TasksService',
          'Error expiring stale bets (non-blocking)',
          expireError,
        );
      }

      // Step 1: Fetch odds from API
      this.logger.logProcessing('TasksService', 'Step 1/6: Fetching odds from The Odds API');
      const events = await this.oddsService.fetchOdds();

      if (events.length === 0) {
        this.logger.logWarning('TasksService', 'No events returned from API');
        return;
      }

      // Step 2: Extract opportunities
      this.logger.logProcessing(
        'TasksService',
        'Step 2/6: Parsing events and extracting opportunities',
      );
      const allOpportunities = this.parserService.extractOpportunities(events);

      // Step 3: Apply filters
      this.logger.logProcessing('TasksService', 'Step 3/6: Applying strategy filters');
      const filteredOpportunities = this.filterService.applyFilters(allOpportunities);

      if (filteredOpportunities.length === 0) {
        this.logger.logWarning('TasksService', 'No opportunities passed filters');
        return;
      }

      // Step 4: Calculate risk scores, save opportunities, populate user_opportunities
      this.logger.logProcessing(
        'TasksService',
        'Step 4/6: Calculating risk scores and saving opportunities',
      );
      let savedCount = 0;
      let skippedCount = 0;

      // Get all users with bankroll (needed to populate user_opportunities)
      const allUserIds = await this.bankrollRepository.getAllUserIds();

      for (const opp of filteredOpportunities) {
        // Ensure event exists
        await this.eventsRepository.findOrCreate({
          event_id: opp.eventId,
          league: opp.league,
          home_team: opp.homeTeam,
          away_team: opp.awayTeam,
          commence_time: opp.commenceTime,
        });

        // Calculate risk
        const riskScore = this.riskService.calculateRisk({
          handicap: opp.handicap,
          odd: opp.odd,
        });

        // Save opportunity (only if doesn't exist)
        const opportunity = await this.opportunitiesRepository.findOrCreate({
          event_id: opp.eventId,
          team: opp.team,
          handicap: opp.handicap,
          odd: opp.odd,
          bookmaker: opp.bookmaker,
          risk_score: riskScore,
        });

        // Check if it was newly created (within last 5 seconds)
        let isNew = false;
        if (opportunity.created_at) {
          const diffSeconds = (Date.now() - new Date(opportunity.created_at).getTime()) / 1000;
          isNew = diffSeconds < 5;
        } else {
          isNew = true;
        }

        if (isNew) {
          savedCount++;
          // New opportunity → register for all existing users as pending
          if (allUserIds.length > 0 && opportunity.id) {
            await this.userOpportunitiesRepository.addOpportunityForUsers(
              opportunity.id,
              allUserIds,
            );
          }
        } else {
          skippedCount++;
        }
      }

      this.logger.logSuccess(
        'TasksService',
        `Saved ${savedCount} new opportunities, skipped ${skippedCount} duplicates`,
      );

      // Step 5 & 6: Build pairs PER USER and create bets
      this.logger.logProcessing(
        'TasksService',
        'Step 5-6/6: Building pairs and creating bets per user',
      );

      if (allUserIds.length === 0) {
        this.logger.logWarning('TasksService', 'No users with bankroll configured');
        return;
      }

      this.logger.log(`Found ${allUserIds.length} active user(s)`, 'TasksService');

      let totalBetsCreated = 0;
      let totalBetsSkipped = 0;
      let totalPairsBuilt = 0;

      for (const userId of allUserIds) {
        try {
          const pairs = await this.pairBuilderService.buildPairsForUser(userId);
          totalPairsBuilt += pairs.length;

          if (pairs.length === 0) {
            this.logger.log(`No new pairs for user ${userId}`, 'TasksService');
            continue;
          }

          const suggestedStake = await this.bankrollRepository.getSuggestedStakeAsAdmin(userId);
          const userPairs = pairs.map((p) => ({ ...p, suggested_stake: suggestedStake }));
          const uniquePairs = await this.betsRepository.filterDuplicates(userId, userPairs);
          totalBetsSkipped += userPairs.length - uniquePairs.length;

          const userBets = await this.betsRepository.createManyAsAdmin(userId, uniquePairs);
          totalBetsCreated += userBets.length;

          this.logger.log(
            `Created ${userBets.length} bets for user ${userId} (stake: R$ ${suggestedStake.toFixed(2)})`,
            'TasksService',
          );
        } catch (error) {
          this.logger.logError('TasksService', `Error processing user ${userId}`, error);
        }
      }

      // Execution summary
      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log('═══════════════════════════════════════', 'TasksService');
      this.logger.log('✅ PROCESSING COMPLETED SUCCESSFULLY', 'TasksService');
      this.logger.log('═══════════════════════════════════════', 'TasksService');
      this.logger.log(`Total events processed: ${events.length}`, 'TasksService');
      this.logger.log(`Opportunities extracted: ${allOpportunities.length}`, 'TasksService');
      this.logger.log(
        `Opportunities after filters: ${filteredOpportunities.length}`,
        'TasksService',
      );
      this.logger.log(`Opportunities saved: ${savedCount}`, 'TasksService');
      this.logger.log(`Total pairs built: ${totalPairsBuilt}`, 'TasksService');
      this.logger.log(`Active users: ${allUserIds.length}`, 'TasksService');
      this.logger.log(`Total bets created: ${totalBetsCreated}`, 'TasksService');
      this.logger.log(`Total bets skipped (duplicates): ${totalBetsSkipped}`, 'TasksService');
      this.logger.log(`Execution time: ${executionTime}s`, 'TasksService');
      this.logger.log('═══════════════════════════════════════', 'TasksService');
    } catch (error) {
      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log('═══════════════════════════════════════', 'TasksService');
      this.logger.logError('TasksService', '❌ ERROR IN SCHEDULED PROCESSING', error);
      this.logger.log(`Execution time: ${executionTime}s`, 'TasksService');
      this.logger.log('═══════════════════════════════════════', 'TasksService');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual trigger for testing (can be called via controller)
   */
  async processOddsManually() {
    this.logger.log('Manual processing triggered', 'TasksService');
    return this.processOdds();
  }

  /**
   * Re-generate bets from existing user_opportunities (skips API fetch).
   * Runs pairing per user, skipping already-paired opportunities.
   */
  async generateBetsManually(): Promise<{
    pairsBuilt: number;
    betsCreated: number;
    betsSkipped: number;
    usersProcessed: number;
  }> {
    this.logger.log('═══════════════════════════════════════', 'TasksService');
    this.logger.log('🎯 Starting manual bet generation (skipping odds fetch)', 'TasksService');
    this.logger.log('═══════════════════════════════════════', 'TasksService');

    const startTime = Date.now();

    try {
      const expiredCount = await this.expireStaleOpenBets();
      if (expiredCount > 0) {
        this.logger.logWarning(
          'TasksService',
          `Expired ${expiredCount} bets with past event dates`,
        );
      }
    } catch (expireError) {
      this.logger.logError('TasksService', 'Error expiring stale bets (non-blocking)', expireError);
    }

    const userIds = await this.bankrollRepository.getAllUserIds();

    if (userIds.length === 0) {
      this.logger.logWarning('TasksService', 'No users with bankroll configured');
      return { pairsBuilt: 0, betsCreated: 0, betsSkipped: 0, usersProcessed: 0 };
    }

    let totalPairsBuilt = 0;
    let totalBetsCreated = 0;
    let totalBetsSkipped = 0;

    for (const userId of userIds) {
      try {
        const pairs = await this.pairBuilderService.buildPairsForUser(userId);
        totalPairsBuilt += pairs.length;

        if (pairs.length === 0) continue;

        const suggestedStake = await this.bankrollRepository.getSuggestedStakeAsAdmin(userId);
        const userPairs = pairs.map((p) => ({ ...p, suggested_stake: suggestedStake }));
        const uniquePairs = await this.betsRepository.filterDuplicates(userId, userPairs);
        totalBetsSkipped += userPairs.length - uniquePairs.length;

        const userBets = await this.betsRepository.createManyAsAdmin(userId, uniquePairs);
        totalBetsCreated += userBets.length;

        this.logger.log(
          `Created ${userBets.length} bets for user ${userId} (stake: R$ ${suggestedStake.toFixed(2)})`,
          'TasksService',
        );
      } catch (error) {
        this.logger.logError('TasksService', `Error creating bets for user ${userId}`, error);
      }
    }

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    this.logger.log('═══════════════════════════════════════', 'TasksService');
    this.logger.logSuccess(
      'TasksService',
      `Bet generation done — ${totalPairsBuilt} pairs, ${totalBetsCreated} bets created, ${totalBetsSkipped} skipped (${executionTime}s)`,
    );
    this.logger.log('═══════════════════════════════════════', 'TasksService');

    return {
      pairsBuilt: totalPairsBuilt,
      betsCreated: totalBetsCreated,
      betsSkipped: totalBetsSkipped,
      usersProcessed: userIds.length,
    };
  }

  /**
   * Generate bets for a newly onboarded user.
   * 1. Populate user_opportunities with ALL active (future) opportunities as pending.
   * 2. Run pairing for this user using their fresh user_opportunities.
   * This is completely independent of what status other users' opportunities have.
   */
  async generateBetsForNewUser(userId: string): Promise<{ betsCreated: number }> {
    this.logger.log(`Generating bets for new user ${userId}`, 'TasksService');

    // 1. Fetch all active global opportunities (status=pending AND future event)
    const activeOpportunities = await this.opportunitiesRepository.findActiveWithEventData();

    if (activeOpportunities.length === 0) {
      this.logger.logWarning(
        'TasksService',
        `No active opportunities found for new user ${userId}`,
      );
      return { betsCreated: 0 };
    }

    // 2. Create user_opportunities rows for this user (all as pending)
    const opportunityIds = activeOpportunities.map((o: any) => o.id).filter(Boolean) as string[];

    await this.userOpportunitiesRepository.createManyForUser(userId, opportunityIds, 'pending');

    this.logger.log(
      `Bootstrapped ${opportunityIds.length} user_opportunities for new user ${userId}`,
      'TasksService',
    );

    // 3. Run pairing for this user (uses user_opportunities, fully isolated)
    const pairs = await this.pairBuilderService.buildPairsForUser(userId);

    if (pairs.length === 0) {
      this.logger.logWarning(
        'TasksService',
        `No pairs could be built for new user ${userId} (${opportunityIds.length} opportunities available)`,
      );
      return { betsCreated: 0 };
    }

    // 4. Create bets
    const suggestedStake = await this.bankrollRepository.getSuggestedStakeAsAdmin(userId);
    const pairsWithStake = pairs.map((p) => ({ ...p, suggested_stake: suggestedStake }));
    const uniquePairs = await this.betsRepository.filterDuplicates(userId, pairsWithStake);
    const created = await this.betsRepository.createManyAsAdmin(userId, uniquePairs);

    this.logger.logSuccess(
      'TasksService',
      `Created ${created.length} bets for new user ${userId} (stake: R$ ${suggestedStake.toFixed(2)})`,
    );

    return { betsCreated: created.length };
  }

  /**
   * Health check - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'healthCheck',
  })
  async healthCheck() {
    this.logger.log('🏥 Running health check', 'TasksService');

    const pairingStats = await this.pairBuilderService.getPairingStats();

    this.logger.log(`Pending opportunities: ${pairingStats.pendingOpportunities}`, 'TasksService');
    this.logger.log(`Possible pairs: ${pairingStats.possiblePairs}`, 'TasksService');
  }

  /**
   * Expire open bets whose event dates are fully in the past (d-1 or older).
   * Runs as a preliminary step before every cron cycle and manual generation.
   * Returns the number of bets expired.
   */
  private async expireStaleOpenBets(): Promise<number> {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch all pending bets across all users
    const pendingBets = await this.betsRepository.findAllPendingAsAdmin();
    if (pendingBets.length === 0) return 0;

    // Collect unique opportunity IDs from both legs of each bet
    const oppIds = [...new Set(pendingBets.flatMap((b) => [b.game1_id, b.game2_id]))];

    // Fetch event dates for those opportunities
    const oppsWithEvents = await this.opportunitiesRepository.findByIdsWithEventData(oppIds);
    const oppDateMap = new Map<string, string>(
      oppsWithEvents.map((opp: any) => [
        opp.id as string,
        new Date(opp.events.commence_time).toISOString().split('T')[0],
      ]),
    );

    // A bet is stale when the EARLIEST of its two event dates is before today
    const staleBetIds = pendingBets
      .filter((bet) => {
        const date1 = oppDateMap.get(bet.game1_id);
        const date2 = oppDateMap.get(bet.game2_id);
        if (!date1 || !date2) return false; // can't determine — skip to be safe
        const earliest = date1 < date2 ? date1 : date2;
        return earliest < todayStr;
      })
      .map((bet) => bet.id as string)
      .filter(Boolean);

    if (staleBetIds.length > 0) {
      await this.betsRepository.expireManyAsAdmin(staleBetIds);
    }

    return staleBetIds.length;
  }
}
