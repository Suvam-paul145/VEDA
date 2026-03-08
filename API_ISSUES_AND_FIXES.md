# 🔧 API Issues Diagnosis & Fixes

## 🚨 CRITICAL ISSUES IDENTIFIED

### **Issue 1: All Lambda Handlers Are Stubs**
**Problem**: Your Lambda functions are deployed but only return `{ok: true}` - they don't actually process requests.

**Evidence from your handlers:**
```javascript
// analyze.js, lesson.js, quiz.js, progress.js - ALL are stubs
module.exports.handler = async () => ({
    statusCode: 200,
    body: JSON.stringify({ ok: true })
});
```

**Impact**: 
- ❌ Analysis doesn't detect bugs
- ❌ Lessons aren't generated
- ❌ Quizzes aren't created
- ❌ Progress isn't tracked

---

### **Issue 2: CORS Configuration Missing Credentials**
**Problem**: CORS headers don't include all required headers for authenticated requests.

**Current CORS**:
```yaml
cors: true  # Too simple - doesn't handle Authorization header properly
```

**What you need**:
```yaml
cors:
  origin: '*'
  headers:
    - Content-Type
    - Authorization
    - X-Amz-Date
    - X-Api-Key
  allowCredentials: false
```

---

### **Issue 3: GitHub Token Management**
**Your Questions Answered:**

#### **Q: Can I use GitHub OAuth token instead of Personal Access Token?**
**A: YES!** Here's how:

**Current OAuth Scopes** (from your LoginPage):
```javascript
scope=user:email,repo
```

**What each scope gives you:**
- `user:email` - Read user email (for profile)
- `repo` - **Full access to public AND private repositories**

**With `repo` scope, you can:**
- ✅ List all repositories (public + private)
- ✅ Read file contents
- ✅ Read directory structures
- ✅ Access commit history
- ✅ Read issues, PRs, etc.

**You DON'T need a Personal Access Token if:**
- You're using GitHub OAuth with `repo` scope
- You store the GitHub access token in your JWT payload
- You extract it when making GitHub API calls

---

## 🔑 GitHub Token Architecture

### **Current Flow (BROKEN)**:
```
1. User logs in via GitHub OAuth
2. Backend gets GitHub access_token
3. Backend creates JWT with {userId, username}  ❌ MISSING TOKEN
4. Frontend tries to use GitHub API  ❌ NO TOKEN AVAILABLE
```

### **Fixed Flow (CORRECT)**:
```
1. User logs in via GitHub OAuth
2. Backend gets GitHub access_token
3. Backend creates JWT with {userId, username, githubToken}  ✅ INCLUDES TOKEN
4. Frontend extracts githubToken from JWT
5. Frontend uses githubToken for GitHub API calls  ✅ WORKS
```

---

## 🛠️ FIXES REQUIRED

### **Fix 1: Update Auth Handler to Include GitHub Token**

**File**: `veda-learn-api/handlers/auth.js`

**Current code** (line 50-55):
```javascript
const token = jwt.sign(
    { userId, username: ghUser.login },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
);
```

**Fixed code**:
```javascript
const token = jwt.sign(
    { 
        userId, 
        username: ghUser.login,
        githubToken: access_token,  // ✅ ADD THIS
        avatar: ghUser.avatar_url,
        email: ghUser.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
);
```

---

### **Fix 2: Update Frontend to Extract GitHub Token**

**File**: `veda-learn-web/src/components/auth/AuthCallback.jsx`

**Current code**:
```javascript
const payload = JSON.parse(atob(token.split('.')[1]))
setAuth(token, {
    id:     payload.userId,
    login:  payload.username,
    name:   payload.username,
    avatar: `https://github.com/${payload.username}.png`,
})
```

**Fixed code**:
```javascript
const payload = JSON.parse(atob(token.split('.')[1]))
setAuth(token, {
    id:          payload.userId,
    login:       payload.username,
    name:        payload.username,
    avatar:      payload.avatar || `https://github.com/${payload.username}.png`,
    githubToken: payload.githubToken,  // ✅ ADD THIS
    email:       payload.email
})
```

---

### **Fix 3: Update Zustand Store to Store GitHub Token**

**File**: `veda-learn-web/src/store/useVedaStore.js`

**Add to user object**:
```javascript
setAuth: (jwt, user) => {
    localStorage.setItem('veda_jwt', jwt)
    localStorage.setItem('veda_user', JSON.stringify(user))
    localStorage.setItem('github_token', user.githubToken)  // ✅ ADD THIS
    set({ jwt, user })
},
```

---

### **Fix 4: Create GitHub API Client**

**File**: `veda-learn-web/src/lib/github.js`

```javascript
import { Octokit } from '@octokit/rest'
import useVedaStore from '../store/useVedaStore.js'

let octokit = null

export function initGitHub() {
  const user = useVedaStore.getState().user
  if (!user?.githubToken) {
    throw new Error('No GitHub token available. Please log in again.')
  }
  octokit = new Octokit({ auth: user.githubToken })
  return octokit
}

export const github = {
  // List user's repos
  async getRepos() {
    if (!octokit) initGitHub()
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
      visibility: 'all'  // public + private
    })
    return data
  },

  // Get file content
  async getFileContent(owner, repo, path) {
    if (!octokit) initGitHub()
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    
    if (data.type === 'file' && data.encoding === 'base64') {
      return {
        content: atob(data.content.replace(/\n/g, '')),
        name: data.name,
        path: data.path,
        sha: data.sha
      }
    }
    return data
  },

  // List directory contents
  async getContents(owner, repo, path = '') {
    if (!octokit) initGitHub()
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    return Array.isArray(data) ? data : [data]
  },
}

export default github
```

---

### **Fix 5: Implement Proper Analyze Handler**

**File**: `veda-learn-api/handlers/analyze.js`

```javascript
const jwt = require('jsonwebtoken');

module.exports.handler = async (event) => {
    try {
        // 1. Verify JWT
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: JSON.stringify({ error: 'No authorization header' })
            };
        }

        const token = authHeader.replace('Bearer ', '');
        let userId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (err) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: JSON.stringify({ error: 'Invalid token' })
            };
        }

        // 2. Parse request body
        const body = JSON.parse(event.body || '{}');
        const { fileContent, language, fileName, cursorLine } = body;

        console.log('Analyzing code:', { userId, fileName, language, lines: fileContent?.split('\n').length });

        // 3. Simple pattern detection (replace with OpenRouter call later)
        const patterns = {
            'mutable-default': /def\s+\w+\([^)]*=\s*\[\s*\]/,
            'callback-hell': /function\s*\([^)]*\)\s*{\s*[^}]*function\s*\([^)]*\)\s*{/,
            'any-type': /:\s*any\b/g,
        };

        let detected = null;
        let lineNumber = 1;

        for (const [conceptId, pattern] of Object.entries(patterns)) {
            if (pattern.test(fileContent)) {
                detected = conceptId;
                // Find line number
                const lines = fileContent.split('\n');
                lineNumber = lines.findIndex(line => pattern.test(line)) + 1;
                break;
            }
        }

        if (detected) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teach: true,
                    conceptId: detected,
                    lineNumber,
                    confidence: 0.92,
                    message: `Detected ${detected.replace(/-/g, ' ')} pattern`
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teach: false,
                message: 'No issues detected'
            })
        };

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

---

### **Fix 6: Update Serverless CORS Configuration**

**File**: `veda-learn-api/serverless.yml`

Replace all `cors: true` with:

```yaml
cors:
  origin: '*'
  headers:
    - Content-Type
    - Authorization
    - X-Amz-Date
    - X-Api-Key
    - X-Amz-Security-Token
  allowCredentials: false
```

**Example for analyze function**:
```yaml
analyze:
  handler: handlers/analyze.handler
  timeout: 29
  events:
    - http:
        path: api/analyze
        method: post
        cors:
          origin: '*'
          headers:
            - Content-Type
            - Authorization
          allowCredentials: false
```

---

## 📋 DEPLOYMENT CHECKLIST

### **Step 1: Update Backend**
```bash
cd veda-learn-api

# Update auth.js to include githubToken in JWT
# Update analyze.js with proper implementation
# Update serverless.yml CORS configuration

npx serverless deploy
```

### **Step 2: Update Frontend**
```bash
cd veda-learn-web

# Update AuthCallback.jsx to extract githubToken
# Update useVedaStore.js to store githubToken
# Create github.js API client

npm install @octokit/rest @octokit/auth-token
```

### **Step 3: Test**
1. Clear browser localStorage: `localStorage.clear()`
2. Login again via GitHub OAuth
3. Check JWT payload includes githubToken:
   ```javascript
   const jwt = localStorage.getItem('veda_jwt')
   const payload = JSON.parse(atob(jwt.split('.')[1]))
   console.log(payload)  // Should have githubToken
   ```
4. Test GitHub API:
   ```javascript
   import github from './lib/github'
   const repos = await github.getRepos()
   console.log(repos)  // Should show your repos
   ```
5. Test analyze:
   - Type Python code with mutable default
   - Click Analyze
   - Should see detection in response

---

## 🎯 SUMMARY

### **Root Causes:**
1. ❌ Lambda handlers are stubs (not implemented)
2. ❌ GitHub token not passed through JWT
3. ❌ CORS configuration too simple
4. ❌ No error handling in API calls

### **Solutions:**
1. ✅ Implement proper analyze handler with pattern detection
2. ✅ Include githubToken in JWT payload
3. ✅ Extract and store githubToken in frontend
4. ✅ Use githubToken for GitHub API calls (no PAT needed!)
5. ✅ Fix CORS configuration in serverless.yml

### **GitHub OAuth vs Personal Access Token:**
- **OAuth Token** (from login): ✅ Use this! It's already available
- **Personal Access Token**: ❌ Not needed if OAuth has `repo` scope
- **Your OAuth scope `repo`**: ✅ Gives full repository access

---

**Next Steps**: Apply fixes in order (auth.js → AuthCallback.jsx → analyze.js → deploy → test)