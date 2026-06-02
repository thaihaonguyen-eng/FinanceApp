import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { db } from './db';
import type { User } from '../types';

const LAST_USERNAME_KEY = 'last_username';

export const hashPassword = async (password: string): Promise<string> => {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
};

export const rememberLastUsername = async (username: string): Promise<void> => {
  await AsyncStorage.setItem(LAST_USERNAME_KEY, username);
};

export const getLastUsername = async (): Promise<string | null> => {
  return AsyncStorage.getItem(LAST_USERNAME_KEY);
};

export const loginWithPassword = async (username: string, password: string): Promise<User | null> => {
  const hashedPass = await hashPassword(password);
  const user = await db.getFirstAsync<User>(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, hashedPass]
  );

  if (user) await rememberLastUsername(username);
  return user ?? null;
};

export const getBiometricLoginUser = async (): Promise<User | null> => {
  const lastUsername = await getLastUsername();
  if (!lastUsername) return null;

  return db.getFirstAsync<User>('SELECT * FROM users WHERE username = ?', [lastUsername]);
};

export const registerLocalUser = async (username: string, password: string, fullName: string): Promise<number> => {
  const hashedPass = await hashPassword(password);
  const result = await db.runAsync(
    'INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)',
    [username, hashedPass, fullName]
  );

  const newId = result.lastInsertRowId;
  await db.runAsync(
    "INSERT INTO wallets (user_id, name, balance, icon, color) VALUES (?, 'Tiền mặt', 0, 'wallet', '#F59E0B')",
    [newId]
  );
  await db.runAsync(
    "INSERT INTO goals (user_id, name, target_amount, saved_amount, icon, color) VALUES (?, 'Quỹ dự phòng', 20000000, 0, 'shield-checkmark', '#10B981')",
    [newId]
  );

  return newId;
};

export const setBiometricEnabled = async (userId: number, enabled: boolean): Promise<void> => {
  await db.runAsync('UPDATE users SET is_biometric_enabled = ? WHERE id = ?', [enabled ? 1 : 0, userId]);
};

export const updateAvatar = async (userId: number, uri: string): Promise<void> => {
  await db.runAsync('UPDATE users SET avatar_uri = ? WHERE id = ?', [uri, userId]);
};
