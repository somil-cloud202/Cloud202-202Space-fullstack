# MyPortal - AWS Amplify Deployment

This repository is configured for deployment on AWS Amplify with a separate backend.

## 🚀 Quick Start

### 1. Deploy Frontend to Amplify

1. **Connect Repository**:
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect this GitHub repository
   - Select `main` branch

2. **Build Settings**:
   - Amplify will automatically detect `amplify.yml`
   - No changes needed to build settings

3. **Environment Variables**:
   ```
   NODE_ENV=production
   VITE_APP_NAME=MyPortal
   VITE_API_URL=https://your-backend-url.com
   VITE_TRPC_URL=https://your-backend-url.com/trpc
   ```

4. **Deploy**: Click "Save and deploy"

### 2. Deploy Backend Separately

Choose one of these options:

#### Option A: Railway (Recommended - Easiest)
1. Go to [railway.app](https://railway.app)
2. Connect this same GitHub repository
3. Railway will auto-detect the Node.js backend
4. Add environment variables from `.env.amplify`
5. Deploy automatically

#### Option B: AWS App Runner
1. Use the provided `apprunner.yaml` configuration
2. Create RDS database first
3. Deploy container to App Runner
4. Configure environment variables

#### Option C: Vercel
1. Deploy backend as serverless functions
2. Use Vercel's PostgreSQL addon
3. Configure environment variables

### 3. Update Frontend Configuration

After backend deployment:
1. Get your backend URL (e.g., `https://myportal-backend.railway.app`)
2. Update Amplify environment variables:
   - `VITE_API_URL=https://your-backend-url.com`
   - `VITE_TRPC_URL=https://your-backend-url.com/trpc`
3. Redeploy frontend

## 📁 Key Files for Amplify

- `amplify.yml` - Build configuration
- `vite.config.ts` - Vite build settings
- `public/_redirects` - SPA routing redirects
- `src/config/api.ts` - API URL configuration
- `.env.amplify` - Environment variables template

## 🔧 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AWS Amplify   │    │    Backend      │    │   Database      │
│   (Frontend)    │───▶│   (Railway/     │───▶│  (PostgreSQL)   │
│   React + Vite  │    │    App Runner)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 💰 Estimated Costs

- **Amplify**: Free tier covers most small apps
- **Railway**: ~$5-20/month (includes database)
- **Total**: ~$5-20/month

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs in Amplify console

### API Calls Fail
- Verify backend is deployed and accessible
- Check `VITE_API_URL` environment variable
- Ensure CORS is configured on backend

### Routing Issues
- Verify `public/_redirects` file exists
- Check TanStack Router configuration

## 📚 Documentation

- [AWS Amplify Docs](https://docs.amplify.aws/)
- [Railway Docs](https://docs.railway.app/)
- [TanStack Router](https://tanstack.com/router)

## 🆘 Support

If you encounter issues:
1. Check the build logs in Amplify Console
2. Verify environment variables are set correctly
3. Test backend API endpoints directly
4. Check browser console for errors
