# Supabase Production Configuration Instructions

## 1. Update Authentication Settings

Go to your Supabase Dashboard → Authentication → Settings

### Update these fields:

**Site URL:**
```
https://igaprep.com
```

**Additional Redirect URLs (add these):**
```
https://igaprep.com/auth/callback
https://igaprep.com
http://localhost:3000/auth/callback  # Keep for local testing
```

**Email Templates (update URLs):**
- Confirmation URL: `https://igaprep.com/auth/confirm`
- Recovery URL: `https://igaprep.com/auth/reset-password`

## 2. Update Email Settings

**From Address:**
```
noreply@igaprep.com
```

**Reply-To:**
```
support@igaprep.com
```

## 3. Test Configuration

After updating:
1. Test local signup still works (should use localhost URLs)
2. After deployment, test production signup (should use igaprep.com URLs)
3. Verify email confirmations work correctly

## 4. Security Notes

- Keep localhost URLs for local development
- Add production URLs for live deployment
- Ensure HTTPS is used for all production URLs
