import { OpportunityStatus } from '../../../common/constants/strategy.constants';

export interface Opportunity {
  id?: string;
  event_id: string;
  team: string;
  handicap: number;
  odd: number;
  bookmaker: string;
  risk_score: number;
  status: OpportunityStatus;
  created_at?: Date;
}

export interface CreateOpportunityDto {
  event_id: string;
  team: string;
  handicap: number;
  odd: number;
  bookmaker: string;
  risk_score: number;
  status?: OpportunityStatus;
}
