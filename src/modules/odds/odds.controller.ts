import { Controller, Get } from '@nestjs/common';
import { OddsService } from './odds.service';
import { ParserService } from './parser.service';
import { FilterService } from './filter.service';
import { Logger } from '../../utils/logger';

@Controller('odds')
export class OddsController {
  private readonly logger = new Logger(OddsController.name);

  constructor(
    private oddsService: OddsService,
    private parserService: ParserService,
    private filterService: FilterService,
  ) {}

  /**
   * Manual endpoint to fetch and process odds
   */
  @Get('fetch')
  async fetchOdds() {
    this.logger.log('Manual odds fetch triggered', 'OddsController');

    try {
      // 1. Fetch from API
      const events = await this.oddsService.fetchOdds();

      // 2. Extract opportunities
      const opportunities = this.parserService.extractOpportunities(events);

      // 3. Apply filters
      const filtered = this.filterService.applyFilters(opportunities);

      // 4. Log statistics
      this.filterService.logFilterStats(opportunities);

      return {
        success: true,
        summary: {
          eventsProcessed: events.length,
          opportunitiesExtracted: opportunities.length,
          opportunitiesFiltered: filtered.length,
        },
        opportunities: filtered,
      };
    } catch (error) {
      this.logger.logError('OddsController', 'Error in manual fetch', error);
      throw error;
    }
  }

  /**
   * Get API usage statistics
   */
  @Get('usage')
  async getApiUsage() {
    return this.oddsService.getApiUsage();
  }
}
