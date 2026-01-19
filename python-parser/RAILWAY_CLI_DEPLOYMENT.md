# Railway CLI Deployment Guide

## Option 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

## Option 2: Login to Railway
```bash
railway login
```

## Option 3: Deploy Python Parser
```bash
cd python-parser
railway up
```

## Option 4: Configure Service
```bash
railway variables set FLASK_ENV=production
railway variables set PORT=5000
railway variables set PYTHONUNBUFFERED=1
```

## Option 5: Get Service URL
```bash
railway domain
```

This bypasses the UI issues and deploys directly from your command line.
