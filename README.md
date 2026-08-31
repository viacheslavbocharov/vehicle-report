# Vehicle Report

Minimal Cloudflare Pages + Pages Functions project.

## Files

- `index.html` — Ukrainian form
- `style.css` — responsive styling
- `script.js` — geolocation + form submit
- `functions/api/submit.js` — sends email through Resend

## Cloudflare environment variables

Set these in the Pages project:

- `RESEND_API_KEY` — your Resend API key
- `RECIPIENT_EMAIL` — the Gmail address that should receive test messages

Do not commit either value to GitHub.

## Route

`functions/api/submit.js` becomes:

`POST /api/submit`
