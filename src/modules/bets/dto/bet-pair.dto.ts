import { IsUUID, IsNumber, Min } from 'class-validator';

export class BetPairDto {
  @IsUUID()
  game1_id: string;

  @IsUUID()
  game2_id: string;

  @IsNumber()
  @Min(1.0)
  odd_total: number;

  @IsNumber()
  @Min(0)
  risk_total: number;
}

export class BetPairSummary {
  game1: {
    id: string;
    team: string;
    handicap: number;
    odd: number;
    risk_score: number;
  };
  game2: {
    id: string;
    team: string;
    handicap: number;
    odd: number;
    risk_score: number;
  };
  odd_total: number;
  risk_total: number;
}
