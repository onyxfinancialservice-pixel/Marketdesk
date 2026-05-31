PBM hotfix - AI analysis + Education video upload

Upload these files to GitHub with the same paths:

- frontend/src/lib/api.js
- frontend/src/pages/Education.jsx
- netlify/functions/api.mjs
- netlify/functions/pbm.mjs
- supabase/schema.sql

Important:

- The frontend now calls /.netlify/functions/pbm directly, so stale /api redirects cannot keep serving the old function.
- Education video create/delete now goes through the function instead of direct Supabase insert. This avoids the Response body stream already read error.
- AI analysis no longer hard-requires SUPABASE_SERVICE_ROLE_KEY. It can use the public anon key plus the signed-in user token.

After upload:

1. Run the Supabase SQL hotfix:
   supabase_hotfix_ai_video_20260531/01_hotfix_ai_video.sql
2. In Netlify, redeploy with Clear cache and deploy site.
3. Open this URL after deploy to confirm the new function is live:
   https://marketdesk62.netlify.app/.netlify/functions/pbm/health

The health response must include:

version: pbm-hotfix-20260531
