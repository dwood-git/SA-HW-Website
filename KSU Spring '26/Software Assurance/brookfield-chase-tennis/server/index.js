const path = require('path');
const express = require('express');
// Ensure `.env` values override any existing environment variables for local testing,
// and explicitly load the project-root `.env` (in case the server is started elsewhere).
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '..', '.env');
const dotenvResult = dotenv.config({
  override: true,
  path: envPath,
});
// In production (Render/Railway/etc.) we typically don't ship a `.env` file,
// relying instead on environment variables configured in the host.
// Only fail if the error is something other than "file missing".
if (dotenvResult.error && dotenvResult.error.code !== 'ENOENT') {
  throw dotenvResult.error;
}

const app = express();

// Parse JSON bodies (small payloads only).
app.use(express.json({ limit: '1mb' }));

// Enable CORS so GitHub Pages (frontend) can call the backend API.
// For the class assignment, '*' is sufficient; restrict origin later if needed.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve the existing static site (index.html, success.html, cancel.html, js/...)
app.use(express.static(path.join(__dirname, '..')));

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables.');
}
if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
  throw new Error('STRIPE_SECRET_KEY format looks wrong. It should start with `sk_test_` (test) or `sk_live_` (live).');
}
if (!baseUrl) {
  throw new Error('Missing BASE_URL in environment variables (must be publicly reachable).');
}

// Use the Stripe SDK to create hosted checkout sessions.
const stripe = require('stripe')(stripeSecretKey);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/create-checkout-session', async (req, res) => {
  const itemName = '$1 Test Item';
  const amountCents = 100; // Fixed at $1.00.

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: itemName },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,
      metadata: {
        itemName,
        amountCents: String(amountCents),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

app.get('/api/checkout-session', async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id query parameter.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const createdAtIso = session.created ? new Date(session.created * 1000).toISOString() : null;
    const paymentIntentId =
      session.payment_intent && typeof session.payment_intent !== 'string'
        ? session.payment_intent.id
        : session.payment_intent || null;

    res.json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      currency: session.currency,
      amountTotal: session.amount_total,
      createdAtIso,
      paymentIntentId,
    });
  } catch (err) {
    console.error('Failed to retrieve checkout session:', err);
    res.status(500).json({ error: 'Failed to retrieve checkout session.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

