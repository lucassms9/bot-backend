export interface UserOpportunity {
  user_id: string;
  opportunity_id: string;
  status: 'pending' | 'paired' | 'discarded';
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserOpportunityDto {
  user_id: string;
  opportunity_id: string;
  status?: 'pending' | 'paired' | 'discarded';
}
