---
name: pr-merge
description: Create a PR, watch CI checks (including migration dry-run), merge, verify post-merge migration, and clean up branch.
argument-hint: '[PR number or title]'
allowed-tools: Bash(git *), Bash(gh *), Bash(bun *), Bash(git status*), Bash(git log*), Bash(git add*), Bash(git commit*), Bash(git push*), Bash(git diff*), Bash(git ls-remote*), Bash(git fetch*), Bash(git branch*), Bash(gh pr *), Bash(gh api *), Bash(gh run *)
---

# PR, Watch CI, Merge, Verify Migrations, Clean Up

Create a pull request, watch all CI checks (including migration dry-run if applicable), merge if all pass, verify post-merge migration workflow succeeds, then clean up the branch.

## Arguments

- `$ARGUMENTS` — Optional: PR title override or PR number (if PR already exists)

## Workflow

### Step 1: Determine current state

```bash
git status
git log --oneline -5
```

- If `$ARGUMENTS` is a number, treat it as an existing PR number and skip to Step 4.
- Otherwise, proceed to create a new PR.

### Step 2: Pre-commit quality checks

Before committing or pushing, run formatting and lint checks. Fix any issues automatically:

```bash
bun format          # Auto-fix formatting with Prettier
bun lint --fix      # Auto-fix lint issues
```

Then verify everything passes:

```bash
bun format:check && bun lint && bun typecheck
```

If any check fails, fix the issues and stage the fixes before proceeding.

### Step 3: Create the PR

1. Determine the base branch:
   - Default to `main`.
   - If the current branch is tracking a specific remote branch, use that branch's base instead.

2. Push the current branch if not already pushed:

   ```bash
   git push -u origin HEAD
   ```

3. **Detect Sentry fix branches** — If the current branch matches `fix/sentry-*`:
   - Extract the Sentry issue ID from the branch name (e.g., `fix/sentry-denker-chenin-36` → `DENKER-CHENIN-36`)
   - Convert the slug back to uppercase: `echo "$BRANCH" | sed 's|fix/sentry-||' | tr '[:lower:]' '[:upper:]'`
   - **MUST include** `Sentry: DENKER-CHENIN-XX` on its own line in the PR body
   - This is required for the `sentry-resolve-on-merge` workflow to auto-resolve the Sentry issue when the PR merges

4. Create the PR with `gh pr create`:
   - Use `$ARGUMENTS` as the title if provided, otherwise generate a title from the commits
   - Use `--base <base-branch>` with the determined base
   - If Sentry branch: include `Sentry: <ID>` in the body (do NOT use `--fill` alone)
   - Otherwise: use `--fill` to auto-fill the body from commits if no custom title

5. Capture the PR number from the output.

### Step 4: Watch CI checks (pre-merge)

Poll CI status every 30 seconds until all checks complete:

```bash
gh pr checks <PR_NUMBER> --watch --fail-fast
```

If `--watch` is not available, poll manually:

```bash
while true; do
  STATUS=$(gh pr checks <PR_NUMBER> 2>&1)
  echo "$STATUS"

  if echo "$STATUS" | grep -q "fail\|X "; then
    echo "CI FAILED"
    break
  fi

  if echo "$STATUS" | grep -q "pass\|✓" && ! echo "$STATUS" | grep -q "pending\|running\|- "; then
    echo "ALL CI CHECKS PASSED"
    break
  fi

  echo "Waiting 30s for CI..."
  sleep 30
done
```

**Expected CI checks:**

- **Detect Changes** — file change detection
- **Code Quality** — lint, typecheck, format
- **Unit Tests** — runs if code/test files changed
- **Migration Dry Run** — runs if `supabase/migrations/**` changed (validates migrations against production DB without applying)

**ALL checks must pass before merging.** If Migration Dry Run fails, do NOT merge — the migration has errors that need fixing first.

### Step 5: Merge

**If CI passed:**

- Merge the PR with squash (do NOT use `--delete-branch` which fails in worktrees):
  ```bash
  gh pr merge <PR_NUMBER> --squash
  ```
- If `gh pr merge` fails (e.g. branch protection, permissions), merge via API:
  ```bash
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  gh api "repos/${REPO}/pulls/<PR_NUMBER>/merge" -f merge_method=squash
  ```

**If CI failed:**

- Do NOT merge.
- Show the failing checks: `gh pr checks <PR_NUMBER>`
- Show the failed check logs if possible: `gh run view <RUN_ID> --log-failed`
- Report which checks failed and suggest fixes.
- **STOP HERE** — do not proceed to Steps 6-7.

### Step 6: Watch post-merge migration workflow (if applicable)

After merge, check if the PR included migration files:

```bash
gh pr diff <PR_NUMBER> --name-only | grep -q '^supabase/migrations/'
```

**If migrations were included:**

1. Wait a few seconds for the `Database Migration` workflow to trigger (it runs on push to `main` when `supabase/migrations/**` changes).

2. Find the migration workflow run:

   ```bash
   # Wait for workflow to appear
   sleep 10

   # Find the latest run of db-migrate.yml
   gh run list --workflow=db-migrate.yml --limit=3
   ```

3. Watch the migration workflow:

   ```bash
   gh run watch <RUN_ID>
   ```

4. **If migration succeeded:**
   - Report success and proceed to Step 7 (branch cleanup).

5. **If migration failed:**
   - Show the failure logs: `gh run view <RUN_ID> --log-failed`
   - **Do NOT delete the branch** — it may be needed for a hotfix.
   - Report the failure clearly and suggest next steps (check migration SQL, check Supabase dashboard).
   - **STOP HERE** — do not clean up the branch.

**If no migrations were included:** Skip directly to Step 7.

### Step 7: Clean up branch

Only reach this step if merge succeeded AND (no migrations OR migrations succeeded):

```bash
# Delete remote branch
git push origin --delete <BRANCH_NAME>

# Fetch and prune
git fetch --prune origin
```

## Output

Report a summary table:

| Item                      | Status                     |
| ------------------------- | -------------------------- |
| **PR**                    | URL and number             |
| **CI: Code Quality**      | pass/fail                  |
| **CI: Unit Tests**        | pass/fail/skipped          |
| **CI: Migration Dry Run** | pass/fail/skipped          |
| **Merge**                 | merged/blocked             |
| **Post-merge Migration**  | success/failed/n/a         |
| **Branch cleanup**        | deleted/kept (with reason) |
| **Current branch**        | branch name                |
