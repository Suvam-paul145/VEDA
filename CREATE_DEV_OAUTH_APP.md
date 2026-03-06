# Quick Guide: Create Development OAuth App

## Step 1: Go to GitHub Developer Settings
Visit: https://github.com/settings/developers

## Step 2: Click "New OAuth App"

## Step 3: Fill in the Form
```
Application name: VEDA (Development)
Homepage URL: http://localhost:5174
Authorization callback URL: http://localhost:5174/auth/callback
Application description: Veda Learn - Local Development Environment
```

## Step 4: Click "Register application"

## Step 5: Copy the Credentials
After creating the app, you'll see:
- **Client ID**: Copy this (it will look like: Ov23li...)
- **Client secrets**: Click "Generate a new client secret" and copy it

## Step 6: Update Your Environment Files

I'll help you update the files once you have the new credentials.

## Why This Works Better
- No need to fight with GitHub's multi-URL interface
- Cleaner separation between dev and production
- Each environment has its own dedicated OAuth app
- Industry standard approach

Just create the new OAuth app and share the new Client ID with me, then I'll update all the necessary files for you!