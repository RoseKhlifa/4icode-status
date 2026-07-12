/**
 * 管理端凭证 (SQLite + scrypt)
 *
 * - 首次启动: 若 admin_credentials 为空, 生成一次性密码, 打印到 stdout, 落库
 * - 密码用 scrypt(N=16384, r=8, p=1) + 32B salt, 结果编码为 "scrypt$salt$hash"
 * - 没有 bcrypt 依赖, Node crypto 内置
 */

import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "../database/sqlite";

const SCRYPT_KEY_LEN = 64;
const HASH_PREFIX = "scrypt$";

function encodeHash(salt: Buffer, hash: Buffer): string {
  return `${HASH_PREFIX}${salt.toString("base64")}$${hash.toString("base64")}`;
}

function decodeHash(encoded: string): { salt: Buffer; hash: Buffer } | null {
  if (!encoded.startsWith(HASH_PREFIX)) return null;
  const body = encoded.slice(HASH_PREFIX.length);
  const [saltB64, hashB64] = body.split("$");
  if (!saltB64 || !hashB64) return null;
  try {
    return {
      salt: Buffer.from(saltB64, "base64"),
      hash: Buffer.from(hashB64, "base64"),
    };
  } catch {
    return null;
  }
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(32);
  const hash = scryptSync(plain, salt, SCRYPT_KEY_LEN);
  return encodeHash(salt, hash);
}

export function verifyPassword(plain: string, encoded: string): boolean {
  const parts = decodeHash(encoded);
  if (!parts) return false;
  const derived = scryptSync(plain, parts.salt, parts.hash.length);
  if (derived.length !== parts.hash.length) return false;
  return timingSafeEqual(derived, parts.hash);
}

interface CredRow {
  password_hash: string;
  updated_at: string;
}

export function getStoredHash(): string | null {
  const db = getDb();
  const row = db
    .prepare<[], CredRow>(`SELECT password_hash, updated_at FROM admin_credentials WHERE id = 1`)
    .get();
  return row?.password_hash ?? null;
}

export function setPassword(plain: string): void {
  if (plain.length < 6) {
    throw new Error("密码至少 6 位");
  }
  const db = getDb();
  const encoded = hashPassword(plain);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO admin_credentials (id, password_hash, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at`
  ).run(encoded, now);
}

/**
 * 首次启动: 若无密码, 生成一个 12 位随机密码 (可打印) 打印并落库
 * 返回是否为首次
 */
export function ensureInitialPassword(): boolean {
  if (getStoredHash()) return false;

  // 从环境变量优先取, 便于 CI 部署时预置
  const envInit = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  const chosen = envInit || generateRandomPassword();
  setPassword(chosen);

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  4i.codes status — 管理端首次启动                        ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  URL:      /admin/login                                  ║`);
  console.log(`║  Password: ${chosen.padEnd(46)}║`);
  console.log("║                                                          ║");
  console.log("║  ⚠ 请立即登录并到设置里修改密码                          ║");
  console.log("║  ⚠ 此密码仅本次显示, 不再重复输出                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
  return true;
}

const RANDOM_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generateRandomPassword(len = 12): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += RANDOM_CHARSET[bytes[i] % RANDOM_CHARSET.length];
  }
  return out;
}
