/**
 * The Odds API Response Interfaces
 */

export interface OddsApiResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
  point: number;
}

/**
 * Extracted opportunity from API
 */
export interface ExtractedOpportunity {
  eventId: string;
  team: string;
  handicap: number;
  odd: number;
  bookmaker: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  league: string;
}
