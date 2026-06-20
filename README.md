# Revlab — Website

Ultra-premium dark site for Revlab (PPF · color wraps · detailing, Boca Raton). Liquid-glass UI, fully responsive for iPhone & Mac, with Stripe-powered booking deposits.

## Pages
- `index.html` — Home (one liquid scroll: hero, services, why, process, stats, contact)
- `services.html` — Full service breakdown + FAQ
- `book.html` — Multi-step booking wizard + calendar + Stripe checkout
- `about.html` — About / brand story

Shared: `css/site.css`, `js/site.js`. API: `api/checkout.js` (Stripe), `api/lead.js` (contact form).

## Run locally
The static pages open in any browser by double-clicking `index.html`. The booking checkout and contact email need the serverless API, so run with Vercel:

```bash
npm i -g vercel
cd therevlab-website
vercel dev
```

## Deploy (Vercel — same as your other sites)
1. Push this folder to a Git repo (or run `vercel` from inside it).
2. In Vercel → Project → Settings → Environment Variables, add:
   - `STRIPE_SECRET_KEY` — your Stripe secret key (required for booking)
   - `RESEND_API_KEY` — optional, to get an email on each contact-form lead
3. Point `therevlab.com` at the Vercel project.

## Add your real logo
The site currently renders "Revlab" in a script font (Sacramento) as the wordmark.
To use your exact logo:
1. Drop your file in `assets/` as `revlab-logo.png` (transparent PNG, white mark).
2. In `index.html`, replace the hero `<div class="hero-logo">Revlab</div>` with
   `<img src="assets/revlab-logo.png" alt="Revlab">`, and the nav `<a class="nav-logo">Revlab</a>`
   text with the `<img>` version (commented examples are in the file).

## Pricing
Service packages & deposit amounts live in two mirrored places — keep them in sync:
- Front-end display: `book.html` (the `SERVICES` object)
- Server-side charge: `api/checkout.js` (the `SERVICES` object)

Deposits are charged on booking and applied to the final total. Final quotes are confirmed after seeing the vehicle.
