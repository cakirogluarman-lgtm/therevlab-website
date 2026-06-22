// /api/intent — creates a Stripe PaymentIntent for an on-site (embedded Elements)
// Revlab booking deposit. Same approach as themillionpotato.com: the page mounts
// Stripe Elements with the returned clientSecret and confirms payment in-page
// (Apple Pay / Google Pay / card) without leaving the site.
//
// Required env var: STRIPE_SECRET_KEY

const MOBILE_FEE = 150;
const CATALOG = {
  auto: { label: 'Automotive', services: {
    ppf: { label: 'Paint Protection Film', packages: {
      track: { name: 'Track / Partial Front', from: 1200, deposit: 200 },
      front: { name: 'Full Front',            from: 2400, deposit: 300 },
      body:  { name: 'Full Body',             from: 6000, deposit: 500 } } },
    wrap: { label: 'Color Change Wrap', packages: {
      accents: { name: 'Accents / Chrome Delete', from: 600,  deposit: 150 },
      full:    { name: 'Full Color Change',       from: 2500, deposit: 300 },
      premium: { name: 'Premium / Color Shift',   from: 3500, deposit: 400 } } },
    detail: { label: 'Detailing & Ceramic', packages: {
      signature:  { name: 'Signature Detail', from: 250, deposit: 75 },
      correction: { name: 'Paint Correction', from: 600, deposit: 150 },
      ceramic:    { name: 'Ceramic Coating',  from: 900, deposit: 200 } } }
  }},
  marine: { label: 'Marine', services: {
    detail: { label: 'Marine Detailing & Ceramic', packages: {
      wash:      { name: 'Signature Wash & Detail',    from: 300,  deposit: 100 },
      oxidation: { name: 'Oxidation Removal & Polish', from: 800,  deposit: 200 },
      ceramic:   { name: 'Marine Ceramic Coating',     from: 1200, deposit: 300 } } },
    ppf: { label: 'Protective Film', packages: {
      hull: { name: 'Hull & High-wear Film', from: 1500, deposit: 300 } } }
  }}
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    const cat = CATALOG[b.category];
    if (!cat) return res.status(400).json({ error: 'Invalid category' });
    const service = cat.services[b.service];
    if (!service) return res.status(400).json({ error: 'Invalid service' });
    const pkg = service.packages[b.pkg];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    const email = (b.email || '').trim();
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!b.date) return res.status(400).json({ error: 'Pick a date' });

    let mobile = b.mobile === true || b.place === 'mobile';
    // automotive PPF and color-change wraps are in-shop only
    if (mobile && b.category === 'auto' && (b.service === 'ppf' || b.service === 'wrap')) mobile = false;
    const location = mobile ? (b.location || '').trim() : '';
    if (mobile && !location) return res.status(400).json({ error: 'Location required for mobile service' });

    const deposit = pkg.deposit + (mobile ? MOBILE_FEE : 0);

    const desc = cat.label + ' — ' + service.label + ' (' + pkg.name + ')' +
      (mobile ? ' · Mobile +$' + MOBILE_FEE : ' · At Revlab') +
      ' · ' + b.date + (b.time ? ' ' + b.time : '');

    const params = new URLSearchParams();
    params.append('amount', String(deposit * 100));
    params.append('currency', 'usd');
    params.append('automatic_payment_methods[enabled]', 'true');
    params.append('receipt_email', email);
    params.append('description', 'Revlab booking deposit — ' + desc);
    const meta = {
      kind: 'booking', category: b.category, service: b.service, package: b.pkg,
      place: mobile ? 'mobile' : 'shop', location: location,
      date: b.date, time: b.time || '', vehicle: b.vehicle || '',
      name: (b.name || '').trim(), phone: b.phone || '', deposit: String(deposit)
    };
    Object.keys(meta).forEach(function (k) { params.append('metadata[' + k + ']', meta[k]); });

    const r = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const pi = await r.json();
    if (pi.error) return res.status(400).json({ error: pi.error.message });
    return res.status(200).json({ clientSecret: pi.client_secret, amount: deposit });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
