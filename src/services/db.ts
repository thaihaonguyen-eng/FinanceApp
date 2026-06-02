import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('finance_team_pro_2026.db');

export const getFormattedDate = (): string => { 
  const d = new Date(); 
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); 
};

export const getFormattedMonth = (): string => { 
  const d = new Date(); 
  return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); 
};

export const initDB = async (): Promise<void> => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, avatar_uri TEXT);
    CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, icon TEXT, color TEXT);
    CREATE TABLE IF NOT EXISTS wallets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, balance REAL, icon TEXT, color TEXT, currency TEXT DEFAULT 'VND', is_shared INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users (id));
    CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, target_amount REAL, saved_amount REAL DEFAULT 0, icon TEXT, color TEXT, deadline TEXT, FOREIGN KEY (user_id) REFERENCES users (id));
    CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, wallet_id INTEGER, category_id INTEGER, goal_id INTEGER, title TEXT, amount REAL, type TEXT, date TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id), FOREIGN KEY (wallet_id) REFERENCES wallets (id), FOREIGN KEY (category_id) REFERENCES categories (id), FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE SET NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, from_wallet_id INTEGER, to_wallet_id INTEGER, amount REAL, date TEXT, fee REAL DEFAULT 0, note TEXT, FOREIGN KEY (user_id) REFERENCES users (id), FOREIGN KEY (from_wallet_id) REFERENCES wallets (id), FOREIGN KEY (to_wallet_id) REFERENCES wallets (id));
    CREATE TABLE IF NOT EXISTS budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, category_id INTEGER, amount_limit REAL, month_year TEXT, FOREIGN KEY (user_id) REFERENCES users (id), FOREIGN KEY (category_id) REFERENCES categories (id));
    CREATE TABLE IF NOT EXISTS recurring_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, category_id INTEGER, frequency TEXT, next_date TEXT, FOREIGN KEY (user_id) REFERENCES users (id), FOREIGN KEY (category_id) REFERENCES categories (id));
    
    CREATE TRIGGER IF NOT EXISTS update_wallet_after_insert
    AFTER INSERT ON transactions
    BEGIN
        UPDATE wallets SET balance = balance + 
            (CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END)
        WHERE id = NEW.wallet_id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_wallet_after_delete
    AFTER DELETE ON transactions
    BEGIN
        UPDATE wallets SET balance = balance -
            (CASE WHEN OLD.type = 'income' THEN OLD.amount ELSE -OLD.amount END)
        WHERE id = OLD.wallet_id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_wallet_after_transfer
    AFTER INSERT ON transfers
    BEGIN
        UPDATE wallets SET balance = balance - NEW.amount WHERE id = NEW.from_wallet_id;
        UPDATE wallets SET balance = balance + NEW.amount WHERE id = NEW.to_wallet_id;
    END;

    CREATE TRIGGER IF NOT EXISTS cascade_delete_user
    BEFORE DELETE ON users
    BEGIN
        DELETE FROM transactions WHERE user_id = OLD.id;
        DELETE FROM goals WHERE user_id = OLD.id;
        DELETE FROM wallets WHERE user_id = OLD.id;
        DELETE FROM transfers WHERE user_id = OLD.id;
        DELETE FROM budgets WHERE user_id = OLD.id;
        DELETE FROM recurring_plans WHERE user_id = OLD.id;
    END;

    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date);
    CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);
  `);
  
  try { await db.execAsync("ALTER TABLE wallets ADD COLUMN currency TEXT DEFAULT 'VND'"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE wallets ADD COLUMN is_shared INTEGER DEFAULT 0"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE wallets ADD COLUMN exclude_from_total INTEGER DEFAULT 0"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE users ADD COLUMN is_biometric_enabled INTEGER DEFAULT 0"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE transactions ADD COLUMN image_uri TEXT"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE transactions ADD COLUMN note TEXT"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE transactions ADD COLUMN location TEXT"); } catch (e) {}
  try { await db.execAsync("ALTER TABLE transactions ADD COLUMN goal_id INTEGER"); } catch (e) {}

  const cats = await db.getAllAsync('SELECT * FROM categories');
  if (cats.length === 0) {
    await db.execAsync(`
      INSERT INTO categories (name, type, icon, color) VALUES 
      ('Lương', 'income', 'cash', '#10B981'), ('Thưởng', 'income', 'gift', '#06B6D4'), ('Kinh doanh', 'income', 'briefcase', '#8B5CF6'),
      ('Ăn uống', 'expense', 'fast-food', '#F43F5E'), ('Mua sắm', 'expense', 'cart', '#F59E0B'), ('Di chuyển', 'expense', 'bus', '#3B82F6'), ('Nhà ở', 'expense', 'home', '#14B8A6'), ('Giải trí', 'expense', 'game-controller', '#D946EF');
    `);
  }
};

export const getSetting = async (key: string): Promise<string | null> => {
  const res = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return res ? res.value : null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};

export const fetchExchangeRates = async (): Promise<Record<string, number> | null> => {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    if (data && data.rates && data.rates.VND) {
      await setSetting('exchange_rates', JSON.stringify(data.rates));
      return data.rates as Record<string, number>;
    }
  } catch (error) {
    console.error("Lỗi lấy tỷ giá:", error);
  }
  return null;
};
