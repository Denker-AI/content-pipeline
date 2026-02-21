#!/bin/bash

# Setup Git hooks for branch protection
# Run this script after cloning the repository: ./scripts/setup-git-hooks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

echo "🔧 Setting up Git hooks for branch protection..."
echo ""

# Copy pre-commit hook
if [ -f "$SCRIPT_DIR/git-hooks/pre-commit" ]; then
  cp "$SCRIPT_DIR/git-hooks/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  echo "✅ pre-commit hook installed (prevents commits to main/develop)"
else
  echo "❌ Error: pre-commit hook not found"
  exit 1
fi

# Copy pre-push hook
if [ -f "$SCRIPT_DIR/git-hooks/pre-push" ]; then
  cp "$SCRIPT_DIR/git-hooks/pre-push" "$GIT_HOOKS_DIR/pre-push"
  chmod +x "$GIT_HOOKS_DIR/pre-push"
  echo "✅ pre-push hook installed (prevents pushing to main/develop)"
else
  echo "❌ Error: pre-push hook not found"
  exit 1
fi

echo ""
echo "🎉 Git hooks installed successfully!"
echo ""
echo "These hooks will:"
echo "  • Block direct commits to main and develop branches"
echo "  • Block direct pushes to main and develop branches"
echo "  • Enforce PR workflow for all changes"
echo ""
echo "To bypass hooks (use with caution): git push --no-verify"
echo ""
