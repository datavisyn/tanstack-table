#!/bin/bash

# --- Configuration ---
# Change this to 'origin' if your target beta branch is hosted there instead of 'upstream'
REMOTE="upstream" 
TARGET_BRANCH="beta"
# ---------------------

echo "Fetching latest changes from $REMOTE..."
git fetch $REMOTE

# 1. Remember the branch you are currently working on
CURRENT_BRANCH=$(git branch --show-current)

# 2. Switch to the beta branch
echo "Switching to $TARGET_BRANCH..."
git checkout $TARGET_BRANCH

# 3. Fast-forward the local beta branch to match the remote
echo "Updating local $TARGET_BRANCH with $REMOTE/$TARGET_BRANCH..."
if git merge --ff-only $REMOTE/$TARGET_BRANCH; then
    echo "✅ $TARGET_BRANCH successfully updated."
else
    echo "❌ Error: Could not fast-forward. Do you have accidental local commits on $TARGET_BRANCH?"
    # If this fails, you can force it to exactly match the remote by replacing the merge command with:
    # git reset --hard $REMOTE/$TARGET_BRANCH
    exit 1
fi

# 4. Switch back to your working branch (if you weren't already on beta)
if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
    echo "Switching back to your working branch: $CURRENT_BRANCH..."
    git checkout "$CURRENT_BRANCH"
fi

echo "Done!"