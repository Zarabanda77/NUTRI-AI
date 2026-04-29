import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from './types';

const PROFILE_KEY = '@nutri_profile';
const ADVICE_KEY = '@nutri_advice';

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(PROFILE_KEY);
  return data ? (JSON.parse(data) as UserProfile) : null;
}

export async function saveAdvice(date: string, advice: string): Promise<void> {
  await AsyncStorage.setItem(`${ADVICE_KEY}_${date}`, advice);
}

export async function loadAdvice(date: string): Promise<string | null> {
  return AsyncStorage.getItem(`${ADVICE_KEY}_${date}`);
}
