#!/bin/bash
# Autonomous story runner — launches fresh Claude sessions in a loop.
# Each session picks the next Ready story, implements it, merges, and exits.
# Stop with Ctrl+C when all stories are done (or it will tell you).
#
# Usage: ./scripts/run-stories.sh
# Logs: ./scripts/run-stories.sh 2>&1 | tee logs/run.log

set -e
cd "$(dirname "$0")/.."

# Allow running even if launched from a Claude session
unset CLAUDECODE

PROMPT='Follow docs/AGENT-WORKFLOW.md exactly. You are an autonomous session.

Phase 1 (Orient): Read docs/PROGRESS.md, find the next story with status "Ready" in the execution order. Read that story file from docs/stories/. Check git log and git branch.

If no story is Ready, post to Slack that all stories are complete and exit immediately.

Phase 2 (Plan): Read every file listed in the story spec. Understand the existing code patterns.

Phase 3 (Implement): Create a feature branch, write the code, commit after each milestone.

Phase 4 (Verify): Run bun lint, bun typecheck, bun run build. Fix any errors. Re-verify until all pass.

Phase 5 (Merge): git checkout main, git merge the branch --no-edit, git push --no-verify, delete the branch.

Phase 6 (Update Docs): Update docs/PROGRESS.md — mark story complete, unblock dependent stories, update Next Story. Commit and push.

Phase 7 (Notify): Post completion to Slack #content-pipeline-app (C0AGCQNCKPU).

Phase 8 (Exit): You are done. Exit cleanly.'

echo "=== Content Pipeline — Autonomous Story Runner ==="
echo "Starting story loop. Press Ctrl+C to stop."
echo ""

STORY_NUM=0
while true; do
  STORY_NUM=$((STORY_NUM + 1))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Session #$STORY_NUM — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check if there are any Ready stories left
  if ! grep -q "| Ready |" docs/PROGRESS.md; then
    echo ""
    echo "All stories complete! No more Ready stories in PROGRESS.md."
    exit 0
  fi

  # Show which story is next
  echo "Next story:"
  grep "| Ready |" docs/PROGRESS.md | head -1
  echo ""

  # Run Claude in print mode — outputs final result as plain text
  claude -p "$PROMPT" \
    --dangerously-skip-permissions \
    --model opus \
    2>&1 || true

  echo ""
  echo "Session #$STORY_NUM finished. Next session in 10 seconds..."
  echo "(Press Ctrl+C to stop)"
  sleep 10
done
