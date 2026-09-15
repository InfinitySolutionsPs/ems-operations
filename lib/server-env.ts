import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool, types, type PoolClient } from "pg";

types.setTypeParser(20, Number);
types.setTypeParser(1700, Number);

type Queryable = Pool | PoolClient;
type Result<T = Record<string, unknown>> = { results: T[]; meta: { changes: number; last_row_id: number | null } };

let pool: Pool | undefined;
let initialized: Promise<void> | undefined;

function database() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

async function init() {
  if (!initialized) initialized = (async () => {
    const sql = await readFile(path.join(process.cwd(), "db/postgres.sql"), "utf8");
    await database().query(sql);
  })();
  return initialized;
}

function postgresSql(input: string) {
  let sql = input.trim().replace(/`/g, '"');
  if (/^INSERT\s+OR\s+IGNORE\s+/i.test(sql)) {
    sql = sql.replace(/^INSERT\s+OR\s+IGNORE\s+/i, "INSERT ");
    sql += " ON CONFLICT DO NOTHING";
  }
  let n = 0;
  sql = sql.replace(/\?/g, () => `$${++n}`);
  return sql;
}

class Statement {
  private values: unknown[] = [];
  constructor(private sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async execute<T = Record<string, unknown>>(client?: Queryable): Promise<Result<T>> {
    await init();
    const ownClient = client ? null : await database().connect();
    const connection = client || ownClient!;
    try {
      const result = await connection.query(postgresSql(this.sql), this.values);
      let lastId: number | null = null;
      if (/^INSERT\s/i.test(this.sql) && result.rowCount) {
        const seq = await connection.query<{ id: string }>("SELECT LASTVAL()::text AS id").catch(() => ({ rows: [] as {id:string}[] }));
        lastId = seq.rows[0] ? Number(seq.rows[0].id) : null;
      }
      return { results: result.rows as T[], meta: { changes: result.rowCount || 0, last_row_id: lastId } };
    } finally {
      ownClient?.release();
    }
  }
  async all<T = Record<string, unknown>>() { return this.execute<T>(); }
  async first<T = Record<string, unknown>>() { return (await this.execute<T>()).results[0] ?? null; }
  async run() { return this.execute(); }
}

const DB = {
  prepare(sql: string) { return new Statement(sql); },
  async batch(statements: Statement[]) {
    await init();
    const client = await database().connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const statement of statements) results.push(await statement.execute(client));
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  },
};

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "data/uploads");
const BUCKET = {
  async put(key: string, bytes: ArrayBuffer) {
    const target = path.join(uploadRoot, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(bytes));
  },
  async get(key: string) {
    try {
      const body = await readFile(path.join(uploadRoot, key));
      return { body, httpEtag: "" };
    } catch { return null; }
  },
  async delete(key: string) { await unlink(path.join(uploadRoot, key)).catch(() => undefined); },
};

export const env = { DB, BUCKET };
