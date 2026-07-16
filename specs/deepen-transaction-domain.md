# Spec: Deepen Tandem's transaction domain (split math, settlement contribution, write path)

## Problem Statement

Tandem's core money rules — how a transaction's amount splits across partners, and what a
transaction does to the settlement balance — have no home. They are re-derived in many places:

- Percent↔amount conversion with remainder distribution is reimplemented on the write path
  (`buildSplitPercentages` / `roundPercent` in the transactions route), in the read hydration
  (`allocateAmount` in `lib/amounts.js`), and again on the frontend — each with a subtly
  different remainder rule.
- The settlement classification of a transaction (by `type` and `split_mode` into paid / owed /
  received) is walked independently by `debtSummary`, `personMonthlySummary`, and `timeline` —
  roughly 51 type/split-mode branches spread across the services and the route.
- The write path's validation and split-derivation rules are duplicated between the POST and
  PATCH handlers of the transactions route, and the money-mutation logic is only reachable
  through HTTP, so it is effectively untested.

The result is drift risk on money math (a lost cent is invisible until it happens), settlement
rules verified in only one of three read models, and no unit-level test surface for the
highest-risk code in the app.

## Solution

Introduce three deep backend modules, each behind a small interface, built in dependency order:

1. A **split module** owns the one percent⇄amount remainder rule.
2. A **settlement-contribution module** classifies a transaction once; the three read models fold
   over its output instead of re-branching.
3. A **transaction write-path module** derives-and-validates a transaction plus its splits; the
   POST and PATCH route handlers just parse and persist.

From the partner's perspective nothing changes — settlement balances, insights, and expense entry
behave exactly as today. The win is internal: money rules live once, are testable without HTTP,
and stop drifting.

## User Stories

1. As a partner, I want my shared-expense splits to always total exactly the expense amount, so that no cent is ever lost or double-counted.
2. As a partner, I want a custom split to allocate the same amounts whether I created or later edited the expense, so that editing never silently changes who owes what.
3. As a partner, I want the settlement balance to be computed from the same rules as my monthly insights, so that the numbers never disagree between screens.
4. As a partner, I want an owed expense, a personal expense, a custom-split expense, a settlement, and income to each affect the balance exactly as intended, so that the settlement balance is trustworthy.
5. As a partner, I want editing an expense's amount to re-balance its custom splits proportionally, so that my chosen proportions are preserved.
6. As a partner, I want changing an expense's split mode to update the balance correctly, so that switching between default, custom, owed, and personal always reconciles.
7. As a developer, I want percent→amount and amount→percent conversion in one module, so that I change the remainder rule in exactly one place.
8. As a developer, I want a single `contributionOf(txn, splits)` function, so that adding a new read model does not mean re-deriving settlement rules.
9. As a developer, I want `debtSummary`, `personMonthlySummary`, and `timeline` to fold over shared per-partner deltas, so that a rule fix lands in all three at once.
10. As a developer, I want `buildTransaction(input)` to return rows-and-splits or a typed error, so that I can unit-test the write path without spinning up HTTP.
11. As a developer, I want the POST and PATCH transaction handlers to share one derivation path, so that create and update can never diverge on validation or split math.
12. As a developer, I want the split module unit-tested against remainder edge cases, so that rounding regressions fail a test rather than a partner's balance.
13. As a developer, I want the settlement-contribution module unit-tested per transaction type and split mode, so that the settlement rules are pinned by tests.
14. As a developer, I want the existing `timeline.test.js` behavior preserved, so that the refactor is proven behavior-preserving.
15. As a maintainer, I want the transactions route to shrink to parse-and-persist, so that the route reads as HTTP glue, not domain logic.
16. As a maintainer, I want the settlement rules named with the CONTEXT.md glossary (shared / personal / owed expense, settlement, settlement balance), so that the code speaks the domain language.
17. As a maintainer, I want no change to the HTTP request/response contracts, so that the frontend needs no coordinated change.

## Implementation Decisions

**Build order (dependency-first):** split module → settlement-contribution module → write-path module.

### 1. Split module (seam: extend/replace `lib/amounts.js`)

- Exposes two pure functions: `toAmounts(total, percents)` and `toPercents(total, amounts)`.
- Owns the single remainder rule (remainder applied to the largest share). `allocateAmount` and the
  route's `buildSplitPercentages` / `roundPercent` collapse into these two functions.
- `roundAmount` / `addAmount` stay where they are (used broadly); this change is scoped to the
  percent⇄amount conversion, not all amount helpers.
- Pure in/out — no DB, no side effects.

### 2. Settlement-contribution module (seam: new backend module, e.g. `services/contribution.js`)

- Exposes `contributionOf(txn, splits)` returning the per-partner settlement deltas for one
  transaction (what each partner paid vs. owes/received), covering EXPENSE (custom / owed / personal),
  LIQUIDATION (settlement), and INCOME.
- `debtSummary`, `personMonthlySummary`, and `timeline` fold over its output instead of re-branching
  on `type` / `split_mode`. Each service keeps its own aggregation shape (all-time net, per-month
  per-partner totals, monthly timeline) — only the classification moves into the module.
- Read-only: takes already-fetched transactions and splits, returns deltas.

### 3. Transaction write-path module (seam: new backend module, e.g. `buildTransaction`)

- Exposes a create path `buildTransaction(input)` and an update variant for PATCH, each returning
  rows-and-splits to persist, or a typed error (mapped by the route to the existing HTTP status +
  message).
- Absorbs the type/split-mode legality, payer/beneficiary invariants, and percent→amount allocation
  currently inlined and duplicated across the POST and PATCH handlers. Uses the split module for
  allocation.
- Route handlers become: parse HTTP → call module → on error map to status → on success call the
  data adapter to persist. Persistence stays in the route/adapter; the module is pure derivation +
  validation.

### Contracts and schema

- **No HTTP contract change.** Request bodies, response shapes, status codes, and error messages are
  preserved.
- **No schema change.** Same `transactions` and transaction-splits tables; same data-adapter
  interface (pglite + supabase).
- **Glossary:** name behavior with CONTEXT.md terms — shared expense, personal expense (`split_mode`
  `none`), owed expense, custom split, default split, settlement (`LIQUIDATION`), settlement balance.

## Testing Decisions

- **Test external behavior, not implementation.** Assert on returned values (allocated amounts,
  per-partner deltas, rows-and-splits, typed errors), not on internal Maps or call order.
- **Split module:** unit tests over remainder edge cases — sums that don't divide evenly, a single
  split, many splits, largest-share tie-breaking, and round-tripping `toAmounts`→`toPercents`. The
  invariant to pin: allocated amounts always sum to the original total.
- **Settlement-contribution module:** unit tests per transaction type and split mode (custom split,
  owed expense, personal expense, settlement, income), asserting the per-partner deltas. This is the
  first real test surface for the settlement math.
- **Read models:** the existing `apps/backend/src/services/timeline.test.js` must keep passing
  unchanged — it is the behavior-preserving anchor for the contribution refactor. Add equivalent
  characterization coverage for `debtSummary` net balance if cheap.
- **Write-path module:** unit tests for create and update — valid cases produce expected
  rows-and-splits; invalid cases produce the typed error that maps to today's status/message. No HTTP
  needed.
- **Prior art:** `timeline.test.js` is the pattern to follow — plain assertions on a service's return
  value, no framework beyond what's already there.

## Out of Scope

- **Frontend `shared/domain/splits.js` mirroring.** The CJS/ESM backend↔frontend seam is not crossed
  here; the frontend keeps its own split helpers, mirrored deliberately. Unifying into a shared
  package is a separate decision (two adapters would justify it).
- **Frontend `TransactionForm` refactor** (finding 4 from the review) — not part of this spec.
- **Any behavior change** to settlement balances, insights, expense entry, or the HTTP API.
- **Schema or data-adapter interface changes.**

## Further Notes

- The three modules share one vocabulary: the write path and the read models should agree on what a
  transaction's settlement contribution is. Building the contribution module before the write-path
  module means the write path can be validated against the same concept the reads use.
- Deletion test that motivates this: delete each module and the duplicated branches reappear across
  callers — they concentrate complexity rather than move it.
- Source: architecture review, findings 1–3 (write path, settlement contribution, split math).
