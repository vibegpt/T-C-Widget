import { createHash, randomUUID } from "crypto";
import { Redis } from "@upstash/redis";

// ── Redis client (lazy singleton) ─────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Upstash KV not configured");
  _redis = new Redis({ url, token });
  return _redis;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditEvent = "check" | "signed_assessment" | "verify";

export type AuditRecord = {
  id: string;
  api_key_hash: string;
  timestamp: string;       // ISO 8601
  timestamp_unix: number;  // seconds
  event: AuditEvent;
  seller_domain: string | null;
  agent_id: string | null;
  transaction_ref: string | null;
  analysis_status: string | null;
  confidence: string | null;
  flags: string[];
  clause_count: number;
  non_boilerplate_count: number;
  signed: boolean;         // true for signed_assessment events
  verified: boolean | null; // non-null for verify events
  assessment_id: string | null; // for verify events
  ip: string | null;
};

export type AuditLogFilters = {
  from?: number;   // unix seconds
  to?: number;     // unix seconds
  domain?: string;
  event?: AuditEvent;
  limit?: number;
};

export type CompliancePeriod = "last-7-days" | "last-30-days" | "last-90-days" | "all-time";

export type ComplianceReport = {
  period: CompliancePeriod;
  generated_at: string;
  total_checks: number;
  total_signed: number;
  total_verifies: number;
  status_distribution: Record<string, number>;
  confidence_distribution: Record<string, number>;
  top_flags: Array<{ flag: string; count: number }>;
  top_domains: Array<{ domain: string; count: number }>;
  non_boilerplate_rate: number | null; // % of assessments with at least 1 non-boilerplate clause
};

// ── Key hashing ───────────────────────────────────────────────────────────────

export function hashApiKey(apiKey: string): string {
  const salt = process.env.AUDIT_KEY_SALT || "";
  return createHash("sha256").update(salt + apiKey).digest("hex").slice(0, 32);
}

// ── Key helpers ───────────────────────────────────────────────────────────────

function recordKey(apiKeyHash: string, timestampUnix: number, id: string): string {
  return `audit:${apiKeyHash}:${timestampUnix}:${id}`;
}

function indexKey(apiKeyHash: string): string {
  return `audit_index:${apiKeyHash}`;
}

function metaKey(apiKeyHash: string): string {
  return `audit_meta:${apiKeyHash}`;
}

// ── Write (fire-and-forget) ───────────────────────────────────────────────────

export function writeAuditRecord(record: Omit<AuditRecord, "id" | "timestamp" | "timestamp_unix">): void {
  // Fire-and-forget — never throw, never await
  const id = randomUUID();
  const now = new Date();
  const timestampUnix = Math.floor(now.getTime() / 1000);

  const full: AuditRecord = {
    ...record,
    id,
    timestamp: now.toISOString(),
    timestamp_unix: timestampUnix,
  };

  const rKey = recordKey(full.api_key_hash, timestampUnix, id);
  const iKey = indexKey(full.api_key_hash);
  const mKey = metaKey(full.api_key_hash);

  void (async () => {
    try {
      const redis = getRedis();

      // Write record (TTL: 90 days)
      await redis.set(rKey, JSON.stringify(full), { ex: 90 * 24 * 60 * 60 });

      // Index by timestamp for range queries
      await redis.zadd(iKey, { score: timestampUnix, member: rKey });

      // Update aggregate counters in meta hash
      const metaUpdates: Record<string, number> = {};
      if (full.event === "check") metaUpdates["total_checks"] = 1;
      if (full.event === "signed_assessment") metaUpdates["total_signed"] = 1;
      if (full.event === "verify") metaUpdates["total_verifies"] = 1;
      if (full.analysis_status) metaUpdates[`status:${full.analysis_status}`] = 1;
      if (full.confidence) metaUpdates[`confidence:${full.confidence}`] = 1;
      if (full.seller_domain) metaUpdates[`domain:${full.seller_domain}`] = 1;
      for (const flag of full.flags) metaUpdates[`flag:${flag}`] = 1;

      const pipeline = redis.pipeline();
      for (const [field, inc] of Object.entries(metaUpdates)) {
        pipeline.hincrby(mKey, field, inc);
      }
      pipeline.hset(mKey, { last_seen: now.toISOString() });
      await pipeline.exec();
    } catch {
      // Never propagate audit errors to callers
    }
  })();
}

// ── Read: audit log ───────────────────────────────────────────────────────────

export async function getAuditLog(
  apiKeyHash: string,
  filters: AuditLogFilters = {},
): Promise<AuditRecord[]> {
  const redis = getRedis();
  const iKey = indexKey(apiKeyHash);

  const from = filters.from ?? 0;
  const to = filters.to ?? Math.floor(Date.now() / 1000);
  const limit = Math.min(filters.limit ?? 100, 500);

  // Get keys in time range from sorted set (ascending, reversed in JS)
  // Note: cast required — Upstash TS overload for byScore+number needs explicit any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keysAsc: string[] = await (redis as any).zrange(iKey, from, to, {
    byScore: true,
    limit: { offset: 0, count: limit * 3 },
  });
  const keys = [...keysAsc].reverse();

  if (!keys || keys.length === 0) return [];

  // Batch fetch records
  const values = await redis.mget<string[]>(...(keys as string[]));

  const records: AuditRecord[] = [];
  for (const val of values) {
    if (!val) continue;
    try {
      const rec: AuditRecord = typeof val === "string" ? JSON.parse(val) : val;
      if (filters.domain && rec.seller_domain !== filters.domain) continue;
      if (filters.event && rec.event !== filters.event) continue;
      records.push(rec);
      if (records.length >= limit) break;
    } catch {
      // skip malformed
    }
  }

  return records;
}

// ── Read: compliance report ───────────────────────────────────────────────────

export async function getComplianceReport(
  apiKeyHash: string,
  period: CompliancePeriod,
): Promise<ComplianceReport> {
  const redis = getRedis();
  const mKey = metaKey(apiKeyHash);

  // For time-bounded periods, scan index for recent records
  const periodSeconds: Record<CompliancePeriod, number | null> = {
    "last-7-days": 7 * 24 * 60 * 60,
    "last-30-days": 30 * 24 * 60 * 60,
    "last-90-days": 90 * 24 * 60 * 60,
    "all-time": null,
  };

  const seconds = periodSeconds[period];
  const now = Math.floor(Date.now() / 1000);
  const from = seconds ? now - seconds : 0;

  if (period === "all-time") {
    // Use pre-aggregated meta hash for all-time (fast)
    const meta = await redis.hgetall(mKey);
    if (!meta) {
      return emptyReport(period);
    }

    const total_checks = Number(meta["total_checks"] ?? 0);
    const total_signed = Number(meta["total_signed"] ?? 0);
    const total_verifies = Number(meta["total_verifies"] ?? 0);

    const status_distribution: Record<string, number> = {};
    const confidence_distribution: Record<string, number> = {};
    const flags: Array<{ flag: string; count: number }> = [];
    const domains: Array<{ domain: string; count: number }> = [];

    for (const [key, val] of Object.entries(meta)) {
      const n = Number(val);
      if (key.startsWith("status:")) status_distribution[key.slice(7)] = n;
      else if (key.startsWith("confidence:")) confidence_distribution[key.slice(11)] = n;
      else if (key.startsWith("flag:")) flags.push({ flag: key.slice(5), count: n });
      else if (key.startsWith("domain:")) domains.push({ domain: key.slice(7), count: n });
    }

    return {
      period,
      generated_at: new Date().toISOString(),
      total_checks,
      total_signed,
      total_verifies,
      status_distribution,
      confidence_distribution,
      top_flags: flags.sort((a, b) => b.count - a.count).slice(0, 10),
      top_domains: domains.sort((a, b) => b.count - a.count).slice(0, 10),
      non_boilerplate_rate: null, // not tracked in meta hash
    };
  }

  // For bounded periods, scan index and aggregate from records
  const iKey = indexKey(apiKeyHash);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keysAsc: string[] = await (redis as any).zrange(iKey, from, now, {
    byScore: true,
    limit: { offset: 0, count: 1000 },
  });
  const keys = [...keysAsc].reverse();

  if (!keys || keys.length === 0) return emptyReport(period);

  const values = await redis.mget<string[]>(...(keys as string[]));
  const records: AuditRecord[] = [];
  for (const val of values) {
    if (!val) continue;
    try {
      records.push(typeof val === "string" ? JSON.parse(val) : val);
    } catch { /* skip */ }
  }

  return aggregateRecords(records, period);
}

function emptyReport(period: CompliancePeriod): ComplianceReport {
  return {
    period,
    generated_at: new Date().toISOString(),
    total_checks: 0,
    total_signed: 0,
    total_verifies: 0,
    status_distribution: {},
    confidence_distribution: {},
    top_flags: [],
    top_domains: [],
    non_boilerplate_rate: null,
  };
}

function aggregateRecords(records: AuditRecord[], period: CompliancePeriod): ComplianceReport {
  const status_distribution: Record<string, number> = {};
  const confidence_distribution: Record<string, number> = {};
  const flagCounts: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};
  let total_checks = 0, total_signed = 0, total_verifies = 0;
  let withNonBoilerplate = 0, assessmentCount = 0;

  for (const rec of records) {
    if (rec.event === "check") total_checks++;
    if (rec.event === "signed_assessment") total_signed++;
    if (rec.event === "verify") total_verifies++;

    if (rec.analysis_status) status_distribution[rec.analysis_status] = (status_distribution[rec.analysis_status] ?? 0) + 1;
    if (rec.confidence) confidence_distribution[rec.confidence] = (confidence_distribution[rec.confidence] ?? 0) + 1;
    if (rec.seller_domain) domainCounts[rec.seller_domain] = (domainCounts[rec.seller_domain] ?? 0) + 1;
    for (const flag of rec.flags) flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;

    if (rec.event !== "verify") {
      assessmentCount++;
      if (rec.non_boilerplate_count > 0) withNonBoilerplate++;
    }
  }

  return {
    period,
    generated_at: new Date().toISOString(),
    total_checks,
    total_signed,
    total_verifies,
    status_distribution,
    confidence_distribution,
    top_flags: Object.entries(flagCounts).map(([flag, count]) => ({ flag, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    top_domains: Object.entries(domainCounts).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    non_boilerplate_rate: assessmentCount > 0 ? Math.round((withNonBoilerplate / assessmentCount) * 100) : null,
  };
}

