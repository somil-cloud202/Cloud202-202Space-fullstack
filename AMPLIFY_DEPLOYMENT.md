# AWS Amplify Deployment Guide

This guide will help you deploy the MyPortal application to AWS Amplify.

## 🚀 Quick Deployment Steps

### Step 1: Connect Repository to Amplify

1. **Go to AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Click "New app" → "Host web app"**
3. **Connect GitHub**:
   - Select `Cloud202-ltd/Cloud202-202Space-fullstack`
   - Choose `main` branch
   - Click "Next"

### Step 2: Configure Build Settings

Amplify will automatically detect the `amplify.yml` file. If not, use these settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npm run postinstall
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Step 3: Add Environment Variables

In the Amplify Console, go to **App settings → Environment variables** and add:

**Frontend Variables:**
```
NODE_ENV=production
VITE_APP_NAME=MyPortal
VITE_API_URL=https://your-backend-url.com
VITE_TRPC_URL=https://your-backend-url.com/trpc
```

**Note**: You'll need to deploy the backend separately (see Backend Deployment section below).

### Step 4: Deploy

1. **Review settings** and click "Save and deploy"
2. **Wait for deployment** (usually takes 3-5 minutes)
3. **Access your app** at the provided Amplify URL

## 🔧 Backend Deployment Options

Since Amplify is primarily for frontend hosting, you need to deploy the backend separately:

### Option A: AWS App Runner (Recommended)

1. **Create RDS Database**:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier myportal-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username postgres \
     --master-user-password YourStrongPassword123 \
     --allocated-storage 20 \
     --db-name myportal \
     --publicly-accessible
   ```

2. **Deploy to App Runner**:
   - Go to AWS App Runner Console
   - Create service from container registry
   - Use the Docker configuration from your repo
   - Add environment variables from `.env.amplify`

### Option B: Railway (Easiest)

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Deploy backend automatically
4. Get the Railway URL and update `VITE_API_URL` in Amplify

### Option C: Vercel (Alternative)

1. Deploy backend to Vercel as serverless functions
2. Use the Vercel URL as your API endpoint

## 📝 Environment Variables Reference

### Frontend (Amplify Console)
```
NODE_ENV=production
VITE_APP_NAME=MyPortal
VITE_API_URL=https://your-backend-url.com
VITE_TRPC_URL=https://your-backend-url.com/trpc
```

### Backend (App Runner/Railway/Vercel)
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@host:5432/myportal
ADMIN_PASSWORD=your-strong-admin-password
JWT_SECRET=your-super-long-jwt-secret-key
OPENAI_API_KEY=sk-proj-your-openai-api-key
AWS_REGION=us-east-1
```

## 🔗 Custom Domain (Optional)

1. **In Amplify Console**, go to **App settings → Domain management**
2. **Add domain**: Enter your domain name
3. **Configure DNS**: Update your domain's DNS settings
4. **SSL Certificate**: Amplify automatically provisions SSL

## 🚨 Important Notes

1. **Backend Required**: The frontend needs a backend API to function properly
2. **Database**: You'll need a PostgreSQL database (RDS, Railway, or Supabase)
3. **File Storage**: Configure S3 buckets or use Railway's built-in storage
4. **Environment Variables**: Make sure all required variables are set

## 🐛 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify `amplify.yml` build commands
- Check build logs in Amplify Console

### App Loads but API Calls Fail
- Verify `VITE_API_URL` is correct
- Check CORS settings on your backend
- Ensure backend is deployed and accessible

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check database security groups (if using RDS)
- Ensure database is publicly accessible or in same VPC

## 💰 Cost Estimate

**Amplify Hosting**:
- Free tier: 1000 build minutes, 15GB storage, 100GB data transfer
- Paid: $0.01 per build minute, $0.023 per GB storage, $0.15 per GB data transfer

**Backend Options**:
- **Railway**: ~$5-20/month (includes database)
- **App Runner + RDS**: ~$25-50/month
- **Vercel**: Free tier available, then $20/month

## 🎯 Recommended Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AWS Amplify   │    │    Railway      │    │   PostgreSQL    │
│   (Frontend)    │───▶│   (Backend)     │───▶│   (Database)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

This gives you:
- ✅ Fast global CDN (Amplify)
- ✅ Easy backend deployment (Railway)
- ✅ Managed database (Railway PostgreSQL)
- ✅ Automatic deployments from Git
- ✅ Built-in monitoring and logs
- ✅ Total cost: ~$10-25/month

## 🚀 Next Steps After Deployment

1. **Test the application** thoroughly
2. **Set up monitoring** and alerts
3. **Configure backup** strategies
4. **Set up CI/CD** for automated deployments
5. **Add custom domain** if needed
6. **Monitor costs** and optimize as needed

---

**Need Help?** Check the AWS Amplify documentation or Railway documentation for more detailed guides.
