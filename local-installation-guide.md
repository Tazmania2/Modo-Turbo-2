# 📦 Local Installation Guide

## 🎯 **Prerequisites**

### **1. Install Node.js**
Download and install Node.js from: https://nodejs.org/
- **Recommended**: LTS version (20.x or higher)
- **Includes**: npm package manager

### **2. Verify Installation**
```bash
node --version    # Should show v20.x.x or higher
npm --version     # Should show 10.x.x or higher
```

## 🚀 **Project Setup**

### **1. Install Dependencies**
```bash
# Install all project dependencies
npm install

# If you get permission errors on Windows, try:
npm install --no-optional

# If you get network issues, try:
npm install --registry https://registry.npmjs.org/
```

### **2. Install Missing Type Definitions** (if needed)
```bash
# Core React/Next.js types (should already be in package.json)
npm install --save-dev @types/react @types/react-dom @types/node

# Additional types that might be missing
npm install --save-dev typescript @types/compression
```

### **3. Environment Setup**
Create `.env.local` file in project root:
```env
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Funifier Configuration
DEFAULT_FUNIFIER_URL=https://service2.funifier.com
DEMO_MODE_ENABLED=true

# Security - Generate a secure 32-character key
ENCRYPTION_KEY=your-secure-32-character-encryption-key-here-replace-this

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=wlgp:

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_METRICS_ENDPOINT=/api/performance/metrics

# Cache Configuration
CACHE_DEFAULT_TTL=300
CACHE_MAX_SIZE=1000
ENABLE_CACHE_COMPRESSION=false

# White-Label Configuration
NEXT_PUBLIC_DEFAULT_COMPANY_NAME=Gamification Platform
NEXT_PUBLIC_DEFAULT_TAGLINE=Powered by Funifier
```

## 🔧 **Build & Development**

### **1. Type Check**
```bash
npm run type-check
```

### **2. Build Project**
```bash
npm run build
```

### **3. Start Development Server**
```bash
npm run dev
```

### **4. Run Tests**
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## 🐛 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. "Cannot find module" errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **2. TypeScript errors**
```bash
# Rebuild TypeScript
npm run type-check
npx tsc --noEmit
```

#### **3. Build failures**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

#### **4. Port already in use**
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use different port
npm run dev -- -p 3001
```

#### **5. Permission errors (Windows)**
```bash
# Run as administrator or use:
npm install --no-optional --no-fund
```

## 📋 **Package.json Scripts**

Your project includes these scripts:
```json
{
  "dev": "next dev --turbopack",
  "build": "next build --turbopack", 
  "start": "next start",
  "lint": "eslint",
  "test": "vitest --run",
  "type-check": "tsc --noEmit"
}
```

## ✅ **Verification Steps**

After installation, verify everything works:

1. **Dependencies installed**: `npm list` (should show no missing packages)
2. **TypeScript working**: `npm run type-check` (should pass)
3. **Build successful**: `npm run build` (should complete without errors)
4. **Dev server starts**: `npm run dev` (should start on http://localhost:3000)
5. **Setup page loads**: Navigate to http://localhost:3000/setup

## 🎯 **Expected Results**

After successful installation:
- ✅ **No build errors**
- ✅ **TypeScript compilation passes**
- ✅ **Development server starts**
- ✅ **Setup page accessible**
- ✅ **Authentication flow works**

## 📞 **If You Still Have Issues**

1. **Check Node.js version**: Must be 18+ for Next.js 15
2. **Clear caches**: Delete node_modules, .next, and reinstall
3. **Check network**: Some packages might need VPN or different registry
4. **Windows specific**: May need Visual Studio Build Tools for native modules

Run these commands in your local terminal where you have Node.js installed!