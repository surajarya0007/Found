import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../config/env";
import type { StoreState } from "../types/domain";

const STATE_ROW_ID = 1;

function ensureDatabaseFile(databasePath: string) {
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDatabase() {
  ensureDatabaseFile(env.databasePath);
  const db = new Database(env.databasePath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
}

export function loadPersistedState(): StoreState | null {
  const db = getDatabase();

  try {
    const row = db
      .prepare("SELECT state_json FROM app_state WHERE id = ?")
      .get(STATE_ROW_ID) as { state_json?: string } | undefined;

    if (!row?.state_json) {
      return null;
    }

    return JSON.parse(row.state_json) as StoreState;
  } finally {
    db.close();
  }
}

export function savePersistedState(state: StoreState): void {
  const db = getDatabase();

  try {
    db.prepare(
      `
      INSERT INTO app_state (id, state_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id)
      DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
      `,
    ).run(STATE_ROW_ID, JSON.stringify(state), new Date().toISOString());
  } finally {
    db.close();
  }
}
