import { Injectable } from '@nestjs/common';
import { Logger } from '../../utils/logger';
import {
  OddsApiResponse,
  ExtractedOpportunity,
  Bookmaker,
  Market,
  Outcome,
} from './interfaces/odds-api.interface';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  /**
   * Extract opportunities from API events
   */
  extractOpportunities(events: OddsApiResponse[]): ExtractedOpportunity[] {
    this.logger.logProcessing('ParserService', `Parsing ${events.length} events`);

    const allOpportunities: ExtractedOpportunity[] = [];

    for (const event of events) {
      const eventOpportunities = this.parseEvent(event);
      allOpportunities.push(...eventOpportunities);
    }

    this.logger.logSuccess(
      'ParserService',
      `Extracted ${allOpportunities.length} total opportunities`,
    );

    return allOpportunities;
  }

  /**
   * Parse a single event
   */
  private parseEvent(event: OddsApiResponse): ExtractedOpportunity[] {
    const opportunities: ExtractedOpportunity[] = [];

    for (const bookmaker of event.bookmakers) {
      const bookmakerOpportunities = this.parseBookmaker(event, bookmaker);
      opportunities.push(...bookmakerOpportunities);
    }

    return opportunities;
  }

  /**
   * Parse bookmaker markets
   */
  private parseBookmaker(event: OddsApiResponse, bookmaker: Bookmaker): ExtractedOpportunity[] {
    const opportunities: ExtractedOpportunity[] = [];

    for (const market of bookmaker.markets) {
      // Only process spreads market
      if (market.key !== 'spreads') {
        continue;
      }

      const marketOpportunities = this.parseMarket(event, bookmaker, market);
      opportunities.push(...marketOpportunities);
    }

    return opportunities;
  }

  /**
   * Parse market outcomes (handicaps)
   */
  private parseMarket(
    event: OddsApiResponse,
    bookmaker: Bookmaker,
    market: Market,
  ): ExtractedOpportunity[] {
    const opportunities: ExtractedOpportunity[] = [];

    for (const outcome of market.outcomes) {
      // Only process positive handicaps (underdogs)
      if (outcome.point >= 1.0) {
        opportunities.push({
          eventId: event.id,
          team: outcome.name,
          handicap: outcome.point,
          odd: outcome.price,
          bookmaker: bookmaker.key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: new Date(event.commence_time),
          league: event.sport_title,
        });
      }
    }

    return opportunities;
  }

  /**
   * Parse single outcome for testing
   */
  parseOutcome(
    event: OddsApiResponse,
    bookmaker: Bookmaker,
    outcome: Outcome,
  ): ExtractedOpportunity {
    return {
      eventId: event.id,
      team: outcome.name,
      handicap: outcome.point,
      odd: outcome.price,
      bookmaker: bookmaker.key,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: new Date(event.commence_time),
      league: event.sport_title,
    };
  }
}
