import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsEnum, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  ODDS_API_KEY: string;

  @IsString()
  ODDS_API_BASE_URL: string;

  @IsString()
  USE_MOCK_DATA: string;

  @IsString()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_KEY: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY: string;

  @IsNumber()
  MIN_HANDICAP: number;

  @IsNumber()
  MIN_ODD: number;

  @IsNumber()
  MAX_ODD: number;

  @IsNumber()
  MIN_PAIR_ODD: number;

  @IsString()
  MARKET: string;

  @IsString()
  REGIONS: string;

  @IsString()
  ODDS_FORMAT: string;

  @IsString()
  CRON_ODDS_PROCESSOR: string;
}

export function envValidation(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
