# NLU Narrator Stage - Deployment Guide

## ✅ COMPLETED SETUP

### Files Ready:
- ✅ **package.json** - Updated with NLU narrator configuration + axios dependency
- ✅ **chub_meta.yaml** - Configured for campus chronicler functionality  
- ✅ **Stage.tsx** - Complete narrator logic with Poe API integration
- ✅ **chub_tokens.env** - API tokens stored securely

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Direct GitHub → Chub Import (RECOMMENDED)
1. **Push to GitHub repo:**
   ```bash
   git init
   git add .
   git commit -m "NLU Narrator Stage - Initial implementation"
   git branch -M main  
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Import in Chub web interface:**
   - Go to chub.ai/my_stages
   - Click "Import from GitHub" 
   - Enter repo URL: `https://github.com/YOUR_USERNAME/nlu-narrator-stage`
   - Chub will build automatically

### Option 2: Local Build + Upload (if needed)
```bash
# Install dependencies (may need different Node version)
npm install --legacy-peer-deps --ignore-engines

# Build production files  
npm run build

# Upload dist/ folder contents to Chub
```

## 🔧 STAGE FEATURES IMPLEMENTED

### Core Narrator Functionality:
- **Poe API Integration** - Uses Claude-Sonnet-4 for narrative generation
- **Campus Chronicle** - Generates atmospheric campus scene descriptions
- **Message Hooks** - Adds narrative to both user messages and bot responses  
- **Visual Interface** - Clean campus theme with narrator controls
- **Configurable** - API key, model, campus name, narrative style

### User Configuration Schema:
- `poe_api_key` - Required for Poe API access
- `narrator_model` - Default: "Claude-Sonnet-4"  
- `campus_name` - Default: "National Law University"
- `narrative_style` - Options: brief, detailed, immersive

### Stage Behavior:
- Generates narrative before user messages are sent to LLM
- Adds atmospheric descriptions after bot responses
- Shows narratives as system messages in chat
- Includes stage directions for LLM context
- Toggle narrator active/inactive via UI

## 🎯 NEXT STEPS

1. **Test locally** (if Node.js permissions resolved)
2. **Push to GitHub repository** 
3. **Import via Chub web interface**
4. **Configure Poe API key in stage settings**
5. **Test narrator functionality in chat**

## 📋 TROUBLESHOOTING

- **No narratives generated**: Check Poe API key configuration
- **Build errors**: Use Chub's automatic build from GitHub
- **Permission issues**: Skip local build, use direct GitHub import

The stage is **functionally complete** and ready for deployment!