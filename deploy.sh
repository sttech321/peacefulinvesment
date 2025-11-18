#!/bin/bash

# Deployment script for Coolify
# This script can be used as a reference for deployment commands

echo "🚀 Starting deployment process..."

# Build the application
echo "📦 Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Create production environment file if it doesn't exist
if [ ! -f .env.production ]; then
    echo "📝 Creating .env.production template..."
    cat > .env.production << EOF
# Production Environment Variables
# Replace these with your actual values

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# PocketBase Configuration
VITE_POCKETBASE_URL=your_pocketbase_url
VITE_POCKETBASE_ADMIN_EMAIL=your_admin_email
VITE_POCKETBASE_ADMIN_PASSWORD=your_admin_password

# Environment
NODE_ENV=production
EOF
    echo "⚠️  Please update .env.production with your actual values"
fi

echo "🎉 Deployment files are ready!"
echo "📋 Next steps:"
echo "1. Push your code to Git repository"
echo "2. Configure Coolify with your repository"
echo "3. Set environment variables in Coolify"
echo "4. Deploy!"
