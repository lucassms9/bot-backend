/**
 * List of soccer leagues to fetch odds from The Odds API
 */
export const SUPPORTED_LEAGUES = [
  'soccer_usa_mls',
  'soccer_denmark_superliga',
  'soccer_belgium_first_div',
  'soccer_portugal_primeira_liga',
  'soccer_france_ligue_two',
  'soccer_france_ligue_one',
  'soccer_epl',
  'soccer_england_league_one',
  'soccer_england_championship',
  'soccer_spain_segunda_division',
  'soccer_spain_la_liga',
  'soccer_italy_serie_b',
  'soccer_italy_serie_a',
  'soccer_argentina_primera_division',
  'soccer_brazil_serie_b',
  'soccer_brazil_campeonato',
] as const;

export type SupportedLeague = (typeof SUPPORTED_LEAGUES)[number];
