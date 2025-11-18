# 🚀 Deployment Guide for Coolify

This guide will help you deploy your React application to Coolify.

## 📋 Prerequisites

1. **Coolify Instance**: Access to a Coolify server
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)
3. **Environment Variables**: Prepare your production environment variables
4. **Package Manager**: This project uses **pnpm** as the package manager

## 🔧 Environment Variables

Create a `.env.production` file with your production environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# PocketBase Configuration
VITE_POCKETBASE_URL=your_pocketbase_url
VITE_POCKETBASE_ADMIN_EMAIL=your_admin_email
VITE_POCKETBASE_ADMIN_PASSWORD=your_admin_password
```

## 🐳 Docker Configuration

The project includes:
- `Dockerfile` - Multi-stage build for production using pnpm
- `nginx.conf` - Nginx configuration for SPA routing
- `.dockerignore` - Excludes unnecessary files
- `docker-compose.yml` - For local testing
- `pnpm-lock.yaml` - Lock file for reproducible builds

**Note**: The Dockerfile automatically installs pnpm and uses it for dependency management.

## 📦 Coolify Deployment Steps

### 1. **Create New Application**
1. Log into your Coolify dashboard
2. Click "New Application"
3. Select "Docker" as the deployment method

### 2. **Configure Source**
1. **Source**: Choose your Git repository
2. **Branch**: Select your main branch (e.g., `main` or `master`)
3. **Dockerfile Path**: Leave as `Dockerfile` (default)

### 3. **Environment Configuration**
1. **Port**: Set to `80` (nginx port)
2. **Build Command**: Leave empty (handled by Dockerfile)
3. **Start Command**: Leave empty (handled by Dockerfile)

### 4. **Environment Variables**
Add your production environment variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_POCKETBASE_URL=your_pocketbase_url
VITE_POCKETBASE_ADMIN_EMAIL=your_admin_email
VITE_POCKETBASE_ADMIN_PASSWORD=your_admin_password
NODE_ENV=production
```

### 5. **Domain Configuration**
1. **Domain**: Add your custom domain
2. **SSL**: Enable automatic SSL certificate
3. **Force HTTPS**: Enable for security

### 6. **Deploy**
1. Click "Deploy" to start the build process
2. Monitor the build logs for any issues
3. Wait for deployment to complete

## 🔍 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check if all dependencies are in `package.json`
   - Verify Node.js version compatibility (18+)
   - Check build logs for specific errors
   - Ensure `pnpm-lock.yaml` is committed to repository

2. **Package Manager Issues**
   - The Dockerfile automatically installs pnpm
   - Ensure `pnpm-lock.yaml` is up to date
   - Run `pnpm install` locally to regenerate lock file if needed

3. **Environment Variables Not Working**
   - Ensure all variables start with `VITE_` for client-side access
   - Verify variable names match your code
   - Check Coolify environment variable configuration

3. **Routing Issues**
   - Verify nginx configuration is correct
   - Check if React Router is properly configured
   - Ensure all routes fall back to `index.html`

5. **API Connection Issues**
   - Verify Supabase and PocketBase URLs are correct
   - Check CORS settings on your backend services
   - Ensure API keys are valid

## 🧪 Local Testing

Before deploying to Coolify, test locally:

```bash
# Install dependencies
pnpm install

# Build and run with Docker Compose
docker-compose up --build

# Test the application
curl http://localhost:3000/health
```

## 📊 Monitoring

After deployment:
1. **Health Check**: Visit `/health` endpoint
2. **Application Logs**: Monitor in Coolify dashboard
3. **Performance**: Check nginx access logs
4. **SSL**: Verify HTTPS is working

## 🔄 Continuous Deployment

Coolify supports automatic deployments:
1. **Auto Deploy**: Enable for automatic deployments on push
2. **Preview Deployments**: Enable for pull request testing
3. **Rollback**: Use Coolify's rollback feature if needed

## 📝 Notes

- The application uses nginx to serve static files
- React Router handles client-side routing
- Environment variables are injected at build time
- Health check endpoint is available at `/health`
- Static assets are cached for 1 year
- Gzip compression is enabled for better performance
- **Package Management**: Uses pnpm for faster, more efficient dependency management

## 🆘 Support

If you encounter issues:
1. Check Coolify logs
2. Verify Docker build locally
3. Test environment variables
4. Review nginx configuration
5. Ensure pnpm lock file is committed
