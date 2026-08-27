# Thread & Tie — Personalized Raksha Bandhan Gift

A small web app: someone fills in a form about their sibling, and gets back a
unique link (`/rakhi/AB12cd`) that opens a personalized, scroll-through digital
gift — photos, a message, a memory, and a Rakhi-tying moment, just for them.

## Stack

Plain HTML/CSS/vanilla JS on the front end, Express on the back end, photos
saved to disk, and submissions stored in a single JSON file
(`data/store.json`) — no database, no login, no build step.

## Run it locally

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

- The landing page is the form.
- Submitting it creates a unique link like `http://localhost:3000/rakhi/AB12cd`.
- Opening that link shows the personalized experience for that submission only.

## Deploy to Vercel

This app uses Vercel Blob for production persistence. Create a Blob store in
the Vercel dashboard, then add its `BLOB_READ_WRITE_TOKEN` as an environment
variable for the project. Deploy the repository with the Vercel CLI or by
importing it into Vercel:

```bash
npx vercel
```

Do not rely on the local `data/store.json` or `uploads/` folder in production;
Vercel's filesystem is temporary. The app automatically uses local disk when
`BLOB_READ_WRITE_TOKEN` is absent and Vercel Blob when it is present.

## How it's structured

```
server.js              Express app: create + serve submissions
data/store.json         All submissions, keyed by their short id
uploads/<id>/            Photos for each submission
public/
  index.html             Landing page + creation form
  rakhi.html              The personalized experience (populated via fetch)
  css/base.css            Shared design tokens (color, type, buttons)
  css/landing.css         Landing page styles
  css/rakhi.css           Experience page styles + animations
  js/landing.js           Form handling, photo preview, share links
  js/rakhi.js             Fetches the submission, populates + animates it
```

## Notes for going further

- **Deploying**: any Node host works (Render, Railway, a small VPS). Point
  persistent disk storage at `uploads/` and `data/store.json`, or swap the
  JSON file for a real database later — the `readStore`/`writeStore`
  functions in `server.js` are the only place that would need to change.
- **Payments**: the form currently creates a link for free. To gate creation
  behind payment, add a checkout step before the `POST /api/create` call and
  verify payment server-side before writing the submission.
- **Optional fields**: nickname, memory, and the inside-joke line are all
  optional — the experience quietly removes those sections when they're
  empty rather than showing them blank.
- Photo uploads are capped at 6 files, 8MB each, images only.
