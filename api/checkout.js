// /api/checkout — creates a Stripe Checkout Session for a Revlab booking deposit.
// Dependency-free (raw fetch to the Stripe API), same pattern as themillionpotato.com.
// Prices the deposit server-side from a catalog mirrored in /book.html.
//
// Required env var (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY

const MOBILE_FEE = 150; // added to the deposit when the customer chooses mobile service

const CATALOG = {
  auto: {
    label: 'Automotive',
    services: {
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
    }
  },
  marine: {
    label: 'Marine',
    services: {
      detail: { label: 'Marine Detailing & Ceramic', packages: {
        wash:      { name: 'Signature Wash & Detail',    from: 300,  deposit: 100 },
        oxidation: { name: 'Oxidation Removal & Polish', from: 800,  deposit: 200 },
        ceramic:   { name: 'Marine Ceramic Coating',     from: 1200, deposit: 300 } } },
      wrap: { label: 'Color Change Wrap', packages: {
        accents: { name: 'Accents & Striping',     from: 800,  deposit: 200 },
        full:    { name: 'Full Hull Wrap',         from: 4000, deposit: 500 },
        premium: { name: 'Premium / Custom Print', from: 6000, deposit: 700 } } },
      ppf: { label: 'Protective Film', packages: {
        hull: { name: 'Hull & High-wear Film', from: 1500, deposit: 300 } } }
    }
  }
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
    const name = (b.name || '').trim();
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!b.date) return res.status(400).json({ error: 'Pick a date' });

    let mobile = b.mobile === true || b.place === 'mobile';
    // automotive PPF and color-change wraps are in-shop only
    if (mobile && b.category === 'auto' && b.service === 'ppf') mobile = false;
    const location = mobile ? (b.location || '').trim() : '';
    if (mobile && !location) return res.status(400).json({ error: 'Location required for mobile service' });

    const deposit = pkg.deposit + (mobile ? MOBILE_FEE : 0);

    const desc = [
      cat.label + ' — ' + service.label + ' (' + pkg.name + ')',
      'Est. from $' + pkg.from.toLocaleString(),
      mobile ? ('Mobile service (+$' + MOBILE_FEE + ') at: ' + location) : 'At Revlab (drop-off)',
      'Date: ' + b.date + (b.time ? ' at ' + b.time : ''),
      b.vehicle ? 'Vehicle: ' + b.vehicle : null
    ].filter(Boolean).join(' · ');

    const origin = req.headers.origin || ('https://' + (req.headers.host || 'therevlab.com'));

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('customer_email', email);
    params.append('submit_type', 'book');
    params.append('success_url', origin + '/book.html?booked=1');
    params.append('cancel_url', origin + '/book.html?booked=0');
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(deposit * 100));
    params.append('line_items[0][price_data][product_data][name]', 'Revlab — ' + service.label + ' (' + pkg.name + ') booking deposit');
    params.append('line_items[0][price_data][product_data][description]', desc);
    const meta = {
      kind: 'booking', category: b.category, service: b.service, package: b.pkg,
      place: mobile ? 'mobile' : 'shop', location: location,
      date: b.date, time: b.time || '', vehicle: b.vehicle || '',
      name: name, phone: b.phone || ''
    };
    Object.keys(meta).forEach(function (k) {
      params.append('payment_intent_data[metadata][' + k + ']', meta[k]);
      params.append('metadata[' + k + ']', meta[k]);
    });

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const session = await r.json();
    if (session.error) return res.status(400).json({ error: session.error.message });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
