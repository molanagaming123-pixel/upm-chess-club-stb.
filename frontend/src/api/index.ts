import { request } from './client';
import type {
  Dashboard,
  Match,
  Member,
  Participant,
  PlayerStats,
  RegistrationStatus,
  ResultType,
  Round,
  StandingRow,
  TokenResponse,
  Tournament,
  TournamentStatus,
  UserStatus,
} from './types';

export * from './types';
export { ApiError, errorMessage, configureClient } from './client';

export const api = {
  // ----- auth -----
  login: (email: string, password: string) =>
    request<TokenResponse>('POST', '/auth/login', { body: { email, password } }),
  register: (data: { name: string; email: string; password: string; nim?: string | null }) =>
    request<TokenResponse>('POST', '/auth/register', { body: data }),
  me: () => request<Member>('GET', '/auth/me'),
  logout: () => request<{ detail: string }>('POST', '/auth/logout'),

  // ----- dashboard & peringkat -----
  dashboard: () => request<Dashboard>('GET', '/dashboard'),
  standings: () => request<StandingRow[]>('GET', '/standings'),

  // ----- anggota -----
  members: (q?: string, status?: UserStatus) =>
    request<Member[]>('GET', '/members', { query: { q, status } }),
  member: (id: number) => request<Member>('GET', `/members/${id}`),
  memberStats: (id: number) => request<PlayerStats>('GET', `/members/${id}/stats`),
  createMember: (data: {
    name: string;
    email: string;
    password: string;
    nim?: string | null;
    status?: UserStatus;
    joined_at?: string;
  }) => request<Member>('POST', '/members', { body: data }),
  updateMember: (
    id: number,
    data: Partial<{
      name: string;
      email: string;
      password: string;
      nim: string | null;
      status: UserStatus;
      joined_at: string;
    }>,
  ) => request<Member>('PATCH', `/members/${id}`, { body: data }),
  deleteMember: (id: number) => request<void>('DELETE', `/members/${id}`),

  // ----- turnamen -----
  tournaments: (status?: TournamentStatus) =>
    request<Tournament[]>('GET', '/tournaments', { query: { status } }),
  tournament: (id: number) => request<Tournament>('GET', `/tournaments/${id}`),
  createTournament: (data: {
    name: string;
    start_date: string;
    end_date: string;
    location?: string | null;
    description?: string | null;
    status?: TournamentStatus;
  }) => request<Tournament>('POST', '/tournaments', { body: data }),
  updateTournament: (
    id: number,
    data: Partial<{
      name: string;
      start_date: string;
      end_date: string;
      location: string | null;
      description: string | null;
      status: TournamentStatus;
    }>,
  ) => request<Tournament>('PATCH', `/tournaments/${id}`, { body: data }),
  deleteTournament: (id: number) => request<void>('DELETE', `/tournaments/${id}`),

  // ----- peserta -----
  participants: (tid: number) => request<Participant[]>('GET', `/tournaments/${tid}/participants`),
  addParticipant: (tid: number, userId: number) =>
    request<Participant>('POST', `/tournaments/${tid}/participants`, { body: { user_id: userId } }),
  registerSelf: (tid: number) => request<Participant>('POST', `/tournaments/${tid}/register`),
  setParticipantStatus: (tid: number, userId: number, status: Exclude<RegistrationStatus, 'pending'>) =>
    request<Participant>('PATCH', `/tournaments/${tid}/participants/${userId}`, { body: { status } }),
  removeParticipant: (tid: number, userId: number) =>
    request<void>('DELETE', `/tournaments/${tid}/participants/${userId}`),

  // ----- ronde, klasemen -----
  rounds: (tid: number) => request<Round[]>('GET', `/tournaments/${tid}/rounds`),
  unpaired: (tid: number, round: number) =>
    request<Participant[]>('GET', `/tournaments/${tid}/rounds/${round}/unpaired`),
  tournamentStandings: (tid: number) =>
    request<StandingRow[]>('GET', `/tournaments/${tid}/standings`),

  // ----- pertandingan -----
  matches: (params: { kind?: 'turnamen' | 'persahabatan'; user_id?: number; limit?: number } = {}) =>
    request<Match[]>('GET', '/matches', { query: params }),
  match: (id: number) => request<Match>('GET', `/matches/${id}`),
  createMatch: (data: {
    tournament_id?: number | null;
    round?: number | null;
    white_id: number;
    black_id: number;
    match_date: string;
    result?: ResultType | null;
  }) => request<Match>('POST', '/matches', { body: data }),
  updateMatch: (
    id: number,
    data: Partial<{
      round: number;
      white_id: number;
      black_id: number;
      match_date: string;
      result: ResultType;
      clear_result: boolean;
    }>,
  ) => request<Match>('PATCH', `/matches/${id}`, { body: data }),
  deleteMatch: (id: number) => request<void>('DELETE', `/matches/${id}`),
};
