import * as WebBrowser from 'expo-web-browser';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

WebBrowser.maybeCompleteAuthSession();

/**
 * Crea preferencia Checkout Pro en el backend y abre el checkout.
 */
export async function startMercadoPagoCheckout({ tripId, amount, title, payerEmail }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response;
  try {
    response = await fetch(`${API_URL}/payments/mercadopago/preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, amount, title, payerEmail }),
      signal: controller.signal,
    });
  } catch (err) {
    const reason =
      err?.name === 'AbortError'
        ? 'Timeout: el celular no alcanza el backend (firewall o WiFi distinta).'
        : err?.message || 'fetch failed';
    throw new Error(
      `${reason}\nAPI: ${API_URL}\n1) npm run server\n2) Firewall: permitir TCP 3001\n3) Misma WiFi PC/celular`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `El túnel/backend no devolvió JSON (¿localtunnel cerrado o página de loca.lt?).\nHTTP ${response.status}\nAPI: ${API_URL}`,
    );
  }
  if (!response.ok) {
    throw new Error(data.error || `Error MP HTTP ${response.status}`);
  }

  const checkoutUrl = data.checkoutUrl || data.sandbox_init_point || data.init_point;
  if (!checkoutUrl) {
    throw new Error('El backend no devolvió URL de checkout');
  }

  const result = await WebBrowser.openAuthSessionAsync(
    checkoutUrl,
    'uberclone://payment/success',
  );

  return {
    preferenceId: data.id,
    browserResult: result,
    approved:
      result.type === 'success' &&
      typeof result.url === 'string' &&
      result.url.includes('payment/success'),
  };
}

export const paymentService = {
  startMercadoPagoCheckout,
  publicKey: process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
};

export default paymentService;
