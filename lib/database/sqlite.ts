/**
 * SQLite 单例
 *
 * 使用 better-sqlite3 存储 provider 探测历史 + 可用性统计。
 * 数据文件路径由环境变量 STATUS_DB_PATH 控制，默认 data/status.db。
 *
 * 表结构:
 *   check_history(config_id TEXT, status TEXT, latency_ms INTEGER, ping_latency_ms INTEGER, checked_at TEXT, message TEXT)
 *   -- 索引: (config_id, checked_at DESC)
 */

import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let cachedDb: Database.Database | null = null;

function resolveDbPath(): string {
  const raw = process.env.STATUS_DB_PATH?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }
  return path.resolve(process.cwd(), "data", "status.db");
}

function ensureSchema(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS check_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id TEXT NOT NULL,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      ping_latency_ms INTEGER,
      checked_at TEXT NOT NULL,
      message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_check_history_config_time
      ON check_history (config_id, checked_at DESC);

    CREATE INDEX IF NOT EXISTS idx_check_history_time
      ON check_history (checked_at);

    -- 管理端: 密码存这里, 首次启动自动生成
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 管理端: 会话 (可选; 也可以纯 stateless HMAC cookie)
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires
      ON admin_sessions (expires_at);
  `);
}

/**
 * 获取 SQLite 单例。首次调用会建目录、建表、开 WAL。
 */
export function getDb(): Database.Database {
  if (cachedDb) return cachedDb;

  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  ensureSchema(db);
  cachedDb = db;
  return db;
}

/**
 * 仅用于测试。生产不要调用。
 */
export function closeDb(): void {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
  }
}
