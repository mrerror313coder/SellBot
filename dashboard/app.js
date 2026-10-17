let currentTab = 'overview';
let allConversations = [];
let allProducts = [];
let selectedConversationId = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadAnalytics();
  loadConversations();
  loadCatalog();
  loadSettings();
  checkWhatsAppStatus();

  // Handle URL hash routing
  if (window.location.hash) {
    const tab = window.location.hash.replace('#', '');
    if (['overview', 'conversations', 'catalog', 'simulator', 'pairing', 'settings'].includes(tab)) {
      switchTab(tab);
    }
  }

  // Periodic poll for analytics & WhatsApp pairing status
  setInterval(checkWhatsAppStatus, 8000);
});

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  currentTab = tabId;
  window.location.hash = tabId;

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });

  const titles = {
    overview: "Today's Overview",
    conversations: 'Customer Conversations',
    catalog: 'Product Catalog & Vector Embeddings',
    simulator: 'WhatsApp Live AI Sales Simulator',
    pairing: 'WhatsApp Web QR Pairing',
    settings: 'Store & Agent Settings',
  };

  const subtitles = {
    overview: 'Autonomous sales agent performance & metrics',
    conversations: 'Multi-turn chats, intent tracking, and human escalation',
    catalog: '50 SKUs loaded with 768-dim semantic search vectors',
    simulator: 'Test multilingual queries, speech, and UPI checkout in real-time',
    pairing: 'Scan with your WhatsApp to connect live messaging',
    settings: 'Customize brand voice, languages, and payment credentials',
  };

  document.getElementById('page-title').innerText = titles[tabId] || 'SellBot Dashboard';
  document.getElementById('page-subtitle').innerText = subtitles[tabId] || '';

  if (tabId === 'pairing') {
    checkWhatsAppStatus();
  }
}

function refreshCurrentTab() {
  if (currentTab === 'overview') loadAnalytics();
  else if (currentTab === 'conversations') loadConversations();
  else if (currentTab === 'catalog') loadCatalog();
  else if (currentTab === 'pairing') checkWhatsAppStatus();
  showToast('Synchronized with SellBot backend.');
}

/* ========================================================
 * 1. Analytics & Overview Tab
 * ======================================================== */
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('stat-chats-today').innerText = data.overview.chatsToday;
    document.getElementById('stat-response-rate').innerText = data.overview.responseRate;
    document.getElementById('stat-revenue-today').innerText = data.overview.revenueFormatted;
    document.getElementById('stat-avg-resp-time').innerText = data.overview.avgResponseTime;

    document.getElementById('top-llm-model').innerText = data.agentMetrics.model;
    document.getElementById('metric-model').innerText = data.agentMetrics.model;
    document.getElementById('metric-latency').innerText = data.agentMetrics.avgLatency;
    document.getElementById('metric-tokens').innerText = data.agentMetrics.avgTokensPerMsg;
    document.getElementById('metric-tools').innerText = data.agentMetrics.totalToolCalls;
    document.getElementById('metric-api-usage').innerText = data.agentMetrics.dailyApiUsage;
  } catch (err) {
    console.warn('Analytics fetch error:', err);
  }
}

/* ========================================================
 * 2. Conversations Tab
 * ======================================================== */
async function loadConversations() {
  try {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;
    allConversations = await res.json();
    document.getElementById('badge-conv-count').innerText = allConversations.length;

    renderRecentConversationsTable(allConversations.slice(0, 5));
    renderConversationsList(allConversations);
  } catch (err) {
    console.warn('Conversations fetch error:', err);
  }
}

function renderRecentConversationsTable(convs) {
  const tbody = document.getElementById('recent-conversations-tbody');
  tbody.innerHTML = '';

  convs.forEach((c) => {
    const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
    const firstCustMsg = c.messages?.find((m) => m.role === 'customer');
    const custSnippet = firstCustMsg ? `"${firstCustMsg.content.slice(0, 32)}..."` : '—';
    const lang = lastMsg?.language || 'en';
    const intent = c.context?.detectedIntent || 'browse';

    const statusBadgeMap = {
      sold: '<span class="badge badge-success">✓ Sold</span>',
      active: '<span class="badge badge-info">🔄 Active</span>',
      escalated: '<span class="badge badge-warning">⚠️ Human Handoff</span>',
      closed: '<span class="badge">Closed</span>',
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${getSenderDisplayName(c.channelId)}</strong></td>
      <td>${custSnippet}</td>
      <td><span class="pill-badge">${lang.toUpperCase()}</span></td>
      <td>${intent}</td>
      <td>${statusBadgeMap[c.status] || c.status}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openConversationDetail('${c.channelId}')">Inspect Trace</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function getSenderDisplayName(channelId) {
  if (channelId.includes('919876543210')) return 'Rahul Sharma';
  if (channelId.includes('919811223344')) return 'Priya Patel';
  if (channelId.includes('919955443322')) return 'Amit Verma';
  if (channelId.includes('919777888999')) return 'Sneha Roy';
  return channelId.split('@')[0].replace('whatsapp:', '') || 'Shopper';
}

function renderConversationsList(convs) {
  const container = document.getElementById('conversations-list');
  container.innerHTML = '';

  convs.forEach((c) => {
    const lastCust = c.messages?.slice().reverse().find((m) => m.role === 'customer');
    const snippet = lastCust ? lastCust.content : 'No messages yet';
    const name = getSenderDisplayName(c.channelId);

    const card = document.createElement('div');
    card.className = `chat-item-card ${selectedConversationId === c.channelId ? 'active' : ''}`;
    card.onclick = () => openConversationDetail(c.channelId);
    card.innerHTML = `
      <div class="chat-item-top">
        <span class="chat-item-name">${name}</span>
        <span class="chat-item-time">${formatTime(c.lastMessageAt || c.updatedAt)}</span>
      </div>
      <div class="chat-item-snippet">${snippet}</div>
    `;
    container.appendChild(card);
  });
}

function setConvFilter(status, chipBtn) {
  document.querySelectorAll('.filter-chips .chip').forEach((c) => c.classList.remove('active'));
  chipBtn.classList.add('active');

  if (status === 'all') {
    renderConversationsList(allConversations);
  } else {
    renderConversationsList(allConversations.filter((c) => c.status === status));
  }
}

function filterConversations() {
  const query = document.getElementById('conv-search-input').value.toLowerCase();
  const filtered = allConversations.filter(
    (c) =>
      c.channelId.toLowerCase().includes(query) ||
      getSenderDisplayName(c.channelId).toLowerCase().includes(query) ||
      c.messages?.some((m) => m.content.toLowerCase().includes(query))
  );
  renderConversationsList(filtered);
}

function openConversationDetail(channelId) {
  selectedConversationId = channelId;
  switchTab('conversations');

  const conv = allConversations.find((c) => c.channelId === channelId || c._id === channelId);
  if (!conv) return;

  document.getElementById('chat-detail-empty').style.display = 'none';
  document.getElementById('chat-detail-content').style.display = 'flex';

  document.getElementById('detail-customer-name').innerText = getSenderDisplayName(conv.channelId);
  document.getElementById('detail-customer-phone').innerText = conv.channelId;
  document.getElementById('detail-status-select').value = conv.status;

  const badge = document.getElementById('detail-status-badge');
  badge.className = `badge ${conv.status === 'sold' ? 'badge-success' : conv.status === 'escalated' ? 'badge-warning' : 'badge-info'}`;
  badge.innerText = conv.status.toUpperCase();

  const msgContainer = document.getElementById('detail-messages-container');
  msgContainer.innerHTML = '';

  (conv.messages || []).forEach((msg) => {
    const isCustomer = msg.role === 'customer';
    const wrap = document.createElement('div');
    wrap.className = `msg-bubble-wrap ${isCustomer ? 'customer' : 'agent'}`;

    const toolsHtml = msg.toolsUsed?.length
      ? msg.toolsUsed.map((t) => `<span class="badge badge-info" style="font-size:9px;">${t}</span>`).join(' ')
      : '';

    wrap.innerHTML = `
      <div class="msg-bubble">${escapeHtml(msg.content)}</div>
      <div class="msg-meta-row">
        <span>${isCustomer ? 'Customer' : 'SellBot'} • ${formatTime(msg.timestamp)}</span>
        ${toolsHtml}
      </div>
    `;
    msgContainer.appendChild(wrap);
  });
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Agent Reasoning Inspector
  const lastAgentMsg = (conv.messages || []).slice().reverse().find((m) => m.role === 'agent');
  if (lastAgentMsg) {
    document.getElementById('inspector-tools-count').innerText = `${lastAgentMsg.toolsUsed?.length || 0} Tools Called`;
    document.getElementById('inspector-reasoning-text').innerText =
      lastAgentMsg.reasoning || `Intent: ${conv.context?.detectedIntent || 'browse'}, Language: ${lastAgentMsg.language || 'en'}`;
  }
}

async function updateConversationStatus(status) {
  if (!selectedConversationId) return;
  try {
    await fetch(`/api/conversations/${selectedConversationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    showToast(`Status updated to ${status}`);
    loadConversations();
  } catch (e) {
    console.error('Error updating status:', e);
  }
}

/* ========================================================
 * 3. Catalog Tab
 * ======================================================== */
async function loadCatalog() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) return;
    allProducts = await res.json();
    renderCatalogGrid(allProducts);
  } catch (e) {
    console.warn('Catalog fetch error:', e);
  }
}

function renderCatalogGrid(products) {
  const grid = document.getElementById('catalog-cards-grid');
  grid.innerHTML = '';

  products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const imgUrl = p.images?.[0] || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400';
    const inStock = p.inventory?.inStock ?? true;

    card.innerHTML = `
      <div class="prod-img-wrap">
        <img src="${imgUrl}" alt="${p.name}" loading="lazy">
        <span class="prod-stock-pill ${inStock ? 'in-stock' : 'low-stock'}">
          ${inStock ? `In Stock (${p.inventory?.quantity || 15})` : 'Low Stock'}
        </span>
      </div>
      <div class="prod-body">
        <span class="prod-sku">${p.sku}</span>
        <h3 class="prod-name">${p.name}</h3>
        <p class="prod-desc">${p.description}</p>
        <div class="prod-footer">
          <span class="prod-price">₹${p.price}</span>
          <span class="prod-rating">★ ${p.rating || 4.8}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterCatalog() {
  const query = document.getElementById('catalog-search-input').value.toLowerCase();
  const category = document.getElementById('catalog-category-select').value.toLowerCase();

  const filtered = allProducts.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query);
    const matchesCategory = !category || p.category?.some((c) => c.toLowerCase().includes(category));
    return matchesSearch && matchesCategory;
  });

  renderCatalogGrid(filtered);
}

async function handleCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  showToast('Uploading CSV and generating 768-dim vector embeddings...');

  try {
    const res = await fetch('/api/stores/store_priya_001/products/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Success! Uploaded ${data.uploaded} products with embeddings.`);
      loadCatalog();
    } else {
      showToast(`Error: ${data.error || 'Upload failed'}`);
    }
  } catch (err) {
    showToast('Failed to upload CSV.');
  }
}

function showAddProductModal() {
  document.getElementById('product-modal').style.display = 'flex';
}

function closeAddProductModal() {
  document.getElementById('product-modal').style.display = 'none';
}

async function submitNewProduct(event) {
  event.preventDefault();
  const name = document.getElementById('new-prod-name').value;
  const description = document.getElementById('new-prod-desc').value;
  const price = parseFloat(document.getElementById('new-prod-price').value);
  const sku = document.getElementById('new-prod-sku').value;
  const category = document.getElementById('new-prod-category').value.split(',').map((c) => c.trim());
  const quantity = parseInt(document.getElementById('new-prod-qty').value, 10);

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        price,
        sku,
        category,
        quantity,
      }),
    });

    if (res.ok) {
      showToast('Product added with vector embedding!');
      closeAddProductModal();
      loadCatalog();
    }
  } catch (e) {
    showToast('Error saving product');
  }
}

/* ========================================================
 * 4. WhatsApp Live Simulator Tab
 * ======================================================== */
async function handleSimulatorSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('sim-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  appendSimulatorMessage('customer', text);

  // Show typing indicator
  document.getElementById('sim-typing-bar').style.display = 'flex';
  const chatBody = document.getElementById('sim-chat-body');
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const res = await fetch('/api/whatsapp/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'whatsapp:919876543210@s.whatsapp.net',
        message: text,
      }),
    });

    document.getElementById('sim-typing-bar').style.display = 'none';

    if (res.ok) {
      const data = await res.json();
      appendSimulatorMessage('agent', data.text, data.paymentQR);
      updateSimulatorTelemetry(data);
    } else {
      appendSimulatorMessage('agent', 'I encountered an error connecting to the agent engine. Please retry.');
    }
  } catch (err) {
    document.getElementById('sim-typing-bar').style.display = 'none';
    appendSimulatorMessage('agent', 'Network error. Ensure the SellBot server is active.');
  }
}

function sendQuickPrompt(prompt) {
  document.getElementById('sim-input').value = prompt;
  handleSimulatorSubmit(new Event('submit'));
}

function appendSimulatorMessage(role, text, paymentQR) {
  const chatBody = document.getElementById('sim-chat-body');
  const row = document.createElement('div');
  row.className = `wa-msg-row ${role}`;

  let qrHtml = '';
  if (paymentQR) {
    qrHtml = `
      <div style="margin-top:10px; text-align:center; background:#fff; padding:10px; border-radius:8px;">
        <img src="${paymentQR}" style="width:160px; height:160px;" alt="UPI QR">
        <p style="color:#000; font-size:11px; margin-top:4px; font-weight:700;">Scan with GPay / PhonePe / Paytm</p>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="wa-msg-bubble ${role}">
      <div class="wa-msg-text">${formatWhatsAppMarkdown(text)}${qrHtml}</div>
      <div class="wa-msg-time">${formatTime(new Date())}</div>
    </div>
  `;
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function clearSimulator() {
  document.getElementById('sim-chat-body').innerHTML = `
    <div class="wa-msg-row agent">
      <div class="wa-msg-bubble agent">
        <div class="wa-msg-text">
          Namaste! 🎂<br>
          Welcome to Priya's Cakes! Main aapki kya madad kar sakta hoon?<br><br>
          Aap mujhse pooch sakte hain:<br>
          • <i>"Birthday cake dikhao"</i><br>
          • <i>"Eggless options?"</i><br>
          • <i>"Gift for mom under 500"</i>
        </div>
        <div class="wa-msg-time">10:00 AM</div>
      </div>
    </div>
  `;
  document.getElementById('sim-payment-preview').style.display = 'none';
}

function updateSimulatorTelemetry(data) {
  document.getElementById('sim-telemetry-lang').innerText = `${data.language?.toUpperCase() || 'EN'}`;
  document.getElementById('sim-telemetry-intent').innerText = data.intent || 'browse';
  document.getElementById('sim-telemetry-latency').innerText = `${data.metrics?.latencyMs || 2100} ms`;
  document.getElementById('sim-telemetry-tokens').innerText = data.metrics?.tokensUsed || 160;

  const toolsContainer = document.getElementById('sim-telemetry-tools');
  toolsContainer.innerHTML = '';
  (data.metrics?.toolsCalled || ['language_detector', 'intent_classifier']).forEach((tool) => {
    const badge = document.createElement('span');
    badge.className = 'badge badge-info';
    badge.innerText = tool;
    toolsContainer.appendChild(badge);
  });

  if (data.paymentQR) {
    const preview = document.getElementById('sim-payment-preview');
    preview.style.display = 'block';
    document.getElementById('sim-payment-qr-img').src = data.paymentQR;
    const linkBtn = document.getElementById('sim-payment-upi-link');
    linkBtn.href = data.paymentLink || '#';
  }
}

/* ========================================================
 * 5. Baileys QR Pairing Tab
 * ======================================================== */
async function checkWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp/status');
    if (!res.ok) return;
    const data = await res.json();

    const spinner = document.getElementById('qr-spinner');
    const qrImg = document.getElementById('baileys-qr-image');
    const statusText = document.getElementById('backend-status');

    if (data.connected) {
      statusText.innerText = 'WhatsApp: Linked & Live ✅';
      spinner.innerHTML = '<div style="color:#10b981; font-weight:700; font-size:16px;">✓ WhatsApp Connected</div><p style="color:#64748b; font-size:12px; margin-top:6px;">SellBot is listening to real WhatsApp messages!</p>';
      spinner.style.display = 'block';
      qrImg.style.display = 'none';
    } else if (data.qrCodeDataUrl) {
      spinner.style.display = 'none';
      qrImg.src = data.qrCodeDataUrl;
      qrImg.style.display = 'block';
      statusText.innerText = 'WhatsApp: QR Ready to Scan';
    } else {
      spinner.innerHTML = '<div class="spinner"></div><p>Ready to Pair. Click "Generate QR Code" below.</p>';
      spinner.style.display = 'block';
      qrImg.style.display = 'none';
      statusText.innerText = 'WhatsApp: Idle (Offline)';
    }
  } catch (e) {
    // safe
  }
}

async function initiateBaileysConnect() {
  showToast('Initializing Baileys WhatsApp Web socket...');
  try {
    const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
    const data = await res.json();
    setTimeout(checkWhatsAppStatus, 1500);
  } catch (e) {
    showToast('Failed to start socket.');
  }
}

/* ========================================================
 * 6. Settings Tab
 * ======================================================== */
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const store = await res.json();

    if (store.name) document.getElementById('set-store-name').value = store.name;
    if (store.settings?.agentPersonality) document.getElementById('set-personality').value = store.settings.agentPersonality;
    if (store.settings?.paymentUPI) document.getElementById('set-upi-id').value = store.settings.paymentUPI;
    if (store.settings?.currency) document.getElementById('set-currency').value = store.settings.currency;
    if (store.settings?.freeShippingThreshold) document.getElementById('set-free-shipping').value = store.settings.freeShippingThreshold;
    if (store.settings?.upsellAggressiveness) {
      document.getElementById('set-upsell').value = store.settings.upsellAggressiveness;
      document.getElementById('upsell-val').innerText = store.settings.upsellAggressiveness;
    }

    document.getElementById('sidebar-store-name').innerText = store.name || "Priya's Cakes";
    document.getElementById('sim-store-title').innerText = store.name || "Priya's Cakes";
  } catch (e) {
    // safe
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const name = document.getElementById('set-store-name').value;
  const agentPersonality = document.getElementById('set-personality').value;
  const paymentUPI = document.getElementById('set-upi-id').value;
  const currency = document.getElementById('set-currency').value;
  const freeShippingThreshold = parseFloat(document.getElementById('set-free-shipping').value);
  const upsellAggressiveness = parseFloat(document.getElementById('set-upsell').value);

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        settings: {
          agentPersonality,
          paymentUPI,
          currency,
          freeShippingThreshold,
          upsellAggressiveness,
        },
      }),
    });

    if (res.ok) {
      showToast('Settings saved to MongoDB Atlas successfully! 🎉');
      loadSettings();
    }
  } catch (e) {
    showToast('Failed to save settings.');
  }
}

/* ========================================================
 * Helpers
 * ======================================================== */
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatWhatsAppMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}
