# Amplify Full-Stack Migration Guide

## Option 1: Frontend Only (Recommended - 15 minutes)

### Step 1: Prepare Frontend
1. Copy `amplify.yml` to your project root
2. Update `package.json` build script:
   ```json
   {
     "scripts": {
       "build": "tsr generate && vite build"
     }
   }
   ```

### Step 2: Deploy Frontend to Amplify
1. Go to AWS Amplify Console
2. Connect GitHub repository
3. Use build settings from `amplify.yml`
4. Add environment variables
5. Deploy

### Step 3: Deploy Backend Separately
Choose one:
- **AWS App Runner** (easiest for containers)
- **AWS Lambda** (serverless, use `serverless.yml`)
- **AWS ECS** (your existing Terraform setup)

## Option 2: Convert to Next.js (30 minutes)

### Step 1: Install Next.js
```bash
npm install next react react-dom
npm install -D @types/node
```

### Step 2: Create Next.js Structure
```
pages/
  api/
    trpc/
      [trpc].ts
  _app.tsx
  index.tsx
  admin/
    holidays.tsx
```

### Step 3: Migrate Components
- Move React components to `components/`
- Convert TanStack Router to Next.js routing
- Update imports and paths

### Step 4: Deploy to Amplify
- Amplify automatically detects Next.js
- Supports SSR and API routes
- Full-stack deployment

## Recommendation

**Use Option 1** - it's faster and leverages your existing architecture.
Deploy frontend to Amplify, backend to App Runner or Lambda.
