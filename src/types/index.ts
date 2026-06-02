export interface User {
  id: number;
  username: string;
  full_name: string;
  avatar_uri?: string;
  is_biometric_enabled?: number;
}

export interface Wallet {
  id: number;
  user_id: number;
  name: string;
  balance: number;
  icon: string;
  color: string;
  currency: string;
  is_shared: number;
  exclude_from_total: number;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  wallet_id: number;
  category_id: number | null;
  goal_id?: number | null;
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'savings';
  date: string;
  timestamp: string;
  note?: string;
  image_uri?: string;
  location?: string;
  // Joined fields
  catIcon?: string;
  catColor?: string;
  walletName?: string;
  walletCurrency?: string;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  icon: string;
  color: string;
  deadline: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount_limit: number;
  month_year: string;
}

export interface TransferRecord {
  id: number;
  user_id: number;
  from_wallet_id: number;
  to_wallet_id: number;
  amount: number;
  date: string;
  fee: number;
  note?: string;
  fromWalletName?: string;
  toWalletName?: string;
}

export interface HistoryItem extends Omit<Partial<Transaction>, 'id' | 'type'> {
  id: number | string;
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'savings' | 'transfer';
  date: string;
  walletName?: string;
  toWalletName?: string;
  catIcon?: string;
  catColor?: string;
  fee?: number;
  isTransfer?: boolean;
}
