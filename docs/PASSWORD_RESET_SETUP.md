# Password Reset Email Setup

## Issue
Password reset emails are going to spam because they're sent via Supabase's default email service.

## Solution
Use custom password reset email via Resend (same as email verification).

## Configuration Steps

### 1. Deploy the Function

```bash
supabase functions deploy send-password-reset
```

### 2. Configure Function as Public (Disable JWT Verification)

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** > **send-password-reset**
3. Go to **Settings**
4. Find **Verify JWT** setting
5. **Disable** it (set to `false`)
6. Save changes

**Option B: Via config.toml (if using Supabase CLI)**
The `supabase/config.toml` file already has:
```toml
[functions.send-password-reset]
verify_jwt = false
```

After making changes, redeploy:
```bash
supabase functions deploy send-password-reset
```

### 3. Set Environment Variables

In Supabase Dashboard > Edge Functions > send-password-reset > Settings > Secrets:

```
RESEND_API_KEY=re_your_resend_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_BASE_URL=https://peacefulinvestment.com (optional)
```

### 4. Verify Configuration

After deployment and configuration:
1. Test password reset from your app
2. Check Edge Function logs for success
3. Verify email arrives in inbox (not spam)

## Troubleshooting

### Error: "Invalid JWT" or 401 Unauthorized

**Cause**: Function still has JWT verification enabled

**Solution**:
1. Go to Supabase Dashboard
2. Edge Functions > send-password-reset > Settings
3. Disable "Verify JWT"
4. Save and redeploy

### Error: Function not found (404)

**Cause**: Function not deployed

**Solution**: Deploy using `supabase functions deploy send-password-reset`

### Email still going to spam

**Cause**: Domain not verified in Resend

**Solution**:
1. Go to Resend Dashboard > Domains
2. Verify `peacefulinvestment.com` is verified
3. Check SPF, DKIM, DMARC records are set up

## Expected Behavior

- Password reset requests work without user authentication
- Emails sent via Resend (not Supabase/Amazon SES)
- Emails arrive in inbox (not spam)
- Professional email design
- Proper spam-prevention headers

