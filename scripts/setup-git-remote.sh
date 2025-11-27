#!/bin/bash

# Script to setup git remote with GitHub token for mcp-technical-analysis repo
# Usage: ./scripts/setup-git-remote.sh

# GitHub Personal Access Token
GITHUB_TOKEN="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"

# GitHub Repository URL
REPO_URL="https://github.com/FajarArrizki/mcp-technical-analysis"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GitHub token is not set!"
    exit 1
fi

# Extract repo name from URL
REPO_NAME=$(basename "$REPO_URL" .git)

# Remove existing origin if it exists
git remote remove origin 2>/dev/null

# Add remote with token
git remote add origin "https://${GITHUB_TOKEN}@github.com/FajarArrizki/${REPO_NAME}.git"

echo "Git remote configured successfully for ${REPO_NAME}!"
echo "Repository: ${REPO_URL}"
echo "You can now use: git push, git pull, etc."

