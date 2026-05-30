PBM update - Social channel + YouTube + AI daily limit + AI Teaching

Upload these files to the same paths in GitHub:

- frontend/src/App.js
- frontend/src/components/AIAnalysisPanel.jsx
- frontend/src/components/Layout.jsx
- frontend/src/context/AuthContext.jsx
- frontend/src/lib/api.js
- frontend/src/pages/AITeaching.jsx
- frontend/src/pages/AssetDetail.jsx
- frontend/src/pages/Education.jsx
- frontend/src/pages/Social.jsx
- frontend/src/pages/Settings.jsx
- netlify/functions/api.mjs
- supabase/schema.sql

Then run this SQL in Supabase:

- supabase_update_youtube_social_channel_20260530/01_youtube_social_channel.sql

Netlify environment variables for email notifications:

- SUPABASE_URL: your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: your Supabase service role key
- RESEND_API_KEY: Resend API key
- PBM_EMAIL_FROM: verified sender, for example PBM <updates@yourdomain.com>
- PBM_SITE_URL: your Netlify site URL, for example https://marketdesk62.netlify.app

If RESEND_API_KEY is missing, Social posts still work. Only email notifications are skipped.
If SUPABASE_SERVICE_ROLE_KEY is missing, AI daily limits and closed beta checks cannot run.
