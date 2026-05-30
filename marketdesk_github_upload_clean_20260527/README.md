PBM update - YouTube + Social channel + email notifications

Upload these files to the same paths in GitHub:

- frontend/src/pages/Education.jsx
- frontend/src/pages/Social.jsx
- frontend/src/lib/api.js
- netlify/functions/api.mjs
- supabase/schema.sql

Then run this SQL in Supabase:

- supabase_update_youtube_social_channel_20260530/01_youtube_social_channel.sql

Netlify environment variables for email notifications:

- RESEND_API_KEY: Resend API key
- PBM_EMAIL_FROM: verified sender, for example PBM <updates@yourdomain.com>
- PBM_SITE_URL: your Netlify site URL, for example https://marketdesk62.netlify.app

If RESEND_API_KEY is missing, Social posts still work. Only email notifications are skipped.
