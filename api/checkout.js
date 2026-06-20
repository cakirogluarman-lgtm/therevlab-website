// /api/checkout — creates a Stripe Checkout Session for a Revlab booking deposit.
// Same dependency-free pattern as themillionpotato.com: we POST directly to the
// Stripe API with fetch (no npm package), price the deposit server-side, attach
// the booking as metadata, and return the hosted checkout URL.
//
// Required env var (set in Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY

const SERVICES = {
  ppf: {
    label: 'Paint Protection Film',
    packages: {
      track: { name: 'Track / Partial Front', from: 1200, deposit: 200 },
      front: { name: 'Full Front',            from: 2400, deposit: 300 },
      body:  { name: 'Full Body',             from: 6000, deposit: 500 }
    }
  },
  wrap: {
    label: 'Color Change Wrap',
    packages: {
      accents: { name: 'Accents / Chrome Delete', from: 600,  deposit: 150 },
      full:    { name: 'Full Color Change',       from: 2500, deposit: 300 },
      premium: { name: 'Premium / Color Shift',   from: 3500, deposit: 400 }
    }
  },
  detail: {
    label: 'Detailing & Ceramic',
    packages: {
      signature:  { name: 'Signature Detail', from: 250, deposit: 75 },
      correction: { name: 'Paint Correction', from: 600, deposit: 150 },
      ceramic:    { name: 'Ceramic Coating',  from: 900, deposit: 200 }
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const body = req.body || {};
    const service = SERVICES[body.service];
    if (!service) return res.status(400).json({ error: 'Invalid service' });
    const pkg = service.packages[body.pkg];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    const email = (body.email || '').trim();
    const name = (body.name || '').trim();
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!body.date) return res.status(400).json({ error: 'Pick a date' });

    const desc = [
      service.label + ' — ' + pkg.name,
      'Est. from $' + pkg.from.toLocaleString(),
      'Drop-off: ' + body.date + (body.time ? ' at ' + body.time : ''),
      body.vehicle ? 'Vehicle: ' + body.vehicle : null
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
    params.append('line_items[0][price_data][unit_amount]', String(pkg.deposit * 100));
    params.append('line_items[0][price_data][product_data][name]', 'Revlab — ' + pkg.name + ' (booking deposit)');
    params.append('line_items[0][price_data][product_data][description]', desc);
    // booking details for your records
    params.append('payment_intent_data[metadata][kind]', 'booking');
    params.append('payment_intent_data[metadata][service]', body.service);
    params.append('payment_intent_data[metadata][package]', body.pkg);
    params.append('payment_intent_data[metadata][date]', body.date);
    params.append('payment_intent_data[metadata][time]', body.time || '');
    params.append('payment_intent_data[metadata][vehicle]', body.vehicle || '');
    params.append('payment_intent_data[metadata][name]', name);
    params.append('payment_intent_data[metadata][phone]', body.phone || '');
    params.append('metadata[service]', body.service);
    params.append('metadata[package]', body.pkg);
    params.append('metadata[date]', body.date);
    params.append('metadata[vehicle]', body.vehicle || '');
    params.append('metadata[name]', name);

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const session = await r.json();
    if (session.error) {
      return res.status(400).json({ error: session.error.message });
    }
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
