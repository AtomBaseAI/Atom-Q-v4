# Vercel Deployment Guide

This guide will help you deploy Atom Q to Vercel.

## Prerequisites

- A Vercel account
- A GitHub account (for Git integration)
- Node.js 18+ installed locally
- Bun or npm installed locally

## Database Options

### Option 1: Vercel Postgres (Recommended for Production)

Vercel Postgres is the recommended database solution for Vercel deployments.

1. **Create Vercel Postgres Database**
   - Go to your Vercel dashboard
   - Navigate to your project
   - Click on "Storage" tab
   - Click "Create Database"
   - Select "Postgres" and follow the prompts

2. **Update Prisma Schema**
   - Change the datasource in `prisma/schema.prisma`:
     ```prisma
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
     }
     ```

3. **Set Environment Variables**
   - Add `DATABASE_URL` from your Vercel Postgres project settings

4. **Run Migrations**
   ```bash
   bunx prisma migrate deploy
   ```

### Option 2: Vercel Postgres with Prisma Accelerate (Optional)

For faster database queries, enable Prisma Accelerate:

1. Go to your Vercel project settings
2. Navigate to "Postgres" settings
3. Enable "Prisma Accelerate"
4. Update your `DATABASE_URL` connection string with the Accelerate endpoint

### Option 3: External Database

You can use an external PostgreSQL database:

1. Set up a PostgreSQL database (e.g., Neon, Supabase, Railway)
2. Get the connection string
3. Add `DATABASE_URL` to Vercel environment variables

### Option 4: SQLite (Development Only)

SQLite is not recommended for production on Vercel because:
- File storage is not persistent across deployments
- Vercel's serverless functions don't maintain file state

**Use SQLite only for local development.**

## Environment Variables

Set these in your Vercel project settings:

### Required Variables

```bash
# Database Connection
DATABASE_URL="your-database-connection-string"

# NextAuth Configuration
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-app.vercel.app"

# Environment
NODE_ENV="production"
```

### Optional Variables

```bash
# For Docker/self-hosted deployments
OUTPUT_MODE="standalone"
```

## Generating NEXTAUTH_SECRET

Generate a secure secret:

```bash
openssl rand -base64 32
```

Or use the Vercel environment variable editor to generate a random string.

## Deployment Steps

### 1. Push Code to GitHub

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Import Project in Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will automatically detect Next.js configuration

### 3. Configure Project Settings

#### Framework Preset
- Framework: Next.js
- Root Directory: `./` (default)
- Build Command: `bun run build` (or `npm run build`)
- Output Directory: `.next` (default)
- Install Command: `bun install` (or `npm install`)

#### Environment Variables
Add the required environment variables listed above.

#### Deployment Regions
Choose a region closest to your users:
- `iad1` (US East - recommended for North America)
- `hkg1` (Asia Pacific - Hong Kong)
- `fra1` (Europe - Frankfurt)

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## Post-Deployment Steps

### 1. Run Database Migrations

After the first deployment:

```bash
# In your terminal
bunx prisma migrate deploy
```

Or add it to your build script:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build",
    "vercel-build": "prisma migrate deploy && prisma generate && next build"
  }
}
```

### 2. Seed Initial Data

Optionally seed your database with initial data:

```bash
# Create a seed script or use existing
bun run db:seed
```

**Note:** You may need to do this through a Vercel CLI command or by creating a temporary API route.

### 3. Update Production URL

Update your environment variable:
- `NEXTAUTH_URL` should be set to your production URL
- Example: `https://atom-q.vercel.app`

### 4. Create Admin User

Access your deployed app and:
1. Register a new user account
2. Update the user's role to 'ADMIN' directly in the database, or
3. Use a seed script that creates an initial admin user

## Monitoring and Logs

- **Build Logs**: Check Vercel dashboard → Deployments → Select deployment
- **Runtime Logs**: Check Vercel dashboard → Functions → Logs
- **Database**: Use Vercel Postgres dashboard or Prisma Studio

## Troubleshooting

### Build Errors

**Issue**: Build fails with module not found
```bash
# Solution: Clean and rebuild
rm -rf .next node_modules
bun install
bun run build
```

**Issue**: Prisma generation fails
```bash
# Solution: Regenerate Prisma Client
bunx prisma generate
```

### Runtime Errors

**Issue**: Database connection errors
```bash
# Solution: Check DATABASE_URL is correctly set
# Verify database is accessible from Vercel
```

**Issue**: Authentication errors
```bash
# Solution: Verify NEXTAUTH_SECRET and NEXTAUTH_URL
# Ensure NEXTAUTH_URL matches your deployed URL exactly
```

### Performance Issues

**Issue**: Slow database queries
```bash
# Solution: Enable Prisma Accelerate (if using Vercel Postgres)
# Check query performance in Vercel Postgres dashboard
```

## Continuous Deployment

Vercel automatically deploys on every push to your configured branch:

- `main` branch → Production deployment
- Other branches → Preview deployments

Configure branch protection in GitHub for `main` to control production deployments.

## Custom Domain (Optional)

1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain

## Scaling Considerations

### Database Scaling

- Vercel Postgres scales automatically
- Monitor usage in Vercel dashboard
- Consider connection pooling for high-traffic apps

### Caching

- Enable Vercel Edge Caching for static assets
- Implement Redis caching for frequently accessed data
- Use Next.js revalidation strategies

### Rate Limiting

The app includes rate limiting for login attempts. Adjust limits in:
- `src/lib/rate-limit.ts` (if using IP-based limiting)
- Consider using Vercel KV for distributed rate limiting

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Database**: Use read-only credentials for public API routes
3. **HTTPS**: Vercel automatically provides SSL certificates
4. **Secrets**: Rotate `NEXTAUTH_SECRET` periodically
5. **Dependencies**: Keep dependencies updated with `bun update`

## Support

For issues specific to:
- **Vercel**: [Vercel Support](https://vercel.com/support)
- **Prisma**: [Prisma Docs](https://www.prisma.io/docs)
- **NextAuth**: [NextAuth Docs](https://next-auth.js.org/)

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Postgres Guide](https://vercel.com/docs/storage/vercel-postgres)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment/vercel)
