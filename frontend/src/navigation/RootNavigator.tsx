import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Loading } from '../components/Feedback';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MembersScreen } from '../screens/MembersScreen';
import { MemberDetailScreen } from '../screens/MemberDetailScreen';
import { MemberFormScreen } from '../screens/MemberFormScreen';
import { TournamentsScreen } from '../screens/TournamentsScreen';
import { TournamentDetailScreen } from '../screens/TournamentDetailScreen';
import { TournamentFormScreen } from '../screens/TournamentFormScreen';
import { MatchFormScreen } from '../screens/MatchFormScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { StandingsScreen } from '../screens/StandingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AboutScreen } from '../screens/AboutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surfaceAlt,
    text: colors.text,
    border: colors.border,
    primary: colors.gold,
  },
};

const headerOptions = {
  headerStyle: { backgroundColor: colors.surfaceAlt },
  headerTintColor: colors.gold,
  headerTitleStyle: { color: colors.text, fontWeight: '700' as const },
  contentStyle: { backgroundColor: colors.bg },
};

const ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Beranda: ['home', 'home-outline'],
  Anggota: ['people', 'people-outline'],
  Turnamen: ['trophy', 'trophy-outline'],
  Peringkat: ['podium', 'podium-outline'],
  Profil: ['person-circle', 'person-circle-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOptions,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surfaceAlt, borderTopColor: colors.border },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Beranda" component={HomeScreen} options={{ title: 'Beranda' }} />
      <Tab.Screen name="Anggota" component={MembersScreen} />
      <Tab.Screen name="Turnamen" component={TournamentsScreen} />
      <Tab.Screen name="Peringkat" component={StandingsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <Loading label="Menyiapkan aplikasi…" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={headerOptions}>
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Detail Anggota' }} />
            <Stack.Screen name="MemberForm" component={MemberFormScreen} options={{ title: 'Anggota' }} />
            <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} options={{ title: 'Detail Turnamen' }} />
            <Stack.Screen name="TournamentForm" component={TournamentFormScreen} options={{ title: 'Turnamen' }} />
            <Stack.Screen name="MatchForm" component={MatchFormScreen} options={{ title: 'Pertandingan' }} />
            <Stack.Screen name="Matches" component={MatchesScreen} options={{ title: 'Riwayat Pertandingan' }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: 'Tentang' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Daftar Anggota' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
