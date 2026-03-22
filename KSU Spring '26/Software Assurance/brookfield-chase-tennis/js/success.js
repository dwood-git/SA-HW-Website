(function () {
  const box = document.getElementById('success-box');
  if (!box) return;

  function getSessionId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('session_id');
  }

  function formatMoneyFromCents(amountTotal, currency) {
    const cents = Number(amountTotal);
    if (!Number.isFinite(cents)) return null;
    const amount = cents / 100;
    const currencyCode = currency || 'usd';
    return `${amount.toFixed(2)} ${currencyCode.toUpperCase()}`;
  }

  function getApiBaseUrl() {
    const raw = (window && window.API_BASE_URL) ? window.API_BASE_URL : '';
    return String(raw || '').replace(/\/$/, '');
  }

  function renderDemoSuccess() {
    const itemName = '$1 Test Item';
    const amountLabel = '$1.00 USD';
    const createdAtText = new Date().toLocaleString();
    const statusText = 'paid';
    const txLine = 'Transaction confirmation unavailable (demo).';
    const paidOk = statusText === 'paid';

    box.innerHTML = `
      <div class="success-row"><strong>Item purchased:</strong> ${itemName}</div>
      <div class="success-row"><strong>Amount charged:</strong> ${amountLabel}</div>
      <div class="success-row"><strong>Date/time:</strong> ${createdAtText}</div>
      <div class="success-row"><strong>${paidOk ? 'Success' : 'Status'}:</strong> ${statusText}</div>
      <div class="success-row">${txLine}</div>
    `;
  }

  async function loadSuccess() {
    const sessionId = getSessionId();
    if (!sessionId) {
      box.innerHTML = '<div class="error-text">Missing `session_id` in the URL. Please return to the homepage and try again.</div>';
      return;
    }

    box.textContent = 'Loading your transaction details...';

    try {
      const apiBaseUrl = getApiBaseUrl();
      const url = apiBaseUrl
        ? `${apiBaseUrl}/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`
        : `api/checkout-session?session_id=${encodeURIComponent(sessionId)}`;

      const resp = await fetch(url);
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data.error || 'Failed to load checkout session.');
      }

      const amountLabel = formatMoneyFromCents(data.amountTotal, data.currency);
      const createdAtText = data.createdAtIso ? new Date(data.createdAtIso).toLocaleString() : null;
      const statusText = data.paymentStatus || 'unknown';
      const itemName = '$1 Test Item';

      const txId = data.paymentIntentId || data.sessionId;
      const txLine = txId ? `Transaction confirmation: ${txId}` : 'Transaction confirmation unavailable.';

      const paidOk = statusText === 'paid';

      box.innerHTML = `
        <div class="success-row"><strong>Item purchased:</strong> ${itemName}</div>
        <div class="success-row"><strong>Amount charged:</strong> ${amountLabel || '$1.00 USD'}</div>
        <div class="success-row"><strong>Date/time:</strong> ${createdAtText || 'Not available'}</div>
        <div class="success-row"><strong>${paidOk ? 'Success' : 'Status'}:</strong> ${statusText}</div>
        <div class="success-row">${txLine}</div>
      `;
    } catch (err) {
      console.error(err);
      // When backend isn't deployed for GitHub Pages, still render something meaningful.
      renderDemoSuccess();
    }
  }

  loadSuccess();
})();

