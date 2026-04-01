# Aperol — Agents

> **Version:** 0.1.0-draft
> **Last updated:** 2026-03-24

---

## 1. Overview

Aperol dispatches 9 agent roles across the pipeline (the planner handles
its own patching, so no separate test plan patcher exists). Each agent gets a fresh
context window, a single task, and is torn down on completion. No state
bleeds between invocations.

Each agent has a corresponding role file in `.pipeline/roles/`
that the agent is directed to read as the first step of every ticket.

---

## 2. The generate → audit → patch loop

This is the universal building block reused at multiple stages. Aperol
parameterises it per stage — the loop logic itself is generic.

### 2.1 Flow

```
Agent 1: Generate artifact v1
  │
  ├─ Agent 2: Audit v1 against spec
  │    └─ Categorise findings: MUST FIX / SHOULD FIX / NIT
  │
  ├─ If no MUST FIX → PASS, exit loop
  │
  ├─ Agent 1: Patch v1 → v2 (re-invoked with audit feedback)
  │    └─ Diff-only patch — do not rewrite sections the audit didn't flag
  │
  ├─ Agent 2: Audit v2
  │    ├─ If no MUST FIX → PASS
  │    └─ Else → Agent 1: Patch v2 → v3
  │
  ├─ Agent 2: Audit v3
  │    ├─ If no MUST FIX → PASS
  │    └─ Else → HALT, flag for human review
  │
  └─ Max 3 iterations. Hard stop.
```

For Stage 1 (test plans), the generator and patcher are the same agent —
the planner is re-invoked with audit feedback on attempts 2 and 3.

For Stage 5 (implementation), the patcher is a separate agent
(impl-patcher) because it patches code, not documents.

### 2.2 Guardrails

| Guardrail | Purpose |
|---|---|
| **Hard iteration cap (3)** | Prevents infinite loops. If it hasn't converged by round 3, the problem is structural. |
| **Severity gating** | Only MUST FIX items trigger a loop. SHOULD and NIT are informational. |
| **Diff-only patching** | On patch attempts, the agent receives audit findings and produces scoped changes — only addresses flagged items. Cannot rewrite unflagged sections. |
| **Spec hash check** | Every artifact is stamped with a hash of the spec section it derives from. If the spec changes, downstream artifacts are invalidated. |
| **Frozen sections** | Once a section passes audit clean, it is locked. Subsequent patches cannot modify it. The audit surface shrinks each round. |

### 2.3 Audit severity definitions

| Level | Meaning | Action |
|---|---|---|
| **MUST FIX** | Missing spec requirement, incorrect behaviour, broken contract, missing test coverage for a defined interface | Triggers patch loop |
| **SHOULD FIX** | Suboptimal structure, missing edge case, naming inconsistency | Logged, included in report, does not block |
| **NIT** | Style, formatting, minor suggestion | Logged only |

### 2.4 Implementation audit verdicts

The implementation audit (Stage 5) uses a different verdict set:

| Verdict | Meaning | Action |
|---|---|---|
| **PASS** | Implementation satisfies spec and all tests pass | Proceed to gate/merge |
| **FAIL-PATCH** | Scoped issues that can be fixed by patching (e.g. failing tests, minor spec deviations) | Enter impl patch → re-audit loop (max 3 iterations) |
| **FAIL-REPLAN** | Structural gap — missing test coverage, wrong interface, requirement with no corresponding test | HALT — needs new tickets. This is a planning error, not an execution error. |

**Criteria for FAIL-PATCH vs FAIL-REPLAN:**
- If findings map to existing test cases that should pass but don't → FAIL-PATCH
- If findings reveal missing test coverage or a requirement with no
  corresponding test → FAIL-REPLAN

---

## 3. Agent roles

### 3.1 Scoping agent

| | |
|---|---|
| **Stage** | Pre-pipeline (runs once per pipeline run) |
| **Role file** | `scoping.md` |
| **Git pattern** | Document loop on `scope/[run-id]` |
| **Inputs** | Spec (full), interface document, existing codebase structure |
| **Output** | `manifest.md` + per-unit context files in `.pipeline/context/` |
| **Constraints** | Read-only access to spec + interfaces. Must validate its own output for file collisions. Context files contain verbatim spec/interface extracts. |

The scoping agent decomposes the interface document into parallelisable
planning units. Each unit in the manifest includes:

```markdown
## UNIT-001: [name]

**Interfaces:** [list of interfaces covered]
**Depends on:** [UNIT-xxx or "none"]
**Parallel:** [yes/no — derived from dependency + file analysis]

### File map
Creates:
- src/services/auth.py
- src/middleware/auth.py

Modifies:
- src/types/index.py

Tests:
- tests/services/test_auth.py
```

**File collision detection:** Before finalising the manifest, the scoping
agent builds a map of every file → unit. If any file appears in more than
one unit, those units must be sequential. If a collision cannot be resolved
by ordering, flag for human review.

---

### 3.2 Context audit agent

| | |
|---|---|
| **Stage** | Post-scoping, pre-planning (per unit, parallelisable) |
| **Role file** | `context-auditor.md` |
| **Git pattern** | No commit — read-only verification |
| **Inputs** | Context file (`.pipeline/context/[unit-id]-context.md`), source spec files, interface document, manifest |
| **Output** | PASS (stdout) or FAIL with structured error (stdout, non-zero exit) |
| **Constraints** | Read-only. Does not modify any files. No retry loop — failure halts the unit. |

The context audit agent verifies each unit's context file before planning
begins. It checks:

- Every interface listed in the unit's manifest entry has corresponding
  content in the context file.
- Extracted spec sections are verbatim — no paraphrasing or summarising.
  Compares against the source spec files on disk.
- Hashes in the context file header match the current source files on disk.
- No interfaces from other units have leaked into this context file
  (cross-references the manifest to check interface → unit ownership).

This is not a retry loop. A bad context file is a scoping agent error.
On failure, Aperol halts the unit and flags for human review. The scoping
agent must be re-run to fix the issue.

Context audits run in parallel — every unit's context file can be
verified independently.

---

### 3.3 Planner

| | |
|---|---|
| **Stage** | Stage 1 — test plan generation |
| **Role file** | `planner.md` |
| **Git pattern** | Document loop on `plan/[unit-id]` |
| **Inputs** | Spec sections relevant to this unit, interface document |
| **Output** | Test plan document (`plans/[unit-id]-test-plan.md`) |
| **Constraints** | Read-only access to spec + interfaces. Output is markdown only — no code. |

Generates a test plan from the spec. The test plan defines what to test
and how — test cases, expected behaviours, edge cases, acceptance criteria.
This plan is the input for the auditor and ultimately for the ticket agent.

---

### 3.4 Auditor (test plan)

| | |
|---|---|
| **Stage** | Stage 1 — test plan audit |
| **Role file** | `auditor.md` |
| **Git pattern** | Document loop (same worktree as planner) |
| **Inputs** | Test plan artifact, spec sections, interface document |
| **Output** | Audit report with MUST FIX / SHOULD FIX / NIT findings |
| **Constraints** | Read-only. Compares artifact against spec. Does not modify the artifact. |

Audits the test plan against the spec. Each finding is categorised by
severity. Only MUST FIX findings trigger the patch loop.

---

### 3.6 Ticket agent

| | |
|---|---|
| **Stage** | Stage 2 — ticket creation |
| **Role file** | `ticket-agent.md` |
| **Git pattern** | Document loop on `plan/[unit-id]` (or separate branch) |
| **Inputs** | Finalised test plan, spec sections, interface document, manifest file map |
| **Output** | Two ticket files: `tickets/[unit-id]a.md` (tests) and `tickets/[unit-id]b.md` (implementation) |
| **Constraints** | Read-only access to inputs. Output is two self-contained ticket files. |

Reads the finalised test plan and produces two tickets:
- **a ticket** — everything the test agent needs to write the tests
- **b ticket** — everything the impl agent needs to write the implementation

Each ticket is self-contained: it embeds the relevant spec sections, the
task description, file scope from the manifest, and acceptance criteria.
The agent receiving the ticket gets nothing else.

---

### 3.7 Test agent

| | |
|---|---|
| **Stage** | Stage 3 — test execution |
| **Role file** | `test-agent.md` |
| **Git pattern** | Execution dispatch on `ticket/[unit-id]a-tests` |
| **Inputs** | a ticket (via stdin) |
| **Output** | Test files as specified in the ticket's file map |
| **Constraints** | Write tests only. No source code modifications. Respect file boundaries from ticket. |

Executes the a ticket — writes tests per the test plan. Does not write
any source code. After the agent commits, Aperol runs the test suite to
verify syntactic validity (test failures are expected at this stage since
the implementation doesn't exist yet).

---

### 3.8 Implementation agent

| | |
|---|---|
| **Stage** | Stage 4 — implementation execution |
| **Role file** | `impl-agent.md` |
| **Git pattern** | Execution dispatch on `ticket/[unit-id]b-impl` |
| **Inputs** | b ticket (via stdin) |
| **Output** | Source files as specified in the ticket's file map |
| **Constraints** | Implement to make tests pass. Respect file boundaries from ticket. Do not modify test files. |

Executes the b ticket — writes the implementation to make the tests pass.
After the agent commits, Aperol runs the full test suite and requires all
tests to pass (exit code 0).

---

### 3.9 Implementation auditor

| | |
|---|---|
| **Stage** | Stage 5 — implementation audit |
| **Role file** | `impl-auditor.md` |
| **Git pattern** | Same branch as impl ticket |
| **Inputs** | Implementation (source files), spec sections, test results, interface document |
| **Output** | Audit report with verdict: PASS / FAIL-PATCH / FAIL-REPLAN |
| **Constraints** | Read-only. Compares implementation against spec. Runs tests as part of audit. Does not modify code. |

Audits the implementation against the spec. Checks that:
- All spec requirements for this unit are satisfied
- All tests pass
- The implementation respects the interface contract
- No requirements are missing test coverage

Produces one of three verdicts (see §2.4).

---

### 3.10 Implementation patcher

| | |
|---|---|
| **Stage** | Stage 5 — implementation patch (after FAIL-PATCH) |
| **Role file** | `impl-patcher.md` |
| **Git pattern** | Same branch as impl ticket |
| **Inputs** | Implementation source, impl audit report |
| **Output** | Patched source files |
| **Constraints** | Diff-only — addresses FAIL-PATCH findings only. Cannot rewrite code the audit didn't flag. |

Patches the implementation based on FAIL-PATCH findings from the impl
auditor. Scoped changes only. After patching, the impl auditor runs again.
Max 3 iterations of the patch → re-audit loop.

---

## 4. Role file mapping

| # | Role | Role file | Stage |
|---|---|---|---|
| 1 | Scoping agent | `scoping.md` | Pre-pipeline |
| 2 | Context audit agent | `context-auditor.md` | Post-scoping |
| 3 | Planner | `planner.md` | Stage 1 |
| 4 | Auditor | `auditor.md` | Stage 1 |
| 5 | Ticket agent | `ticket-agent.md` | Stage 2 |
| 6 | Test agent | `test-agent.md` | Stage 3 |
| 7 | Impl agent | `impl-agent.md` | Stage 4 |
| 8 | Impl auditor | `impl-auditor.md` | Stage 5 |
| 9 | Impl patcher | `impl-patcher.md` | Stage 5 |