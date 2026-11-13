import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CONFIG } from './config.js';

let dbInstance = null;

export function getKickStartDb(customPath = null) {
  if (dbInstance && !customPath) return dbInstance;

  const targetPath = customPath || CONFIG.dbPath;
  if (targetPath !== ':memory:') {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS kickstart_registrations (
      id TEXT PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      student_name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      department TEXT NOT NULL,
      year TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      selected_ticket_ids TEXT NOT NULL,
      ticket_names TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      amount_rupees REAL NOT NULL,
      payment_id TEXT,
      checkout_url TEXT,
      payment_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
      payment_method TEXT,
      utr TEXT,
      verification_level INTEGER DEFAULT 0,
      resume_name TEXT,
      why_kickstart TEXT,
      registered_at TEXT NOT NULL,
      verified_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kickstart_webhook_receipts (
      delivery_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      order_id TEXT,
      payment_id TEXT,
      processed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ks_reg_roll ON kickstart_registrations (roll_number);
    CREATE INDEX IF NOT EXISTS idx_ks_reg_email ON kickstart_registrations (email);
    CREATE INDEX IF NOT EXISTS idx_ks_reg_status ON kickstart_registrations (payment_status);
  `);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

