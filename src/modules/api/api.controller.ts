import { Controller, Get, Param, Query, Post, Patch, Body } from '@nestjs/common';
import { OpportunitiesRepository } from '../database/repositories/opportunities.repository';
import { BetsRepository } from '../database/repositories/bets.repository';
import { EventsRepository } from '../database/repositories/events.repository';
import { BankrollService } from '../bankroll/bankroll.service';
import { OpportunityStatus } from '../../common/constants/strategy.constants';
import { Logger } from '../../utils/logger';

@Controller('api')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(
    private opportunitiesRepository: OpportunitiesRepository,
    private betsRepository: BetsRepository,
    private eventsRepository: EventsRepository,
    private bankrollService: BankrollService,
  ) {}

  /**
   * 📋 Listar todas as oportunidades (apostas individuais)
   * GET /api/opportunities
   */
  @Get('opportunities')
  async getOpportunities(@Query('status') status?: string) {
    this.logger.log('Getting opportunities list', 'ApiController');

    // Buscar oportunidades
    const opportunities = status
      ? await this.opportunitiesRepository.findByStatus(status as OpportunityStatus)
      : await this.opportunitiesRepository.findByStatus(OpportunityStatus.PENDING);

    // Enriquecer com dados dos eventos
    const enriched = await Promise.all(
      opportunities.map(async (opp) => {
        const event = await this.eventsRepository.findByEventId(opp.event_id);

        return {
          id: opp.id,
          status: opp.status,

          // Informações do jogo
          match: {
            eventId: opp.event_id,
            league: event?.league || 'Brazil Série A',
            homeTeam: event?.home_team || '',
            awayTeam: event?.away_team || '',
            kickoff: event?.commence_time,
            kickoffFormatted: this.formatDate(event?.commence_time),
          },

          // Informações da aposta
          bet: {
            team: opp.team,
            handicap: opp.handicap,
            odd: opp.odd,
            bookmaker: opp.bookmaker,
          },

          // Análise de risco
          risk: {
            score: opp.risk_score,
            category: this.getRiskCategory(opp.risk_score),
            stars: this.getRiskStars(opp.risk_score),
          },

          // Metadados
          createdAt: opp.created_at,
          createdAtFormatted: this.formatDate(opp.created_at),
        };
      }),
    );

    // Ordenar por risk score (menor primeiro)
    const sorted = enriched.sort((a, b) => a.risk.score - b.risk.score);

    return {
      success: true,
      count: sorted.length,
      opportunities: sorted,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🎲 Listar duplas de apostas
   * GET /api/bets
   */
  @Get('bets')
  async getBets(@Query('status') status?: string) {
    this.logger.log('Getting bets list', 'ApiController');

    // Buscar todas as apostas
    const bets = await this.betsRepository.findAll();

    // Filtrar por status se fornecido
    const filtered = status ? bets.filter((bet) => bet.result === status) : bets;

    // Enriquecer com dados completos
    const enriched = await Promise.all(
      filtered.map(async (bet) => {
        // Buscar as 2 oportunidades da dupla
        const [game1, game2] = await Promise.all([
          this.opportunitiesRepository.findById(bet.game1_id),
          this.opportunitiesRepository.findById(bet.game2_id),
        ]);

        if (!game1 || !game2) {
          return null;
        }

        // Buscar eventos
        const [event1, event2] = await Promise.all([
          this.eventsRepository.findByEventId(game1.event_id),
          this.eventsRepository.findByEventId(game2.event_id),
        ]);

        return {
          id: bet.id,
          status: bet.result || 'pending',

          // Informações da dupla
          summary: {
            oddTotal: bet.odd_total,
            riskTotal: bet.risk_total,
            riskCategory: this.getRiskCategory(bet.risk_total / 2), // média
            potentialProfit: this.calculateProfit(100, bet.odd_total),
            profitPercentage: ((bet.odd_total - 1) * 100).toFixed(2),
          },

          // Valores de aposta
          suggestedStake: bet.suggested_stake,
          stake: bet.stake,

          // Jogo 1
          game1: {
            id: game1.id,
            team: game1.team,
            handicap: game1.handicap,
            odd: game1.odd,
            bookmaker: game1.bookmaker,
            riskScore: game1.risk_score,
            riskCategory: this.getRiskCategory(game1.risk_score),
            match: {
              league: event1?.league || 'Brazil Série A',
              homeTeam: event1?.home_team || '',
              awayTeam: event1?.away_team || '',
              kickoff: event1?.commence_time,
              kickoffFormatted: this.formatDate(event1?.commence_time),
            },
          },

          // Jogo 2
          game2: {
            id: game2.id,
            team: game2.team,
            handicap: game2.handicap,
            odd: game2.odd,
            bookmaker: game2.bookmaker,
            riskScore: game2.risk_score,
            riskCategory: this.getRiskCategory(game2.risk_score),
            match: {
              league: event2?.league || 'Brazil Série A',
              homeTeam: event2?.home_team || '',
              awayTeam: event2?.away_team || '',
              kickoff: event2?.commence_time,
              kickoffFormatted: this.formatDate(event2?.commence_time),
            },
          },

          // Resultado
          result: {
            status: bet.result || 'pending',
            profit: bet.profit,
          },

          // Metadados
          createdAt: bet.created_at,
          createdAtFormatted: this.formatDate(bet.created_at),
        };
      }),
    );

    // Remover nulls e ordenar por data (mais recentes primeiro)
    const valid = enriched
      .filter((bet): bet is NonNullable<typeof bet> => bet !== null && bet.createdAt !== undefined)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    return {
      success: true,
      count: valid.length,
      bets: valid,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 📊 Detalhes de uma aposta específica
   * GET /api/bets/:id
   */
  @Get('bets/:id')
  async getBetDetails(@Param('id') id: string) {
    const bets = await this.getBets();
    const bet = bets.bets.find((b) => b?.id === id);

    if (!bet) {
      return {
        success: false,
        error: 'Bet not found',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      bet,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🏆 Top oportunidades (menores risk scores)
   * GET /api/top-opportunities
   */
  @Get('top-opportunities')
  async getTopOpportunities(@Query('limit') limit?: string) {
    const maxLimit = limit ? parseInt(limit, 10) : 10;

    const opportunities = await this.getOpportunities();
    const top = opportunities.opportunities.slice(0, maxLimit);

    return {
      success: true,
      count: top.length,
      topOpportunities: top,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 📈 Estatísticas gerais
   * GET /api/stats
   */
  @Get('stats')
  async getStats() {
    const [opportunities, bets] = await Promise.all([this.getOpportunities(), this.getBets()]);

    const pendingOpps = opportunities.opportunities.filter((o) => o.status === 'pending').length;

    const pendingBets = bets.bets.filter((b) => b?.status === 'pending').length;
    const wonBets = bets.bets.filter((b) => b?.status === 'won').length;
    const lostBets = bets.bets.filter((b) => b?.status === 'lost').length;

    const totalProfit = bets.bets.reduce((sum, bet) => sum + (bet?.result?.profit || 0), 0);

    const avgOdd =
      bets.bets.length > 0
        ? bets.bets.reduce((sum, bet) => sum + (bet?.summary?.oddTotal || 0), 0) / bets.bets.length
        : 0;

    const avgRisk =
      opportunities.opportunities.length > 0
        ? opportunities.opportunities.reduce((sum, opp) => sum + opp.risk.score, 0) /
          opportunities.opportunities.length
        : 0;

    return {
      success: true,
      stats: {
        opportunities: {
          total: opportunities.count,
          pending: pendingOpps,
          paired: opportunities.count - pendingOpps,
          averageRisk: parseFloat(avgRisk.toFixed(2)),
        },
        bets: {
          total: bets.count,
          pending: pendingBets,
          won: wonBets,
          lost: lostBets,
          winRate:
            wonBets + lostBets > 0
              ? parseFloat(((wonBets / (wonBets + lostBets)) * 100).toFixed(2))
              : 0,
          averageOdd: parseFloat(avgOdd.toFixed(2)),
          totalProfit: parseFloat(totalProfit.toFixed(2)),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 💰 Obter saldo atual da banca
   * GET /api/bankroll
   */
  @Get('bankroll')
  async getBankroll() {
    try {
      const bankroll = await this.bankrollService.getCurrent();
      const stats = await this.bankrollService.getStats();

      return {
        success: true,
        bankroll: {
          id: bankroll.id,
          currentBalance: bankroll.current_balance,
          initialBalance: bankroll.initial_balance,
          currency: bankroll.currency,
          stakePercentage: bankroll.stake_percentage,
          profit: stats.profit,
          profitPercentage: stats.profitPercentage.toFixed(2),
          suggestedStake: stats.suggestedStake,
          updatedAt: bankroll.updated_at,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 💵 Criar ou atualizar saldo da banca
   * POST /api/bankroll
   * Body: { "initial_balance": 1000, "currency": "BRL", "stake_percentage": 10 }
   */
  @Post('bankroll')
  async createOrUpdateBankroll(
    @Body() body: { initial_balance: number; currency?: string; stake_percentage?: number },
  ) {
    try {
      const bankroll = await this.bankrollService.createOrUpdate({
        initial_balance: body.initial_balance,
        currency: body.currency || 'BRL',
        stake_percentage: body.stake_percentage || 10,
      });

      return {
        success: true,
        message: 'Bankroll created/updated successfully',
        bankroll: {
          id: bankroll.id,
          currentBalance: bankroll.current_balance,
          initialBalance: bankroll.initial_balance,
          currency: bankroll.currency,
          stakePercentage: bankroll.stake_percentage,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🎯 Marcar resultado de uma aposta
   * PATCH /api/bets/:id/result
   * Body: { "result": "won" | "lost", "stake": 100 }
   */
  @Patch('bets/:id/result')
  async markBetResult(
    @Param('id') id: string,
    @Body() body: { result: 'won' | 'lost'; stake: number },
  ) {
    try {
      // Buscar a aposta
      const bet = await this.betsRepository.findById(id);
      if (!bet) {
        return {
          success: false,
          error: 'Bet not found',
          timestamp: new Date().toISOString(),
        };
      }

      // Calcular lucro/prejuízo
      let profit = 0;
      if (body.result === 'won') {
        profit = body.stake * (bet.odd_total - 1);
      } else {
        profit = -body.stake;
      }

      // Atualizar aposta no banco
      const updatedBet = await this.betsRepository.update(id, {
        result: body.result as any,
        stake: body.stake,
        profit: profit,
      });

      // Atualizar bankroll
      const updatedBankroll = await this.bankrollService.processBetResult(
        id,
        body.result,
        body.stake,
        bet.odd_total,
      );

      return {
        success: true,
        message: `Bet marked as ${body.result}`,
        bet: {
          id: updatedBet.id,
          result: updatedBet.result,
          stake: body.stake,
          profit: profit.toFixed(2),
          oddTotal: bet.odd_total,
        },
        bankroll: {
          currentBalance: updatedBankroll.current_balance,
          profit: updatedBankroll.current_balance - updatedBankroll.initial_balance,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private getRiskCategory(score: number): string {
    if (score < 0.5) return 'Excelente';
    if (score < 1.0) return 'Ótimo';
    if (score < 1.5) return 'Bom';
    if (score < 2.0) return 'Moderado';
    return 'Alto';
  }

  private getRiskStars(score: number): number {
    if (score < 0.5) return 5;
    if (score < 1.0) return 4;
    if (score < 1.5) return 3;
    if (score < 2.0) return 2;
    return 1;
  }

  private calculateProfit(stake: number, odd: number): string {
    const profit = stake * odd - stake;
    return profit.toFixed(2);
  }

  private formatDate(date: any): string {
    if (!date) return '';

    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    };

    return new Intl.DateTimeFormat('pt-BR', options).format(d);
  }
}
