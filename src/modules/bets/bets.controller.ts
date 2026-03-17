import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BetsService } from './bets.service';
import { PairBuilderService } from './pair-builder.service';
import { Logger } from '../../utils/logger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/interfaces/user.interface';

@Controller('bets')
@UseGuards(JwtAuthGuard)
export class BetsController {
  private readonly logger = new Logger(BetsController.name);

  constructor(
    private betsService: BetsService,
    private pairBuilderService: PairBuilderService,
  ) {}

  /**
   * Manual endpoint to build pairs for current user
   */
  @Post('build-pairs')
  async buildPairs(@CurrentUser() user: User) {
    this.logger.log(`Manual pair building triggered by user ${user.id}`, 'BetsController');

    try {
      const pairs = await this.pairBuilderService.buildPairsForUser(user.id);
      const createdBets = await this.betsService.createMany(user.id, pairs);

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
   * Get all bets for current user
   */
  @Get()
  async getAllBets(@CurrentUser() user: User) {
    return this.betsService.findAll(user.id);
  }

  /**
   * Get pending bets for current user
   */
  @Get('pending')
  async getPendingBets(@CurrentUser() user: User) {
    return this.betsService.getPendingBets(user.id);
  }

  /**
   * Get bet statistics for current user
   */
  @Get('statistics')
  async getStatistics(@CurrentUser() user: User) {
    return this.betsService.getStatistics(user.id);
  }

  /**
   * Get pairing statistics (shared data)
   */
  @Get('pairing-stats')
  async getPairingStats() {
    return this.pairBuilderService.getPairingStats();
  }
}
