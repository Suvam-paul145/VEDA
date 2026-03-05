# Veda Learn VS Code Extension - Deployment Guide

## 🎯 Current Status: READY FOR DEPLOYMENT

### ✅ What's Complete:
- Extension source code implemented
- API endpoints updated with your deployed URLs
- Package.json configured with proper dependencies
- TypeScript compilation ready
- OAuth flow and WebSocket integration implemented

### 🚀 Deployment Steps

#### Step 1: Compile the Extension
```bash
cd veda-learn
npm run compile
```

#### Step 2: Test the Extension Locally
```bash
# Open VS Code in the extension directory
code .

# Press F5 to launch Extension Development Host
# This opens a new VS Code window with your extension loaded
```

#### Step 3: Verify Extension Features
In the Extension Development Host window:

1. **Check Sidebar**: Look for "Veda Learn" in the Activity Bar (left side)
2. **Test Login**: Click "Sign in with GitHub" button
3. **Verify OAuth**: Should redirect to GitHub and back to VS Code
4. **Check Status**: Look for "Veda watching..." in status bar
5. **Test WebSocket**: Should connect automatically after login

#### Step 4: Package for Distribution (Optional)
```bash
# Install vsce (VS Code Extension CLI)
npm install -g vsce

# Package the extension
vsce package

# This creates a .vsix file you can install manually
```

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Sidebar appears in Activity Bar
- [ ] Login button works
- [ ] GitHub OAuth completes successfully
- [ ] WebSocket connection establishes
- [ ] Status bar shows "Veda watching..."

### Integration Testing
- [ ] Code analysis triggers on file save
- [ ] Lessons appear in sidebar
- [ ] Real-time updates work via WebSocket
- [ ] Authentication persists across VS Code restarts

### Error Handling
- [ ] Graceful handling of network errors
- [ ] WebSocket reconnection works
- [ ] Invalid token handling
- [ ] API endpoint failures

## 🔧 Configuration

### API Endpoints (Already Updated)
- **REST API**: `https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev`
- **WebSocket**: `wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev`

### Extension Features
1. **GitHub OAuth Integration**
   - Redirects to GitHub for authentication
   - Stores JWT token securely in VS Code secrets
   - Handles OAuth callback via URI handler

2. **Real-time Code Monitoring**
   - WebSocket connection for live updates
   - Automatic reconnection on disconnect
   - Status bar indicator

3. **Sidebar Interface**
   - Login/logout functionality
   - Lesson display area
   - Clean, VS Code-themed UI

## 🐛 Troubleshooting

### Common Issues

#### Extension Won't Load
- Check VS Code Developer Console (Help > Toggle Developer Tools)
- Verify TypeScript compilation succeeded
- Check for syntax errors in extension.ts

#### OAuth Not Working
- Verify GitHub OAuth app configuration
- Check redirect URI matches extension URI handler
- Ensure API endpoints are correct

#### WebSocket Connection Fails
- Check WebSocket URL is correct
- Verify JWT token is valid
- Check network connectivity
- Monitor CloudWatch logs for WebSocket Lambda

#### No Code Analysis
- Ensure file save triggers are working
- Check if authentication is successful
- Verify API endpoints are responding
- Monitor extension console logs

### Debug Commands
```bash
# View extension logs
# Open VS Code Developer Tools and check Console

# Test API endpoints manually
curl -X GET "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback"

# Test WebSocket connection
wscat -c "wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev"
```

## 📦 Installation Methods

### Method 1: Development Mode (Recommended for Testing)
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select the generated .vsix file

### Method 2: Development Host (For Development)
1. Open extension folder in VS Code
2. Press F5 to launch Extension Development Host
3. Test in the new VS Code window

### Method 3: Manual Installation
1. Copy extension folder to VS Code extensions directory:
   - Windows: `%USERPROFILE%\.vscode\extensions\`
   - macOS: `~/.vscode/extensions/`
   - Linux: `~/.vscode/extensions/`

## 🎯 Next Steps After Deployment

1. **Test Full Workflow**
   - Install extension
   - Sign in with GitHub
   - Open a JavaScript/Python file
   - Make some coding mistakes
   - Verify lessons appear

2. **Monitor Performance**
   - Check extension startup time
   - Monitor memory usage
   - Verify WebSocket stability

3. **Gather Feedback**
   - Test with different file types
   - Try various coding scenarios
   - Check error handling

4. **Iterate and Improve**
   - Add more programming languages
   - Enhance UI/UX
   - Add configuration options

## 🔗 Related Files
- `package.json` - Extension manifest and dependencies
- `src/extension.ts` - Main extension logic
- `out/extension.js` - Compiled JavaScript output
- `tsconfig.json` - TypeScript configuration

Your Veda Learn extension is ready for deployment and testing!