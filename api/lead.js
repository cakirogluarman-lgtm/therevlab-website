// /api/lead — receives contact-form submissions. Logs them, and (optionally)
// emails you via Resend if RESEND_API_KEY is set. Dependency-free (raw fetch).
//
// Optional env vars:
//   RESEND_API_KEY   — to receive an email on each submission
//   LEAD_TO          — where to send it (defaults to cakirogluarman@gmail.com)
//   LEAD_FROM        — verified Resend sender (defaults to onboarding@resend.dev)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    const lead = {
      name: b.name || '', email: b.email || '', service: b.service || '',
      vehicle: b.vehicle || '', message: b.message || '', at: new Date().toISOString()
    };
    console.log('REVLAB LEAD:', JSON.stringify(lead));

    if (process.env.RESEND_API_KEY) {
      const to = process.env.LEAD_TO || 'cakirogluarman@gmail.com';
      const from = process.env.LEAD_FROM || 'Revlab <onboarding@resend.dev>';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: [to], reply_to: lead.email || undefined,
          subject: 'New Revlab inquiry — ' + (lead.name || 'Website'),
          text: 'Name: ' + lead.name + '\nEmail: ' + lead.email + '\nService: ' + lead.service +
                '\nVehicle: ' + lead.vehicle + '\n\n' + lead.message
        })
      }).catch(function () {});
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true }); // never block the user
  }
}
