import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Logger } from '../../utils/logger';
import { OddsApiResponse } from './interfaces/odds-api.interface';
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
   * Fetch odds from The Odds API (or mock data)
   */
  async fetchOdds(): Promise<OddsApiResponse[]> {
    // 🧪 MODO MOCK - Não gasta requisições da API
    if (this.useMock) {
      this.logger.log('🧪 Using MOCK data (not calling real API)', 'OddsService');
      return (mockData as any).default || mockData;
    }

    // 🌐 MODO REAL - Chama The Odds API
    const sportKey = this.configService.get<string>('SPORT_KEY', 'soccer_brazil_campeonato');
    const regions = this.configService.get<string>('REGIONS', 'eu');
    const markets = this.configService.get<string>('MARKET', 'spreads');
    const oddsFormat = this.configService.get<string>('ODDS_FORMAT', 'decimal');

    const url = `${this.baseUrl}/sports/${sportKey}/odds`;

    const params = {
      apiKey: this.apiKey,
      regions,
      markets,
      oddsFormat,
    };

    this.logger.logAPI('OddsService', 'GET', url);
    this.logger.debug(`Params: ${JSON.stringify(params)}`, 'OddsService');

    try {
      const response = await firstValueFrom(
        this.httpService.get<OddsApiResponse[]>(url, { params }),
      );

      this.logger.logSuccess(
        'OddsService',
        `Fetched ${response.data.length} events from The Odds API`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.logError('OddsService', 'Error fetching odds from API', error);

      if (error.response) {
        // API returned error response
        const status = error.response.status;
        const message = error.response.data?.message || error.message;

        if (status === 401) {
          throw new HttpException('Invalid API key for The Odds API', HttpStatus.UNAUTHORIZED);
        }

        if (status === 429) {
          throw new HttpException(
            'Rate limit exceeded for The Odds API',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        throw new HttpException(`The Odds API error: ${message}`, status);
      }

      // Network or other error
      throw new HttpException('Failed to connect to The Odds API', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Get remaining requests info (from response headers)
   */
  async getApiUsage(): Promise<{
    requestsRemaining: number;
    requestsUsed: number;
  }> {
    try {
      const sportKey = this.configService.get<string>('SPORT_KEY', 'soccer_brazil_campeonato');
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
