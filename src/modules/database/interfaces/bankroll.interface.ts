export interface Bankroll {
  id: string;
  user_id: string;
  current_balance: number;
  initial_balance: number;
  currency: string;
  stake_percentage: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBankrollDto {
  initial_balance: number;
  currency?: string;
  stake_percentage?: number;
}

export interface UpdateBankrollDto {
  current_balance: number;
}
