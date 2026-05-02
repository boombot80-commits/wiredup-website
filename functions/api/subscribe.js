import { rateLimit } from './rate-limit.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // Rate limit: 5 per hour per IP
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, remaining } = rateLimit(ip);
  if (!allowed) {
    return json({ error: 'Too many requests. Please try again later.' }, 429, { 'Retry-After': '3600' });
  }

  try {
    const { email } = await request.json();

    if (!email || !email.includes('@') || !email.includes('.')) {
      return json({ error: 'Invalid email address.' }, 400);
    }

    // Validate email format more strictly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email address.' }, 400);
    }

    const normalised = email.toLowerCase().trim();

    // Store in D1 (if bound)
    if (env.DB) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)'
      ).bind(normalised, new Date().toISOString()).run();
    }

    // Send emails via Resend (welcome to subscriber + notification to admin)
    if (env.RESEND_API_KEY) {
      // Combine both emails into one call: subscriber gets welcome, admin gets notification via bcc
      const [welcomeRes] = await Promise.all([
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'WiredUp Digital <hello@wiredupdigital.com>',
            to: normalised,
            subject: "You're on the list — WiredUp Digital ⚡",
            html: `
              <div style="font-family:system-ui,sans-serif;background:#080c14;color:#fff;padding:40px;max-width:520px;margin:0 auto;border-radius:16px;">
                <img src="https://wiredupdigital.com/wiredup-logo.jpg" alt="WiredUp Digital" width="64" style="border-radius:12px;background:#fff;padding:8px;margin-bottom:24px;" />
                <h1 style="font-size:24px;font-weight:800;margin:0 0 8px;">You're on the list.</h1>
                <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Thanks for signing up. We'll send you one email when WiredUp Digital launches — no spam, no drip sequences.
                </p>
                <p style="color:#64748b;font-size:13px;">
                  — The WiredUp Digital team<br/>
                  Sunshine Coast, QLD, Australia
                </p>
              </div>
            `,
          }),
        }),
        // Admin notification (separate email)
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'WiredUp Digital <hello@wiredupdigital.com>',
            to: 'wiredupnotify@gmail.com',
            subject: `⚡ New subscriber: ${normalised}`,
            html: `<p style="font-family:system-ui,sans-serif;font-size:15px;"><strong>${normalised}</strong> just signed up on wiredupdigital.com.</p>`,
          }),
        }),
      ]);
    }

    return json({ success: true }, 200, { 'X-RateLimit-Remaining': String(remaining) });
  } catch (err) {
    console.error('Subscribe error:', err);
    return json({ error: 'Server error. Please try again.' }, 500);
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extraHeaders },
  });
}