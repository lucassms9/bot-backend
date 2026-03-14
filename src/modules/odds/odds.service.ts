import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Logger } from '../../utils/logger';
import { OddsApiResponse } from './interfaces/odds-api.interface';
import { SUPPORTED_LEAGUES } from './constants/leagues.constants';
import * as mockData from './mocks/odds-mock-data.json';

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly useMock: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl =
      this.configService.get<string>('ODDS_API_BASE_URL') || 'https://api.the-odds-api.com/v4';
    this.apiKey = this.configService.get<string>('ODDS_API_KEY') || '';
    this.useMock = this.configService.get<string>('USE_MOCK_DATA') === 'true';
  }

  /**
   * Fetch odds from The Odds API for all supported leagues (or mock data)
   */
  async fetchOdds(): Promise<OddsApiResponse[]> {
    // 🧪 MODO MOCK - Não gasta requisições da API
    if (this.useMock) {
      this.logger.log('🧪 Using MOCK data (not calling real API)', 'OddsService');
      return (mockData as any).default || mockData;
    }

    // 🌐 MODO REAL - Chama The Odds API para todas as 16 ligas
    this.logger.log(`🌍 Fetching odds from ${SUPPORTED_LEAGUES.length} leagues`, 'OddsService');

    const regions = this.configService.get<string>('REGIONS', 'eu');
    const markets = this.configService.get<string>('MARKET', 'spreads');
    const oddsFormat = this.configService.get<string>('ODDS_FORMAT', 'decimal');

    try {
      // Buscar dados de todas as ligas em paralelo
      const results = await Promise.allSettled(
        SUPPORTED_LEAGUES.map((league) =>
          this.fetchLeagueOdds(league, regions, markets, oddsFormat),
        ),
      );

      // Processar resultados
      const allEvents: OddsApiResponse[] = [];
      let successCount = 0;
      let errorCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allEvents.push(...result.value);
          successCount++;
          this.logger.debug(
            `✓ ${SUPPORTED_LEAGUES[index]}: ${result.value.length} events`,
            'OddsService',
          );
        } else {
          errorCount++;
          this.logger.logWarning(
            'OddsService',
            `✗ ${SUPPORTED_LEAGUES[index]}: ${result.reason.message}`,
          );
        }
      });

      this.logger.logSuccess(
        'OddsService',
        `Fetched ${allEvents.length} events from ${successCount}/${SUPPORTED_LEAGUES.length} leagues (${errorCount} errors)`,
      );

      return allEvents;
    } catch (error: any) {
      this.logger.logError('OddsService', 'Critical error fetching odds', error);
      throw new HttpException('Failed to fetch odds from API', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Fetch odds for a single league
   */
  private async fetchLeagueOdds(
    sportKey: string,
    regions: string,
    markets: string,
    oddsFormat: string,
  ): Promise<OddsApiResponse[]> {
    const url = `${this.baseUrl}/sports/${sportKey}/odds`;

    const params = {
      apiKey: this.apiKey,
      regions,
      markets,
      oddsFormat,
    };

    const response = await firstValueFrom(this.httpService.get<OddsApiResponse[]>(url, { params }));

    return response.data;
  }

  /**
   * Get remaining requests info (from response headers)
   */
  async getApiUsage(): Promise<{
    requestsRemaining: number;
    requestsUsed: number;
  }> {
    try {
      // Use a primeira liga como exemplo para obter informações de uso da API
      const sportKey = SUPPORTED_LEAGUES[0];
      const url = `${this.baseUrl}/sports/${sportKey}/odds`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            apiKey: this.apiKey,
            regions: 'eu',
            markets: 'spreads',
          },
        }),
      );

      const requestsUsed = parseInt(response.headers['x-requests-used'] || '0', 10);
      const requestsRemaining = parseInt(response.headers['x-requests-remaining'] || '0', 10);

      this.logger.log(
        `API Usage - Used: ${requestsUsed}, Remaining: ${requestsRemaining}`,
        'OddsService',
      );

      return {
        requestsUsed,
        requestsRemaining,
      };
    } catch (error) {
      this.logger.logError('OddsService', 'Error getting API usage', error);
      return {
        requestsUsed: 0,
        requestsRemaining: 0,
      };
    }
  }
}
