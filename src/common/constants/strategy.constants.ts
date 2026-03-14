/**
 * Strategy configuration constants
 */
export const STRATEGY_CONFIG = {
  // Handicap filters
  MIN_HANDICAP: 1.0,
  MIN_ODD: 1.25,
  MAX_ODD: 1.55,

  // Pair building
  MIN_PAIR_ODD: 1.6,
  MIN_TIME_DIFF_HOURS: 2,

  // Risk calculation weights
  HANDICAP_WEIGHT: 0.5,
  ODD_WEIGHT: 2.0,

  // The Odds API
  SPORT_KEY: 'soccer_brazil_campeonato',
  MARKET: 'spreads',
  REGIONS: 'eu',
  ODDS_FORMAT: 'decimal',
} as const;

/**
 * Opportunity status types
 */
export enum OpportunityStatus {
  PENDING = 'pending',
  PAIRED = 'paired',
  DISCARDED = 'discarded',
}

/**
 * Bet result types
 */
export enum BetResult {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  PARTIAL = 'partial',
}
