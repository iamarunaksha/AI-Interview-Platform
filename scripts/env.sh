#!/bin/zsh
# Sets up environment variables to run everything purely from the external SSD
PROJECT_DIR="/Volumes/SanDisk SSD/Coding/AI Interview Platform"
export PATH="$PROJECT_DIR/.tools/node_modules/.bin:$PROJECT_DIR/node_modules/.bin:$PATH"
export PNPM_HOME="$PROJECT_DIR/.pnpm-store"
echo "✅ Environment configured: tools running entirely from external SSD"
