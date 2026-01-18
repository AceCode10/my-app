# Railway Deployment Troubleshooting

## Common Issues and Solutions

### Issue 1: Root Directory Wrong
**Problem:** Railway can't find your Flask app
**Solution:** Set "Root Directory" to `python-parser` (not root)

### Issue 2: Missing Dependencies
**Problem:** Build fails during `pip install`
**Solution:** Check requirements.txt has all dependencies

### Issue 3: Port Configuration
**Problem:** App doesn't start on correct port
**Solution:** Ensure PORT=5000 in environment variables

### Issue 4: Python Version
**Problem:** Railway uses wrong Python version
**Solution:** Add runtime.txt file

### Issue 5: Debug Mode in Production
**Problem:** debug=True causes issues
**Solution:** Use debug=False in production
