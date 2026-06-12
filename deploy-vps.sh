#!/bin/bash
# AI Memory VPS Setup Script

echo "🚀 Starting AI Memory Deployment..."

# 1. Install Node.js if missing
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# 3. Install Dependencies
echo "📦 Installing project dependencies..."
npm install

# 4. Check for .env
if [ ! -f .env ]; then
    echo "⚠️ .env file missing! Creating template..."
    cp .env.example .env
    echo "❌ Please edit .env and add your MongoDB Atlas URI, then run 'pm2 start ecosystem.config.js'"
    exit 1
fi

# 5. Start with PM2
echo "✅ Starting AI Memory MCP Server..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "🎉 Deployment Complete! Server running on port 3100."
