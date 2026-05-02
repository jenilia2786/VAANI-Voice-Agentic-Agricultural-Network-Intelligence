// =====================================================
// FEATURE 5 — Farm Credit Score
// =====================================================
function showCreditScore(params={}) {
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">💳 விவசாய கடன் மதிப்பெண்</div><div class="modal-title-en">Farm Credit Score</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="info-card">உங்கள் VAANI கடன் மதிப்பெண் கணக்கிடப்படுகிறது...<br><small>Your VAANI farm credit score is being calculated.</small></div>
  <button class="btn-primary btn-full mt-12" onclick="fetchCreditScore()">📊 மதிப்பெண் பெறுக</button>
  <div id="credit-result"></div>`);

  // Always auto-fetch credit score when opened
  setTimeout(fetchCreditScore, 400);
}

async function fetchCreditScore() {
  const el = document.getElementById('credit-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">கணக்கிடப்படுகிறது...</div></div>';
  const fid = farmer.farmer_id || 'demo';
  try {
    const res = await fetch(`${API}/api/credit/score/${fid}`);
    const d = await res.json();
    const score = d.score||0;
    const pct = Math.round((score/850)*100);
    const bdHtml = Object.entries(d.breakdown||{}).map(([k,v])=>`
      <div class="score-bar-row">
        <div class="score-bar-label"><span>${k}</span><span>${v}</span></div>
        <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.round((v/200)*100)}%"></div></div>
      </div>`).join('');
    const tips = (d.improvement_tips||[]).map(t=>`<div class="info-card mt-8">💡 ${t}</div>`).join('');
    el.innerHTML = `
      <div class="score-gauge-wrap">
        <div class="score-circle" style="--pct:${pct}"><span class="score-num">${score}</span></div>
        <div style="font-size:1.2rem;font-weight:800;color:var(--primary)">தரம்: ${d.grade||'B'}</div>
        <div class="text-muted" style="font-size:.8rem">Maximum: 850</div>
      </div>
      <div class="result-card"><div class="result-label">கடன் தகுதி</div><div class="result-value text-accent">₹${(d.eligible_loan_amount||0).toLocaleString()}</div></div>
      <div style="font-size:.82rem;font-weight:700;color:var(--text-secondary);margin:12px 0 8px">மதிப்பெண் பிரிவு</div>
      ${bdHtml}
      <div style="font-size:.82rem;font-weight:700;color:var(--text-secondary);margin:12px 0 8px">மேம்படுத்த குறிப்புகள்</div>
      ${tips}
      <div style="font-size:.82rem;font-weight:700;margin:12px 0 8px">பரிந்துரை வங்கிகள்</div>
      ${(d.recommended_banks||[]).map(b=>(infoCard('🏦 '+b, 'accent'))).join('')}
      <button class="btn-primary btn-full mt-16" onclick="alert('PDF உருவாக்கப்படுகிறது...')">📄 வங்கியுடன் பகிர் (PDF)</button>`;
    speak(`உங்கள் கடன் மதிப்பெண் ${score}. இது ${d.grade} தரம் ஆகும்.`, null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ Backend offline.</div>`; }
}

// =====================================================
// FEATURE 6 — Fake Input Detector
// =====================================================
function showFakeInput(params={}) {
  const userProd = params.product || '';
  const userBatch = params.batch || '';
  const userMfr = params.manufacturer || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🔍 போலி உள்ளீடு கண்டுபிடிப்பான்</div><div class="modal-title-en">Fake Input Detector</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">பொருள் பெயர் / Product Name</label>${wrapInputWithMic('fi-product', 'உரம் / மருந்து பெயர்', userProd)}</div>
  <div class="form-row"><label class="form-label">தொகுப்பு எண் / Batch No</label>${wrapInputWithMic('fi-batch', 'Batch number', userBatch)}</div>
  <div class="form-row"><label class="form-label">தயாரிப்பாளர் / Manufacturer</label>${wrapInputWithMic('fi-mfr', 'Company name', userMfr)}</div>
  <div class="form-row"><label class="form-label">நீங்கள் செலுத்திய விலை (₹)</label>${wrapInputWithMic('fi-price', 'விலை...', '', 'number')}</div>
  <button class="btn-primary btn-full mt-4" onclick="verifyInput()">🔍 சரிபார்க்கவும்</button>
  <div id="fi-result"></div>`);

  if (userProd) {
    setTimeout(verifyInput, 400);
  }
}

async function verifyInput() {
  const el = document.getElementById('fi-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = {
    product_name: document.getElementById('fi-product').value,
    batch_number: document.getElementById('fi-batch').value,
    manufacturer: document.getElementById('fi-mfr').value,
    reported_price: parseFloat(document.getElementById('fi-price').value)||null,
    district: farmer.district||'',
    farmer_id: farmer.farmer_id||'',
  };
  try {
    const res = await fetch(`${API}/api/inputs/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const authBadge = d.is_authentic ? '<span class="badge badge-low" style="font-size:1rem">✅ அசல் / REAL</span>' : '<span class="badge badge-critical" style="font-size:1rem">❌ போலி / FAKE</span>';
    el.innerHTML = `
      <div class="result-card mt-12 text-center">${authBadge}</div>
      ${d.overpriced ? `<div class="fraud-alert mt-8"><span class="fraud-alert-icon">💸</span><span class="fraud-alert-text">MRP மீறல்! ₹${d.overcharge_amount} அதிகமாக வசூலிக்கப்படுகிறது!</span></div>` : ''}
      ${infoCard(d.verification_note)}
      ${d.community_reports?.length ? `<div style="font-size:.82rem;font-weight:700;margin:12px 0 8px">மாவட்ட கருப்பு பட்டியல்</div>${d.community_reports.map(r=>infoCard('⚠️ ' + (r.product||r.product_name) + ' — ' + (r.reports||r.reports_count) + ' புகார்கள் (' + r.district + ')', 'alert')).join('')}` : ''}`;
    speak(d.is_authentic ? "இந்த பொருள் அசல் என்று கண்டறியப்பட்டது." : "எச்சரிக்கை! இது ஒரு போலி பொருள்.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 7 — Contract Reader
// =====================================================
function showContract() {
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">📄 ஒப்பந்த பாதுகாவலன்</div><div class="modal-title-en">Contract Reader</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="upload-area" onclick="document.getElementById('contract-file').click()">
    <div class="upload-icon">📋</div>
    <div class="upload-text">PDF / படம் பதிவேற்றவும்<br><small>Upload contract PDF or image</small></div>
    <input type="file" id="contract-file" accept=".pdf,image/*" style="display:none">
  </div>
  <div style="text-align:center;margin:8px 0;color:var(--text-muted);font-size:.8rem">— அல்லது உரை ஒட்டவும் —</div>
  ${wrapTextareaWithMic('contract-text', 'ஒப்பந்த உரையை இங்கே ஒட்டவும்...', '')}
  <button class="btn-primary btn-full mt-4" onclick="analyzeContract()">📄 பகுப்பாய்வு செய்க</button>
  <div id="contract-result"></div>`);
}

async function analyzeContract() {
  const el = document.getElementById('contract-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">ஒப்பந்தம் படிக்கப்படுகிறது...</div></div>';
  const text = document.getElementById('contract-text').value;
  const file = document.getElementById('contract-file').files[0];
  const fd = new FormData();
  if (text) fd.append('contract_text', text);
  if (file) fd.append('file', file);
  if (farmer.farmer_id) fd.append('farmer_id', farmer.farmer_id);
  try {
    const res = await fetch(`${API}/api/contract/analyze`,{method:'POST',body:fd});
    const d = await res.json();
    const verdict = d.verdict||'UNFAIR';
    const vClass = verdict==='FAIR'?'badge-fair':verdict==='DANGEROUS'?'badge-critical':'badge-unfair';
    el.innerHTML = `
      <div class="result-card mt-12 text-center"><span class="badge ${vClass}" style="font-size:1rem">${verdict}</span><div class="mt-8 text-muted" style="font-size:.85rem">${d.verdict_reason||''}</div></div>
      ${infoCard('<b>📝 சுருக்கம்:</b><br>'+d.summary_tamil)}
      ${(d.red_flags||[]).length?infoCard('<b>🚩 ஆபத்தான விதிகள்:</b><br>'+d.red_flags.join('<br>'), 'alert'):''}
      ${(d.counter_clauses||[]).length?infoCard('<b>✅ பரிந்துரை விதிகள்:</b><br>'+d.counter_clauses.join('<br>'), 'success'):''}`;
    speak(d.summary_tamil || "ஒப்பந்தம் பகுப்பாய்வு செய்யப்பட்டது.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 8 — Cold Storage Coordinator
// =====================================================
function showColdStorage(params={}) {
  const userCrop = params.crop || '';
  const userQty = params.quantity || '';
  const userDist = params.district || farmer.district || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">❄️ குளிர் சேமிப்பு ஒருங்கிணைப்பு</div><div class="modal-title-en">Cold Storage Coordinator</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">பயிர் / Crop</label>${wrapInputWithMic('cs-crop', 'தக்காளி, வெங்காயம்...', userCrop)}</div>
  <div class="form-row"><label class="form-label">அளவு (கிலோ)</label>${wrapInputWithMic('cs-qty', '1000', userQty, 'number')}</div>
  <div class="form-row"><label class="form-label">அறுவடை தேதி</label><input class="form-input" id="cs-date" type="date"></div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="cs-district">${districtOptions(userDist)}</select></div>
  <button class="btn-primary btn-full mt-4" onclick="findColdStorage()">❄️ குளிர் கிடங்கு தேடு</button>
  <div id="cs-result"></div>`);

  if (userCrop) {
    setTimeout(findColdStorage, 400);
  }
}

async function findColdStorage() {
  const el = document.getElementById('cs-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = {
    crop: document.getElementById('cs-crop').value||'tomato',
    quantity: parseFloat(document.getElementById('cs-qty').value)||100,
    harvest_date: document.getElementById('cs-date').value||new Date().toISOString().split('T')[0],
    district: document.getElementById('cs-district').value,
    farmer_id: farmer.farmer_id||'',
  };
  try {
    const res = await fetch(`${API}/api/coldstorage/find`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const pa = d.price_analysis||{};
    const storages = (d.nearby_storages||[]).map(s=>`<div class="mandi-card mt-8"><div><div class="mandi-name">${s.name}</div><div class="mandi-dist">${s.district}</div></div><div class="mandi-price">₹${s.cost_per_kg_day}/kg/day</div></div>`).join('');
    el.innerHTML = `
      <div class="result-card mt-12">
        <div class="result-label">சிறந்த சேமிப்பு காலம்</div><div class="result-value">${pa.optimal_store_days||14} நாட்கள்</div>
        <div class="text-muted mt-8" style="font-size:.85rem">${pa.recommendation||''}</div>
      </div>
      ${pa.profit_if_stored_inr?infoCard('<b>💰 சேமித்தால் கூடுதல் லாபம்: ₹'+pa.profit_if_stored_inr+'</b>', 'success'):''}
      <div style="font-size:.82rem;font-weight:700;margin:12px 0 8px">அருகில் உள்ள குளிர் கிடங்குகள்</div>
      ${storages}
      <div class="map-placeholder mt-12">🗺️</div>`;
    speak(`${pa.recommendation || 'கிடைத்துள்ள தகவல்கள் படி'} சேமிப்பதன் மூலம் கூடுதல் லாபம் கிடைக்கலாம்.`, null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}
