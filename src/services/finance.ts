import { db, fetchExchangeRates, getFormattedDate, getFormattedMonth, getSetting } from './db';
import { convertToVND } from '../utils/money';
import type { Category, Goal, HistoryItem, Transaction, TransferRecord, Wallet } from '../types';

export type TransactionType = 'income' | 'expense' | 'savings';

export interface HomeDashboard {
  wallets: Wallet[];
  goals: Goal[];
  transactions: Transaction[];
  exchangeRates: Record<string, number>;
  totalIncome: number;
  totalExpense: number;
  netWorth: number;
}

export interface TransactionFormData {
  categories: Category[];
  goals: Goal[];
  wallets: Wallet[];
  defaultCategoryId: number | null;
  defaultWalletId: number | null;
}

export interface TransactionInput {
  userId: number;
  walletId: number;
  categoryId: number | null;
  goalId?: number | null;
  title: string;
  amount: number;
  type: TransactionType;
  location?: string;
  imageUri?: string | null;
}

const getExchangeRates = async (): Promise<Record<string, number>> => {
  const ratesStr = await getSetting('exchange_rates');
  if (ratesStr) return JSON.parse(ratesStr);
  return (await fetchExchangeRates()) || {};
};

export const getHomeDashboard = async (userId: number, month = getFormattedMonth()): Promise<HomeDashboard> => {
  const wallets = await db.getAllAsync<Wallet>('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  const goals = await db.getAllAsync<Goal>('SELECT * FROM goals WHERE user_id = ?', [userId]);
  const transactions = await db.getAllAsync<Transaction>(
    `SELECT t.*, c.icon as catIcon, c.color as catColor, w.name as walletName, w.currency as walletCurrency
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.user_id = ?
     ORDER BY t.timestamp DESC`,
    [userId]
  );
  const exchangeRates = await getExchangeRates();

  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.date.includes(month))
    .reduce((sum, t) => sum + convertToVND(t.amount, t.walletCurrency, exchangeRates), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense' && t.date.includes(month))
    .reduce((sum, t) => sum + convertToVND(t.amount, t.walletCurrency, exchangeRates), 0);
  const netWorth = wallets
    .filter(w => w.exclude_from_total !== 1)
    .reduce((sum, w) => sum + convertToVND(w.balance, w.currency, exchangeRates), 0)
    + goals.reduce((sum, g) => sum + g.saved_amount, 0);

  return { wallets, goals, transactions, exchangeRates, totalIncome, totalExpense, netWorth };
};

export const getTransactionFormData = async (
  userId: number,
  type: TransactionType,
  currentWalletId?: number | null
): Promise<TransactionFormData> => {
  const wallets = await db.getAllAsync<Wallet>('SELECT * FROM wallets WHERE user_id = ?', [userId]);

  if (type === 'savings') {
    const goals = await db.getAllAsync<Goal>('SELECT * FROM goals WHERE user_id = ?', [userId]);
    return {
      categories: [],
      goals,
      wallets,
      defaultCategoryId: goals[0]?.id ?? null,
      defaultWalletId: currentWalletId ?? wallets[0]?.id ?? null,
    };
  }

  const categories = await db.getAllAsync<Category>('SELECT * FROM categories WHERE type = ?', [type]);
  return {
    categories,
    goals: [],
    wallets,
    defaultCategoryId: categories[0]?.id ?? null,
    defaultWalletId: currentWalletId ?? wallets[0]?.id ?? null,
  };
};

export const getBudgetOverage = async (
  userId: number,
  categoryId: number,
  amount: number,
  month = getFormattedMonth()
): Promise<{ total: number; limit: number } | null> => {
  const budget = await db.getFirstAsync<{ amount_limit: number }>(
    'SELECT amount_limit FROM budgets WHERE user_id = ? AND category_id = ? AND month_year = ?',
    [userId, categoryId, month]
  );
  if (!budget) return null;

  const spentResult = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND category_id = ? AND type = 'expense' AND date LIKE ?",
    [userId, categoryId, `%${month}%`]
  );
  const total = (spentResult?.total || 0) + amount;
  return total > budget.amount_limit ? { total, limit: budget.amount_limit } : null;
};

export const createTransaction = async (input: TransactionInput): Promise<void> => {
  await db.runAsync(
    'INSERT INTO transactions (user_id, wallet_id, category_id, goal_id, title, amount, type, date, location, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      input.userId,
      input.walletId,
      input.categoryId,
      input.goalId ?? null,
      input.title,
      input.amount,
      input.type,
      getFormattedDate(),
      input.location || '',
      input.imageUri || null,
    ]
  );
};

export const createSavingsTransaction = async (input: TransactionInput & { goalId: number }): Promise<void> => {
  await db.runAsync('UPDATE goals SET saved_amount = saved_amount + ? WHERE id = ?', [input.amount, input.goalId]);
  await createTransaction({ ...input, type: 'savings', categoryId: null });
};

export const getHistoryItems = async (userId: number): Promise<HistoryItem[]> => {
  const transactions = await db.getAllAsync<HistoryItem>(
    `SELECT t.*, c.icon as catIcon, c.color as catColor, w.name as walletName
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.user_id = ?
     ORDER BY t.timestamp DESC`,
    [userId]
  );

  const transfers = await db.getAllAsync<TransferRecord>(
    `SELECT tr.*, wf.name as fromWalletName, wt.name as toWalletName
     FROM transfers tr
     LEFT JOIN wallets wf ON tr.from_wallet_id = wf.id
     LEFT JOIN wallets wt ON tr.to_wallet_id = wt.id
     WHERE tr.user_id = ?
     ORDER BY tr.id DESC`,
    [userId]
  );

  const formattedTransfers: HistoryItem[] = transfers.map(tr => ({
    id: `tr_${tr.id}`,
    title: tr.note || `${tr.fromWalletName} → ${tr.toWalletName}`,
    amount: tr.amount,
    type: 'transfer',
    date: tr.date,
    catIcon: 'swap-horizontal',
    catColor: '#3B82F6',
    walletName: `${tr.fromWalletName} → ${tr.toWalletName}`,
    toWalletName: tr.toWalletName,
    fee: tr.fee,
    isTransfer: true,
  }));

  return [...transactions, ...formattedTransfers].sort((a, b) => {
    const parseDate = (value?: string) => {
      if (!value) return 0;
      const parts = value.split('/');
      if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      return 0;
    };
    return parseDate(b.date) - parseDate(a.date);
  });
};

export const deleteHistoryItem = async (item: HistoryItem): Promise<void> => {
  if (item.isTransfer) throw new Error('Transfers cannot be deleted from history.');

  if (item.type === 'savings' && item.goal_id) {
    await db.runAsync('UPDATE goals SET saved_amount = MAX(saved_amount - ?, 0) WHERE id = ?', [item.amount || 0, item.goal_id]);
  }

  await db.runAsync('DELETE FROM transactions WHERE id = ?', [item.id]);
};
