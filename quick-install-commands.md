# ⚡ Quick Installation Commands

## 🚀 **Run These Commands Locally**

### **1. Install Node.js** (if not installed)
- Download from: https://nodejs.org/
- Choose LTS version (20.x recommended)

### **2. Install Project Dependencies**
```bash
# Navigate to project directory
cd your-project-folder

# Install all dependencies
npm install

# If errors occur, try:
npm install --legacy-peer-deps
```

### **3. Create Environment File**
```bash
# Create .env.local file
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
DEFAULT_FUNIFIER_URL=https://service2.funifier.com
DEMO_MODE_ENABLED=true
ENCRYPTION_KEY=your-secure-32-character-encryption-key-here-replace-this" > .env.local
```

### **4. Build & Run**
```bash
# Type check
npm run type-check

# Build project
npm run build

# Start development server
npm run dev
```

### **5. Test Setup**
- Open: http://localhost:3000
- Should redirect to: http://localhost:3000/setup
- Try demo mode setup
- Then try Funifier authentication

## 🔧 **If Installation Fails**

### **Clear and Reinstall**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### **Windows Specific**
```bash
# If you get build tool errors
npm install --no-optional
npm install -g windows-build-tools
```

### **Alternative Package Managers**
```bash
# Using Yarn
yarn install
yarn dev

# Using pnpm
pnpm install
pnpm dev
```

## ✅ **Success Indicators**
- `npm install` completes without errors
- `npm run build` succeeds
- `npm run dev` starts server on port 3000
- Setup page loads at http://localhost:3000/setup

Run these commands in your local terminal!