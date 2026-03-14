import { BetResult } from '../../../common/constants/strategy.constants';

export interface Bet {
  id?: string;
  game1_id: string;
  game2_id: string;
  odd_total: number;
  risk_total: number;
  created_at?: Date;
  result?: BetResult;
  profit?: number;
}

export interface CreateBetDto {
  game1_id: string;
  game2_id: string;
  odd_total: number;
  risk_total: number;
  result?: BetResult;
}
