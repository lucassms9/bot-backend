import { Controller, Get, Post, Query } from '@nestjs/common';
import { OddsService } from '../odds/odds.service';
import { ParserService } from '../odds/parser.service';
import { FilterService } from '../odds/filter.service';
import { RiskService } from '../risk/risk.service';
import { Logger } from '../../utils/logger';

@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private oddsService: OddsService,
    private parserService: ParserService,
    private filterService: FilterService,
    private riskService: RiskService,
  ) {}

  /**
   * 🧪 Testar conexão com The Odds API
   */
  @Get('api-connection')
  async testApiConnection() {
    this.logger.log('🧪 Testing API connection', 'TestController');

    try {
      const usage = await this.oddsService.getApiUsage();

      return {
        success: true,
        message: 'API connection successful',
        usage,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'API connection failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🧪 Testar fluxo completo (sem salvar no banco)
   */
  @Get('dry-run')
  async dryRun() {
    this.logger.log('🧪 Running dry-run test (no database)', 'TestController');

    try {
      // 1. Buscar odds
      const events = await this.oddsService.fetchOdds();

      // 2. Extrair oportunidades
      const opportunities = this.parserService.extractOpportunities(events);

      // 3. Aplicar filtros
      const filtered = this.filterService.applyFilters(opportunities);

      // 4. Calcular risk scores
      const withRisk = filtered.map((opp) => ({
        ...opp,
        riskScore: this.riskService.calculateRisk({
          handicap: opp.handicap,
          odd: opp.odd,
        }),
        riskCategory: this.riskService.getRiskCategory(
          this.riskService.calculateRisk({
            handicap: opp.handicap,
            odd: opp.odd,
          }),
        ),
      }));

      // Ordenar por risk score
      const sorted = withRisk.sort((a, b) => a.riskScore - b.riskScore);

      return {
        success: true,
        summary: {
          eventsFromAPI: events.length,
          opportunitiesExtracted: opportunities.length,
          afterFilters: filtered.length,
          discarded: opportunities.length - filtered.length,
        },
        topOpportunities: sorted.slice(0, 10),
        filterStats: this.filterService.getFilterStats(opportunities),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🧪 Calcular risk score para valores específicos
   */
  @Get('calculate-risk')
  async calculateRisk(@Query('handicap') handicap: string, @Query('odd') odd: string) {
    const handicapNum = parseFloat(handicap);
    const oddNum = parseFloat(odd);

    if (isNaN(handicapNum) || isNaN(oddNum)) {
      return {
        success: false,
        message: 'Invalid parameters. Use: ?handicap=1.5&odd=1.32',
      };
    }

    const riskScore = this.riskService.calculateRisk({
      handicap: handicapNum,
      odd: oddNum,
    });

    const category = this.riskService.getRiskCategory(riskScore);

    return {
      success: true,
      input: {
        handicap: handicapNum,
        odd: oddNum,
      },
      result: {
        riskScore,
        category,
      },
      interpretation: {
        'Very Low': '< 0.5 - Excelente oportunidade',
        Low: '0.5 - 1.0 - Boa oportunidade',
        Medium: '1.0 - 1.5 - Oportunidade moderada',
        High: '1.5 - 2.0 - Risco elevado',
        'Very High': '> 2.0 - Evitar',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🧪 Simular pareamento de duplas
   */
  @Post('simulate-pairs')
  async simulatePairs() {
    this.logger.log('🧪 Simulating bet pairs', 'TestController');

    try {
      // Buscar e processar opportunities
      const events = await this.oddsService.fetchOdds();
      const opportunities = this.parserService.extractOpportunities(events);
      const filtered = this.filterService.applyFilters(opportunities);

      const withRisk = filtered
        .map((opp) => ({
          ...opp,
          riskScore: this.riskService.calculateRisk({
            handicap: opp.handicap,
            odd: opp.odd,
          }),
        }))
        .sort((a, b) => a.riskScore - b.riskScore);

      // Simular pareamento
      const pairs = [];
      const minPairOdd = 1.6;

      for (let i = 0; i < withRisk.length - 1; i++) {
        for (let j = i + 1; j < withRisk.length; j++) {
          const game1 = withRisk[i];
          const game2 = withRisk[j];

          if (game1.eventId !== game2.eventId) {
            const oddTotal = game1.odd * game2.odd;

            if (oddTotal >= minPairOdd) {
              pairs.push({
                game1: {
                  team: game1.team,
                  handicap: game1.handicap,
                  odd: game1.odd,
                  risk: game1.riskScore,
                },
                game2: {
                  team: game2.team,
                  handicap: game2.handicap,
                  odd: game2.odd,
                  risk: game2.riskScore,
                },
                oddTotal: Math.round(oddTotal * 100) / 100,
                riskTotal: Math.round((game1.riskScore + game2.riskScore) * 100) / 100,
              });
              break; // Próximo game1
            }
          }
        }
      }

      return {
        success: true,
        summary: {
          opportunitiesAnalyzed: withRisk.length,
          pairsFound: pairs.length,
          minOddRequired: minPairOdd,
        },
        pairs: pairs.slice(0, 5), // Top 5 pares
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🧪 Informações do sistema
   */
  @Get('info')
  async getInfo() {
    return {
      success: true,
      system: {
        name: 'Bot de Apostas - Handicap Asiático',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      configuration: {
        minHandicap: parseFloat(process.env.MIN_HANDICAP || '1.0'),
        minOdd: parseFloat(process.env.MIN_ODD || '1.25'),
        maxOdd: parseFloat(process.env.MAX_ODD || '1.55'),
        minPairOdd: parseFloat(process.env.MIN_PAIR_ODD || '1.6'),
        sportKey: process.env.SPORT_KEY || 'soccer_brazil_campeonato',
      },
      endpoints: {
        production: 'POST /scheduler/process-now',
        tests: {
          apiConnection: 'GET /test/api-connection',
          dryRun: 'GET /test/dry-run',
          calculateRisk: 'GET /test/calculate-risk?handicap=1.5&odd=1.32',
          simulatePairs: 'POST /test/simulate-pairs',
        },
        odds: {
          fetch: 'GET /odds/fetch',
          usage: 'GET /odds/usage',
        },
        bets: {
          buildPairs: 'POST /bets/build-pairs',
          list: 'GET /bets',
          statistics: 'GET /bets/statistics',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
