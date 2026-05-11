---
name: db-update-knowledge
description: Use when discovering new facts about digital-books system behavior, fixing bugs, or verifying API flows that should be persisted for future reference
---

# Digital Books — Update Knowledge Skill

## Purpose

Classify and persist discovered facts about the digital-books system into the appropriate knowledge file. Ensures facts are verified, non-duplicate, and properly categorized.

## Mandatory First Actions

1. Read `.claude/skills/learnings/system.md` — check existing facts
2. Read relevant per-page file if exists

## Classification Rules

| Scope | Target File | When |
|-------|------------|------|
| System-wide (2+ pages) | `learnings/system.md` | Patterns affecting multiple features |
| Report pages | `learnings/bao-cao.md` | Report-specific flows and issues |
| Voucher/Journal | `learnings/chung-tu.md` | Voucher entry flows |
| Master data | `learnings/danh-muc.md` | Account/counterparty data |
| Config/Permission | `learnings/cau-hinh.md` | Permission, role, user management |
| Cash book | `learnings/so-quy.md` | Cash flow specific |
| Payables | `learnings/cong-no.md` | Receivables/payables specific |
| Deploy/Infra | `learnings/deploy.md` | Deployment issues and fixes |

## Fact Entry Format

```markdown
### [Date] Short description
- **Flow:** Page → API → Service → Method
- **Issue:** What went wrong (if bug fix)
- **Root cause:** Why it happened
- **Fix:** What was changed
- **Verified:** YES/NO (mark NO until confirmed via server logs)
- **Files:** List of files involved
```

## Workflow

1. **Collect** — Identify the fact to record
2. **Classify** — Determine target file based on scope
3. **Check duplicates** — Search existing facts for overlap
4. **Write** — Add fact in standard format
5. **Mark verification status** — NO until confirmed on server

## Verification Protocol

Facts marked `Verified: NO` need confirmation:
1. Deploy relevant service to server
2. Trigger the flow (via browser or API call)
3. Check container logs: `ssh kt "docker logs digital-book-app --tail 50"`
4. If confirmed, update to `Verified: YES` with timestamp

## Size Limits

- Per-file MAX: ~8,000 chars active facts
- When exceeded: archive old verified facts to `{name}-changelog.md`
- Keep only active/recent facts in main file
