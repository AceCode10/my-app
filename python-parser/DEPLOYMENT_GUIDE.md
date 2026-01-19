# Python PDF Parser Deployment Guide

## Option 1: Railway (Recommended - Free Tier Available)

### 1. Prepare for Deployment

Your Python parser is already well-structured with:
- ✅ Flask app with health check
- ✅ Proper requirements.txt
- ✅ CORS enabled
- ✅ Error handling

### 2. Deploy to Railway

1. **Go to [railway.app](https://railway.app)**
2. **Sign up/login with GitHub**
3. **Click "New Project" → "Deploy from GitHub repo"**
4. **Select your repository**
5. **Configure:**
   - **Root directory:** `![alt text](image.png)`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `python app.py`
   - **Port:** Railway auto-detects (your app uses default 5000)

### 3. Environment Variables (Railway)

Add these in Railway project settings:
```
FLASK_ENV=production
PORT=5000
```

### 4. Get Production URL

After deployment, Railway will give you a URL like:
```
https://your-app-name.up.railway.app
```

## Option 2: Heroku (Alternative)

### 1. Create Procfile
Create `python-parser/Procfile`:
```
web: python app.py
```

### 2. Deploy Commands
```bash
cd python-parser
heroku create your-app-name
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

## Option 3: PythonAnywhere (Free Alternative)

1. **Sign up at [pythonanywhere.com](https://pythonanywhere.com)**
2. **Upload python-parser folder**
3. **Install requirements via web interface**
4. **Configure web app to run app.py**

## Next Steps After Deployment

1. **Test your deployed service:**
   ```bash
   curl https://your-url.up.railway.app/health
   ```

2. **Update Vercel environment variable:**
   ```
   PYTHON_PARSER_URL=https://your-url.up.railway.app
   ```

3. **Test PDF extraction in production**

## Recommended: Railway

Railway is recommended because:
- ✅ Free tier available
- ✅ Easy GitHub integration
- ✅ Automatic HTTPS
- ✅ Simple deployment
- ✅ Good for Flask apps
