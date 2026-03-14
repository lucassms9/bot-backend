import { Controller, Get, Post } from '@nestjs/common';
import { BetsService } from './bets.service';
import { PairBuilderService } from './pair-builder.service';
import { Logger } from '../../utils/logger';

@Controller('bets')
export class BetsController {
  private readonly logger = new Logger(BetsController.name);

  constructor(
    private betsService: BetsService,
    private pairBuilderService: PairBuilderService,
  ) {}

  /**
   * Manual endpoint to build pairs
   */
  @Post('build-pairs')
  async buildPairs() {
    this.logger.log('Manual pair building triggered', 'BetsController');

    try {
      const pairs = await this.pairBuilderService.buildPairs();
      const createdBets = await this.betsService.createMany(pairs);

      return {
        success: true,
        summary: {
          pairsCreated: createdBets.length,
        },
        bets: createdBets,
      };
    } catch (error) {
      this.logger.logError('BetsController', 'Error building pairs', error);
      throw error;
    }
  }

  /**
   * Get all bets
   */
  @Get()
  async getAllBets() {
    return this.betsService.findAll();
  }

  /**
   * Get pending bets
   */
  @Get('pending')
  async getPendingBets() {
    return this.betsService.getPendingBets();
  }

  /**
   * Get bet statistics
   */
  @Get('statistics')
  async getStatistics() {
    return this.betsService.getStatistics();
  }

  /**
   * Get pairing statistics
   */
  @Get('pairing-stats')
  async getPairingStats() {
    return this.pairBuilderService.getPairingStats();
  }
}
