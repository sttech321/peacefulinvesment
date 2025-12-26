# Resend Email Troubleshooting Guide

## Problem: Not Receiving Verification Emails

If you're not receiving verification emails after signup, follow these steps:

## ✅ Step 1: Verify Supabase Settings

**CRITICAL**: Supabase email confirmation must be **DISABLED** in Supabase dashboard:

1. Go to Supabase Dashboard
2. Navigate to: **Authentication** > **Settings** > **Email Auth**
3. **Disable** "Enable email confirmations"
4. Save changes

**Why**: If this is enabled, Supabase will try to send emails via Amazon SES, which will show "via amazonses.com" and go to spam.

## ✅ Step 2: Verify Edge Function is Deployed

The Edge Function `send-email-verification` must be deployed to Supabase:

```bash
# Deploy the Edge Function
supabase functions deploy send-email-verification
```

Or deploy via Supabase Dashboard:
1. Go to **Edge Functions** in Supabase Dashboard
2. Verify `send-email-verification` exists
3. If not, deploy it

## ✅ Step 3: Verify Environment Variables

The Edge Function needs these environment variables set in Supabase:

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions** > **send-email-verification** > **Settings** > **Secrets**
3. Add these secrets:

```
RESEND_API_KEY=re_your_resend_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_BASE_URL=https://peacefulinvestment.com (optional)
```

**How to get these:**
- `RESEND_API_KEY`: From Resend dashboard (API Keys section)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: From Supabase Dashboard > Settings > API > service_role key

## ✅ Step 4: Check Browser Console

After signup, check the browser console (F12) for:

1. **Success messages:**
   ```
   Sending verification email via Resend...
   Resend Edge Function response status: 200
   Resend Edge Function result: { success: true, ... }
   ```

2. **Error messages:**
   - If you see errors, note them down
   - Common errors:
     - `VITE_SUPABASE_URL is not configured` - Check .env file
     - `401 Unauthorized` - Check VITE_SUPABASE_ANON_KEY
     - `404 Not Found` - Edge Function not deployed
     - `500 Internal Server Error` - Check Edge Function logs

## ✅ Step 5: Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions** > **send-email-verification** > **Logs**
3. Look for:
   - Success messages
   - Error messages
   - Resend API responses

**Common errors in logs:**
- `RESEND_API_KEY is not set` - Add RESEND_API_KEY secret
- `Failed to generate verification link` - Check SUPABASE_SERVICE_ROLE_KEY
- `Resend error: ...` - Check Resend API key and domain verification

## ✅ Step 6: Verify Resend Configuration

1. **Domain Verification:**
   - Go to Resend Dashboard > Domains
   - Verify `peacefulinvestment.com` is verified
   - Check SPF, DKIM records are verified (green checkmarks)

2. **API Key:**
   - Go to Resend Dashboard > API Keys
   - Verify API key is active
   - Make sure it matches the one in Supabase secrets

3. **Test Email:**
   - Try sending a test email from Resend dashboard
   - Verify it arrives in inbox (not spam)

## ✅ Step 7: Test Edge Function Directly

You can test the Edge Function directly using curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-email-verification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "fullName": "Test User",
    "redirectTo": "https://peacefulinvestment.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "messageId": "resend_message_id"
}
```

## 🔍 Debugging Checklist

- [ ] Supabase email confirmation is **DISABLED**
- [ ] Edge Function `send-email-verification` is deployed
- [ ] Environment variables are set in Supabase secrets:
  - [ ] `RESEND_API_KEY`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Resend domain is verified
- [ ] Resend API key is valid
- [ ] Browser console shows success messages
- [ ] Edge Function logs show success
- [ ] Test email from Resend dashboard works

## 🚨 Common Issues & Solutions

### Issue 1: "via amazonses.com" in email
**Cause**: Supabase email confirmation is still enabled  
**Solution**: Disable in Supabase Dashboard > Authentication > Settings > Email Auth

### Issue 2: 404 Not Found
**Cause**: Edge Function not deployed  
**Solution**: Deploy the function using `supabase functions deploy send-email-verification`

### Issue 3: 401 Unauthorized
**Cause**: Wrong or missing API key  
**Solution**: Check `VITE_SUPABASE_ANON_KEY` in .env file

### Issue 4: 500 Internal Server Error
**Cause**: Missing environment variables in Edge Function  
**Solution**: Add secrets in Supabase Dashboard > Edge Functions > Settings > Secrets

### Issue 5: Email not sending
**Cause**: Resend API key invalid or domain not verified  
**Solution**: 
1. Check Resend API key in Supabase secrets
2. Verify domain in Resend dashboard
3. Check Resend dashboard for error messages

### Issue 6: Email goes to spam
**Cause**: Missing DMARC record  
**Solution**: Add DMARC record to DNS (see SPAM_PREVENTION_CHECKLIST.md)

## 📝 Verification Steps

After fixing issues:

1. **Sign up with a test email**
2. **Check browser console** - should see success messages
3. **Check Edge Function logs** - should see email sent
4. **Check email inbox** - email should arrive
5. **Check spam folder** - if there, add DMARC record

## 🎯 Expected Flow

1. User signs up → `signUp()` called
2. Supabase creates user (no email sent - confirmation disabled)
3. `handleResendConfirmation()` called
4. Edge Function `send-email-verification` called
5. Edge Function generates verification link via Supabase Admin API
6. Edge Function sends email via Resend
7. Email arrives in user's inbox (from Resend, not Amazon SES)

## 📞 Still Not Working?

If emails still aren't sending:

1. Check all items in the debugging checklist
2. Review Edge Function logs for specific errors
3. Test Edge Function directly with curl
4. Verify Resend dashboard shows sent emails
5. Check Resend dashboard for delivery status

---

**Remember**: The email should come from "Peaceful Investment Security <security@peacefulinvestment.com>" via Resend, NOT from Supabase/Amazon SES.

