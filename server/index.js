/**
 * Backend mínimo Mercado Pago Checkout Pro.
 * El access_token NUNCA va en la app móvil.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, mercadopago: Boolean(ACCESS_TOKEN) });
});

/**
 * POST /payments/mercadopago/preference
 * body: { tripId, title, amount, payerEmail? }
 */
app.post('/payments/mercadopago/preference', async (req, res) => {
  try {
    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Falta MERCADOPAGO_ACCESS_TOKEN en .env' });
    }

    const { tripId, title, amount, payerEmail } = req.body || {};
    const unitPrice = Math.round(Number(amount) || 0);

    if (!tripId || unitPrice <= 0) {
      return res.status(400).json({ error: 'tripId y amount (>0) son requeridos' });
    }

    const preference = {
      items: [
        {
          id: String(tripId),
          title: title || `Viaje UberClone ${tripId}`,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'COP',
        },
      ],
      external_reference: String(tripId),
      // Deep link / callback para Expo
      back_urls: {
        success: 'uberclone://payment/success',
        failure: 'uberclone://payment/failure',
        pending: 'uberclone://payment/pending',
      },
      auto_return: 'approved',
      statement_descriptor: 'UBERCLONE',
      metadata: { tripId: String(tripId) },
    };

    if (payerEmail) {
      preference.payer = { email: String(payerEmail) };
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('MP preference error:', data);
      return res.status(response.status).json({
        error: data.message || 'Error creando preferencia',
        details: data,
      });
    }

    return res.json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      // Credenciales de prueba suelen usar sandbox
      checkoutUrl: data.sandbox_init_point || data.init_point,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UberClone payments API en http://0.0.0.0:${PORT}`);
  console.log(`Mercado Pago token: ${ACCESS_TOKEN ? 'OK' : 'FALTA'}`);
});
