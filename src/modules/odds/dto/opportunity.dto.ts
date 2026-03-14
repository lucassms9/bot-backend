import { IsNumber, IsString, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class OpportunityDto {
  @IsString()
  eventId: string;

  @IsString()
  team: string;

  @IsNumber()
  @Min(0)
  handicap: number;

  @IsNumber()
  @Min(1.0)
  @Max(10.0)
  odd: number;

  @IsString()
  bookmaker: string;

  @IsString()
  homeTeam: string;

  @IsString()
  awayTeam: string;

  @IsDate()
  @Type(() => Date)
  commenceTime: Date;

  @IsString()
  league: string;

  @IsNumber()
  @Min(0)
  riskScore: number;
}
