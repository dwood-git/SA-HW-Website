(function () {
  const button = document.getElementById('buy-dollar-item');
  const statusEl = document.getElementById('checkout-status');

  if (!button || !statusEl) return;

  function getApiBaseUrl() {
    // Provided by js/config.js when using a separate backend host (Option A).
    // When undefined, we fall back to relative paths for local/dev.
    const raw = (window && window.API_BASE_URL) ? window.API_BASE_URL : '';
    return String(raw || '').replace(/\/$/, '');
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  async function startCheckout() {
    button.disabled = true;
    setStatus('Opening secure checkout...');

    try {
      const apiBaseUrl = getApiBaseUrl();
      const url = apiBaseUrl ? `${apiBaseUrl}/api/create-checkout-session` : 'api/create-checkout-session';

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || 'Checkout session creation failed.');
      }
      if (!data.url) {
        throw new Error('Stripe returned no checkout URL.');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setStatus(
        `Error: ${err && err.message ? err.message : 'Could not reach checkout API.'} ` +
          'Check your backend API URL (js/config.js) and that `npm start` is running.'
      );
      button.disabled = false;
    }
  }

  button.addEventListener('click', () => {
    // Stripe Checkout handles the actual card data entry.
    startCheckout();
  });
})();

