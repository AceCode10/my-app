# Environment Configuration for Python Parser

## Local Development (.env.local)
```env
PYTHON_PARSER_URL=http://localhost:5001
```

## Production (Vercel)
```env
# After deploying to Railway, update this to:
PYTHON_PARSER_URL=https://your-app-name.up.railway.app
```

## Testing Production Parser Locally

You can test the production parser locally by temporarily updating .env.local:

1. **Get your Railway URL** (after deployment)
2. **Temporarily update .env.local:**
   ```env
   PYTHON_PARSER_URL=https://your-app-name.up.railway.app
   ```
3. **Test PDF extraction locally**
4. **Revert to localhost when done**

## Deployment Checklist

- [ ] Deploy Python parser to Railway
- [ ] Test /health endpoint
- [ ] Update Vercel PYTHON_PARSER_URL
- [ ] Test PDF extraction in production
- [ ] Verify local development still works
