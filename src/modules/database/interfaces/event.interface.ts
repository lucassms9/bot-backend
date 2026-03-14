export interface Event {
  id?: string;
  event_id: string;
  league: string;
  home_team: string;
  away_team: string;
  commence_time: Date;
  created_at?: Date;
}

export interface CreateEventDto {
  event_id: string;
  league: string;
  home_team: string;
  away_team: string;
  commence_time: Date;
}
