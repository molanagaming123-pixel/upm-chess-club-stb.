// Tipe ini mencerminkan skema respons backend (backend/app/schemas.py).

export type ResultType = 'white_win' | 'black_win' | 'draw';
export type UserStatus = 'active' | 'inactive';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'finished';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

/** email/nim/role bernilai null bila pengguna bukan Administrator/pemilik akun (privasi). */
export interface Member {
  id: number;
  name: string;
  status: UserStatus;
  joined_at: string;
  email: string | null;
  nim: string | null;
  role: 'admin' | 'member' | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: Member;
}

export interface Tournament {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  location: string | null;
  description: string | null;
  status: TournamentStatus;
  participant_count: number;
  match_count: number;
  my_registration: RegistrationStatus | null;
}

export interface Participant {
  user_id: number;
  name: string;
  status: RegistrationStatus;
}

export interface Match {
  id: number;
  kind: 'turnamen' | 'persahabatan';
  tournament_id: number | null;
  tournament_name: string | null;
  round: number | null;
  white_id: number;
  white_name: string;
  black_id: number;
  black_name: string;
  result: ResultType | null;
  match_date: string;
}

export interface Round {
  round: number;
  matches: Match[];
}

export interface StandingRow {
  rank: number;
  user_id: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
}

export interface RankPoint {
  date: string;
  rank: number;
  points: number;
  played: number;
}

export interface PlayerStats {
  member: Member;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  rank: number | null;
  total_ranked: number;
  recent_matches: Match[];
  rank_history: RankPoint[];
}

export interface Dashboard {
  total_members: number;
  active_members: number;
  active_tournaments: number;
  total_matches: number;
  completed_matches: number;
  upcoming_tournaments: Tournament[];
  recent_results: Match[];
  top_players: StandingRow[];
}
