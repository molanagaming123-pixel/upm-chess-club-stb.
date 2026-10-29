import { NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
  Beranda: undefined;
  Anggota: undefined;
  Turnamen: undefined;
  Peringkat: undefined;
  Profil: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  MemberDetail: { id: number };
  MemberForm: { id?: number } | undefined;
  TournamentDetail: { id: number };
  TournamentForm: { id?: number } | undefined;
  MatchForm: { matchId?: number; tournamentId?: number } | undefined;
  Matches: undefined;
  About: undefined;
};

export type Nav = NativeStackNavigationProp<RootStackParamList>;
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export const useNav = () => useNavigation<Nav>();
