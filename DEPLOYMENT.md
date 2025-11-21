# 🚀 Deployment Guide

This guide covers deploying PatchPilot using Docker or Vercel.

---

## 🐳 Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose installed (optional but recommended)

### Option 1: Docker Compose (Recommended)

1. **Create `.env` file** with your API keys:
   ```bash
   cp .env.example .env
   # Edit .env and add your keys
   ```

2. **Build and run**:
   ```bash
   docker-compose up -d
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f
   ```

4. **Stop the container**:
   ```bash
   docker-compose down
   ```

5. **Access the app**:
   - Open http://localhost:3000

### Option 2: Docker CLI

1. **Build the image**:
   ```bash
   docker build -t patchpilot .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e BACKEND_BASE_URL=http://localhost:3000 \
     -e DATABASE_URL=file:./dev.db \
     -e EXA_API_KEY=your_exa_key \
     -e GROQ_API_KEY=your_groq_key \
     -e GITHUB_TOKEN=your_github_token \
     -v $(pwd)/prisma/dev.db:/app/prisma/dev.db \
     -v $(pwd)/sandbox/temp:/app/sandbox/temp \
     --name patchpilot \
     patchpilot
   ```

3. **View logs**:
   ```bash
   docker logs -f patchpilot
   ```

4. **Stop the container**:
   ```bash
   docker stop patchpilot
   docker rm patchpilot
   ```

### Docker Features
- ✅ Isolated environment
- ✅ Automatic database migrations
- ✅ Persistent data with volumes
- ✅ Health checks
- ✅ Auto-restart on failure
- ✅ Production-optimized build

---

## ☁️ Vercel Deployment

### Prerequisites
- Vercel account (free tier works)
- GitHub repository (recommended)

### Step 1: Prepare Your Repository

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/patchpilot.git
   git push -u origin main
   ```

2. **Ensure `.env` is in `.gitignore`** (already configured)

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new

2. **Import your GitHub repository**

3. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add the following:
     ```
     BACKEND_BASE_URL=https://your-app.vercel.app
     DATABASE_URL=file:./dev.db
     EXA_API_KEY=your_exa_api_key
     GROQ_API_KEY=your_groq_api_key
     GITHUB_TOKEN=your_github_token
     ```
   - ⚠️ **Important**: Update `BACKEND_BASE_URL` after deployment with your actual Vercel URL

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

6. **Update BACKEND_BASE_URL**:
   - After first deployment, copy your Vercel URL (e.g., `https://patchpilot.vercel.app`)
   - Go to Project Settings → Environment Variables
   - Update `BACKEND_BASE_URL` to your Vercel URL
   - Redeploy

#### Option B: Via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Add environment variables**:
   ```bash
   vercel env add BACKEND_BASE_URL
   vercel env add DATABASE_URL
   vercel env add EXA_API_KEY
   vercel env add GROQ_API_KEY
   vercel env add GITHUB_TOKEN
   ```

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Step 3: Configure Domain (Optional)

1. Go to your project settings on Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Update `BACKEND_BASE_URL` environment variable

---

## ⚠️ Important Notes

### Database Considerations

#### For Docker:
- ✅ SQLite works perfectly
- ✅ Data persisted via volumes
- ✅ Automatic migrations on startup

#### For Vercel:
- ⚠️ **SQLite has limitations** on serverless
- ⚠️ Database resets on each deployment
- 🔄 **Recommended**: Use PostgreSQL for production

**To use PostgreSQL on Vercel:**

1. **Create a PostgreSQL database**:
   - Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - Or [Supabase](https://supabase.com)
   - Or [Neon](https://neon.tech)

2. **Update `DATABASE_URL`**:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
   ```

3. **Update Prisma schema** (`prisma/schema.prisma`):
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

4. **Create new migration**:
   ```bash
   npx prisma migrate dev --name switch_to_postgres
   ```

### Sandbox Limitations on Vercel

⚠️ **Important**: Vercel's serverless functions have limitations:
- 50MB deployment size limit
- 10-second execution timeout (Hobby plan)
- 60-second timeout (Pro plan)
- Read-only filesystem (except `/tmp`)

**Implications for PatchPilot:**
- ❌ Cannot clone large repositories
- ❌ Cannot run long-running operations
- ❌ Limited disk space for dependencies

**Solutions:**
1. **Use Docker** for full functionality
2. **Use E2B** for cloud sandboxes (production-ready)
3. **Hybrid approach**: Deploy UI to Vercel, agent to Docker/VPS

---

## 🔧 Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

**Permission denied:**
```bash
sudo chmod +x docker-entrypoint.sh
```

**Database locked:**
```bash
# Stop container
docker-compose down
# Remove database lock
rm prisma/dev.db-journal
# Restart
docker-compose up -d
```

### Vercel Issues

**Build fails:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

**Database errors:**
- SQLite may not work reliably on Vercel
- Switch to PostgreSQL for production

**Timeout errors:**
- Agent operations may exceed serverless limits
- Consider Docker deployment instead

**Module not found:**
```bash
# Clear cache and rebuild
vercel --force
```

---

## 📊 Comparison: Docker vs Vercel

| Feature | Docker | Vercel |
|---------|--------|--------|
| **Setup Complexity** | Medium | Easy |
| **Cost** | Free (self-hosted) | Free tier available |
| **Scalability** | Manual | Automatic |
| **Database** | SQLite ✅ | PostgreSQL recommended |
| **Execution Time** | Unlimited | 10-60s limit |
| **File System** | Full access | Limited |
| **Repository Cloning** | ✅ Full support | ⚠️ Limited |
| **Best For** | Full functionality | UI + API only |

---

## 🎯 Recommended Deployment Strategy

### Development
```bash
npm run dev
```

### Staging/Demo
```bash
docker-compose up -d
```

### Production (Option 1: All-in-One)
- Deploy everything with Docker on VPS/Cloud
- Use PostgreSQL
- Set up reverse proxy (nginx)
- Enable HTTPS with Let's Encrypt

### Production (Option 2: Hybrid)
- Deploy UI to Vercel (fast, scalable)
- Deploy agent to Docker on VPS (full functionality)
- Use PostgreSQL (shared database)
- Connect via API

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Set strong `GITHUB_TOKEN` with minimal permissions
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Use PostgreSQL with connection pooling
- [ ] Set up monitoring and logging
- [ ] Regular security updates
- [ ] Backup database regularly

---

## 📚 Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

**Need help?** Check the logs first:
- Docker: `docker-compose logs -f`
- Vercel: Check deployment logs in dashboard
- Local: Check terminal output

**Happy deploying!** 🚀
