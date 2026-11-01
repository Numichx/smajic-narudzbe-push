---
name: supabase-postgres-best-practices
description: "Postgres best practices maintained by Supabase. Load before writing or changing schema, column types, migrations, RLS policies, indexes, triggers, database functions, pg_cron/pgmq jobs, pgvector search or data imports, and when diagnosing slow queries, EXPLAIN plans, timeouts, connection limits, locking, bloat or rows visible to the wrong tenant."
model: sonnet
license: MIT
metadata:
  author: supabase
  version: "1.1.1"
  organization: Supabase
  date: January 2026
  abstract: Comprehensive Postgres performance optimization guide for developers using Supabase and Postgres. Contains performance rules across 8 categories, prioritized by impact from critical (query performance, connection management) to incremental (advanced features). Each rule includes detailed explanations, incorrect vs. correct SQL examples, query plan analysis, and specific performance metrics to guide automated optimization and code generation.
---

# Supabase Postgres Best Practices

Postgres rules from Supabase in 8 categories, ordered by impact.

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |

## How to Use

Read only the 1–2 rule files in `references/` whose prefix matches the task
(for example `references/schema-foreign-key-indexes.md`). Each has a short
why, incorrect and correct SQL, and Supabase notes. Don't read the whole
folder, `_contributing.md`, `_template.md` or `CHANGELOG.md`.
