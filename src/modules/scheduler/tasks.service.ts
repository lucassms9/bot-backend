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
      // Step 1: Fetch odds from API
      this.logger.logProcessing('TasksService', 'Step 1/4: Fetching odds from The Odds API');
      const events = await this.oddsService.fetchOdds();

      if (events.length === 0) {
        this.logger.logWarning('TasksService', 'No events returned from API');
        return;
      }

      // Step 2: Extract opportunities
      this.logger.logProcessing(
        'TasksService',
        'Step 2/4: Parsing events and extracting opportunities',
      );
      const allOpportunities = this.parserService.extractOpportunities(events);

      // Step 3: Apply filters
      this.logger.logProcessing('TasksService', 'Step 3/4: Applying strategy filters');
      const filteredOpportunities = this.filterService.applyFilters(allOpportunities);

      if (filteredOpportunities.length === 0) {
        this.logger.logWarning('TasksService', 'No opportunities passed filters');
        return;
      }

      // Step 4: Calculate risk scores and save opportunities
      this.logger.logProcessing(
        'TasksService',
        'Step 4/4: Calculating risk scores and saving opportunities',
      );
      let savedCount = 0;

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

        // Save opportunity
        await this.opportunitiesRepository.create({
          event_id: opp.eventId,
          team: opp.team,
          handicap: opp.handicap,
          odd: opp.odd,
          bookmaker: opp.bookmaker,
          risk_score: riskScore,
        });

        savedCount++;
      }

      this.logger.logSuccess('TasksService', `Saved ${savedCount} opportunities to database`);

      // Step 5: Build bet pairs from opportunities
      this.logger.logProcessing('TasksService', 'Step 5/6: Building bet pairs');
      const pairs = await this.pairBuilderService.buildPairs();

      if (pairs.length === 0) {
        this.logger.logWarning('TasksService', 'No pairs could be built from opportunities');
        return;
      }

      this.logger.logSuccess('TasksService', `Built ${pairs.length} bet pairs`);

      // Step 6: Create bets for all users
      this.logger.logProcessing('TasksService', 'Step 6/6: Creating bets for all users');

      // Get all users with bankroll
      const userIds = await this.bankrollRepository.getAllUserIds();

      if (userIds.length === 0) {
        this.logger.logWarning('TasksService', 'No users with bankroll configured');
        return;
      }

      this.logger.log(`Found ${userIds.length} active user(s)`, 'TasksService');

      let totalBetsCreated = 0;

      // Create bets for each user
      for (const userId of userIds) {
        try {
          // Get user's suggested stake (using admin method to bypass RLS)
          const suggestedStake = await this.bankrollRepository.getSuggestedStakeAsAdmin(userId);

          // Add suggested_stake to pairs
          const userPairs = pairs.map((pair) => ({
            ...pair,
            suggested_stake: suggestedStake,
          }));

          // Create bets for this user (using admin method to bypass RLS)
          const userBets = await this.betsRepository.createManyAsAdmin(userId, userPairs);
          totalBetsCreated += userBets.length;

          this.logger.log(
            `Created ${userBets.length} bets for user ${userId} (stake: R$ ${suggestedStake.toFixed(2)})`,
            'TasksService',
          );
        } catch (error) {
          this.logger.logError('TasksService', `Error creating bets for user ${userId}`, error);
          // Continue with other users
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
      this.logger.log(`Bet pairs built: ${pairs.length}`, 'TasksService');
      this.logger.log(`Active users: ${userIds.length}`, 'TasksService');
      this.logger.log(`Total bets created: ${totalBetsCreated}`, 'TasksService');
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
}
