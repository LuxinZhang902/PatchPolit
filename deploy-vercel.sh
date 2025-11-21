#!/bin/bash

echo "🚀 Deploying PatchPilot to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "🔐 Please make sure you have the following ready:"
echo "   - Vercel account (sign up at vercel.com)"
echo "   - Your API keys:"
echo "     • EXA_API_KEY"
echo "     • GROQ_API_KEY"
echo "     • GITHUB_TOKEN (optional)"
echo "     • GITHUB_USERNAME (optional)"
echo ""

read -p "Press Enter to continue with deployment..."

echo ""
echo "🌐 Starting Vercel deployment..."
echo ""

# Deploy to Vercel
vercel

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📝 Next steps:"
echo "   1. Go to your Vercel dashboard"
echo "   2. Navigate to your project settings"
echo "   3. Add environment variables:"
echo "      - BACKEND_BASE_URL=https://your-app.vercel.app"
echo "      - DATABASE_URL=file:./dev.db"
echo "      - EXA_API_KEY=your_key"
echo "      - GROQ_API_KEY=your_key"
echo "      - GITHUB_TOKEN=your_token (optional)"
echo "      - GITHUB_USERNAME=your_username (optional)"
echo "   4. Redeploy after adding environment variables"
echo ""
echo "⚠️  Note: For production, consider using PostgreSQL instead of SQLite"
echo "   See DEPLOYMENT.md for PostgreSQL setup instructions"
