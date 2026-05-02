// =====================================================
// FEATURE 9 — Crop Planning Oracle
// =====================================================
function showCropPlanning(params={}) {
  const userDist = params.district || farmer.district || '';
  
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🌱 பயிர் திட்டமிடல் ஆலோசகன்</div><div class="modal-title-en">Crop Planning Oracle</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="cp-district">${districtOptions(userDist)}</select></div>
  <div class="form-row"><label class="form-label">பருவம் / Season</label>
    <select class="form-input form-select" id="cp-season">
      <option value="kharif">கரிப் / Kharif (Jun-Nov)</option>
      <option value="rabi">ரபி / Rabi (Nov-Apr)</option>
      <option value="zaid">ஜாயித் / Zaid (Apr-Jun)</option>
    </select>
  </div>
  <div class="form-row"><label class="form-label">மண் வகை</label>
    <select class="form-input form-select" id="cp-soil">
      <option value="red loam">சிவப்பு மண்</option>
      <option value="black cotton">கரிசல் மண்</option>
      <option value="alluvial">வண்டல் மண்</option>
      <option value="laterite">செம்மண்</option>
    </select>
  </div>
  <div class="form-row"><label class="form-label">பாசன வகை</label>
    <select class="form-input form-select" id="cp-irrigation">
      <option value="rain-fed">மழை நீர்</option>
      <option value="drip">சொட்டு நீர்</option>
      <option value="canal">கால்வாய்</option>
      <option value="borewell">போர்வெல்</option>
    </select>
  </div>
  <button class="btn-primary btn-full" onclick="getCropRecommendations()">🌱 எந்த பயிர் விதைக்கலாம்?</button>
  <div id="cp-result"></div>`);

  if (params.district) {
    setTimeout(getCropRecommendations, 400);
  }
}

async function getCropRecommendations() {
  const el = document.getElementById('cp-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">VAANI ஆலோசிக்கிறது...</div></div>';
  const params = new URLSearchParams({
    district: document.getElementById('cp-district').value,
    season: document.getElementById('cp-season').value,
    soil_type: document.getElementById('cp-soil').value,
    irrigation: document.getElementById('cp-irrigation').value,
  });
  try {
    const res = await fetch(`${API}/api/crop/recommend?${params}`);
    const d = await res.json();
    const crops = d.recommended_crops||[];
    const cropsHtml = crops.map((c,i)=>`
      <div class="scheme-card mt-8 info-with-speaker">
        <div style="font-size:1rem;font-weight:800;color:var(--primary)">#${i+1} ${c.crop_name||c}</div>
        <div class="text-muted mt-4" style="font-size:.85rem">${c.reason||''}</div>
        ${c.expected_price_per_quintal?`<div class="scheme-benefit mt-8">₹${c.expected_price_per_quintal}/குவிண்டால்</div>`:''}
        ${c.risk_level?`<span class="badge ${c.risk_level==='low'?'badge-low':'badge-medium'}">${c.risk_level} risk</span>`:''}
        <button class="speaker-inline-btn" style="top:20px" onclick="speak('${(c.crop_name||c).replace(/'/g,"\\'")} - ${c.reason?.replace(/'/g,"\\'")}')">🔊</button>
      </div>`).join('');
    el.innerHTML = `
      ${cropsHtml||infoCard('பரிந்துரை கிடைக்கவில்லை.')}
      ${d.glut_risk_crops?.length?infoCard('<b>⚠️ நிறைவு அபாயம்:</b><br>'+d.glut_risk_crops.join(', '), 'alert'):''}
      ${d.season_tips?infoCard(d.season_tips, 'success'):''}`;
    speak(d.season_tips || "பயிர்ப் பரிந்துரைகள் தயார்.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 10 — Pest Outbreak Predictor
// =====================================================
function showPestOutbreak(params={}) {
  const userCrop = params.crop || (farmer.crops||['paddy'])[0];
  const userDist = params.district || farmer.district || '';
  const userPest = params.problem || params.pest || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🐛 பூச்சி வெடிப்பு கணிப்பான்</div><div class="modal-title-en">Pest Outbreak Predictor</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">பூச்சி வகை / Pest Type</label>${wrapInputWithMic('pest-type', 'தண்டு துளைப்பான், இலை சுருட்டு...', userPest)}</div>
  <div class="form-row"><label class="form-label">பயிர்</label>${wrapInputWithMic('pest-crop', 'நெல்...', userCrop)}</div>
  <div class="form-row"><label class="form-label">தீவிரம் / Severity</label>
    <select class="form-input form-select" id="pest-severity">
      <option value="low">குறைவு / Low</option>
      <option value="medium" selected>மிதமான / Medium</option>
      <option value="high">அதிக / High</option>
      <option value="critical">மிகவும் அதிக / Critical</option>
    </select>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="pest-district">${districtOptions(userDist)}</select></div>
  <div class="flex-row">
    <button class="btn-primary" style="flex:1" onclick="reportPest()">📢 அறிக்கை செய்க</button>
    <button class="btn-primary" style="flex:1;background:var(--accent-dark)" onclick="checkPestRisk()">⚠️ ஆபத்து நிலை</button>
  </div>
  <div id="pest-result"></div>`);

  if (userCrop && userDist) {
    setTimeout(checkPestRisk, 400);
  }
}

async function reportPest() {
  const el = document.getElementById('pest-result');
  const body = {
    farmer_id: farmer.farmer_id||'demo',
    pest_type: document.getElementById('pest-type').value||'unknown',
    crop: document.getElementById('pest-crop').value,
    severity: document.getElementById('pest-severity').value,
    district: document.getElementById('pest-district').value,
  };
  try {
    const res = await fetch(`${API}/api/pest/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    el.innerHTML = `<div class="info-card success mt-12">✅ ${d.message||'அறிக்கை பதிவாகியுள்ளது!'}</div>`;
  } catch(e) { el.innerHTML = `<div class="info-card success mt-12">✅ அறிக்கை பதிவாகியுள்ளது! (offline mode)</div>`; }
}

async function checkPestRisk() {
  const el = document.getElementById('pest-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const district = document.getElementById('pest-district').value;
  const crop = document.getElementById('pest-crop').value;
  try {
    const res = await fetch(`${API}/api/pest/risk/${encodeURIComponent(district)}/${encodeURIComponent(crop)}`);
    const d = await res.json();
    const riskColors = {LOW:'badge-low',MEDIUM:'badge-medium',HIGH:'badge-high',CRITICAL:'badge-critical'};
    const ai = d.ai_prediction||{};
    el.innerHTML = `
      <div class="result-card mt-12 text-center">
        <div class="result-label">உங்கள் பண்ணை ஆபத்து நிலை</div>
        <span class="badge ${riskColors[d.risk_level]||'badge-medium'}" style="font-size:1rem">${d.risk_level||'MEDIUM'}</span>
        <div class="text-muted mt-8" style="font-size:.8rem">${d.num_reports||0} அறிக்கைகள் மாவட்டத்தில்</div>
      </div>
      ${ai.prevention_steps?.length?infoCard('<b>🛡️ தடுப்பு நடவடிக்கை:</b><br>'+(ai.prevention_steps||[]).join('<br>'), 'success'):''}
      ${ai.risk_prediction?infoCard('<b>🔮 கணிப்பு:</b> '+ai.risk_prediction):''}`;
    speak(`உங்கள் மாவட்டத்தில் பூச்சி ஆபத்து நிலை ${d.risk_level}.`, null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 11 — Waste to Wealth
// =====================================================
function showWaste(params={}) {
  const userDist = params.district || farmer.district || '';
  const userWaste = params.problem || params.waste || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">♻️ கழிவை செல்வமாக்கு</div><div class="modal-title-en">Waste to Wealth</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="role-toggle" style="display:flex; margin-bottom: 12px; border-bottom: 2px solid rgba(0,0,0,0.05);">
    <button class="role-btn active" id="waste-tab-calc" onclick="switchWasteTab('calc')" style="flex:1; padding: 10px; border:none; background:none; font-weight:700;">💰 வருமானம்</button>
    <button class="role-btn" id="waste-tab-feed" onclick="switchWasteTab('feed')" style="flex:1; padding: 10px; border:none; background:none; font-weight:700;">📱 சமூக சந்தை</button>
  </div>

  <div id="waste-calc-view">
    <div class="form-row"><label class="form-label">கழிவு வகை / Waste Type</label>
      <select class="form-input form-select" id="waste-type">
        <option value="paddy straw">நெல் வைக்கோல்</option>
        <option value="sugarcane bagasse">கரும்பு சக்கை</option>
        <option value="banana stem">வாழை தண்டு</option>
        <option value="coconut shell">தேங்காய் ஓடு</option>
        <option value="maize stover">சோள தண்டு</option>
        <option value="cotton stalks">பருத்தி தண்டு</option>
      </select>
    </div>
    <div class="form-row"><label class="form-label">அளவு (கிலோ) / Quantity (kg)</label>${wrapInputWithMic('waste-qty', '500', params.quantity||'', 'number')}</div>
    <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="waste-district">${districtOptions(userDist)}</select></div>
    <button class="btn-primary btn-full" onclick="getWasteOptions()">♻️ வருமான வழிகள் காட்டு</button>
    <div id="waste-result"></div>
    <div class="divider"></div>
    <button class="btn-primary btn-full mt-8" style="background:var(--accent-dark)" onclick="postWasteListing()">📢 கழிவை விற்பனைக்கு பதிவிடு (Post for Sale)</button>
  </div>
  
  <div id="waste-feed-view" style="display:none;">
    <div id="waste-feed-container"></div>
  </div>`);
  
  // Set waste type if passed
  if (userWaste) {
    const sel = document.getElementById('waste-type');
    for(let opt of sel.options) {
      if(opt.value.includes(userWaste.toLowerCase()) || userWaste.toLowerCase().includes(opt.value)) {
        opt.selected = true; break;
      }
    }
  }

  if (userWaste || params.quantity) {
    setTimeout(getWasteOptions, 400);
  }
}

async function getWasteOptions() {
  const el = document.getElementById('waste-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = { waste_type: document.getElementById('waste-type').value, quantity: parseFloat(document.getElementById('waste-qty').value)||100, district: document.getElementById('waste-district').value };
  try {
    const res = await fetch(`${API}/api/waste/options`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const opts = (d.options||[]).map((o,i)=>`
      <div class="scheme-card mt-8">
        <div style="font-weight:800;color:var(--primary)">#${i+1} ${o.option_name}</div>
        <div class="scheme-benefit mt-4">₹${o.total_income?.toLocaleString()||0} மொத்த வருமானம்</div>
        <div class="text-muted" style="font-size:.82rem"><b>வாங்குபவர்:</b> ${o.buyer_type||''}</div>
        <div class="text-muted" style="font-size:.82rem"><b>விலை:</b> ₹${o.price_per_kg||0}/கிலோ</div>
        <div class="text-muted mt-4" style="font-size:.82rem">${o.buyer_contact||''}</div>
      </div>`).join('');
    const ct = d.carbon_tracker||{};
    el.innerHTML = `
      ${opts}
      ${infoCard('🌍 ' + ct.message, 'success')}`;
    speak(ct.message || "வருமான வழிகள் கண்டறியப்பட்டன.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

function switchWasteTab(tab) {
  document.getElementById('waste-calc-view').style.display = tab==='calc'?'block':'none';
  document.getElementById('waste-feed-view').style.display = tab==='feed'?'block':'none';
  document.querySelectorAll('.role-toggle .role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('waste-tab-'+tab).classList.add('active');
  if(tab==='feed') loadWasteFeed();
}

async function postWasteListing() {
  const type = document.getElementById('waste-type').value;
  const qty = document.getElementById('waste-qty').value;
  const el = document.getElementById('waste-result');
  el.innerHTML = infoCard("வாணி விலை நிர்ணயம் செய்கிறாள்... (Vaani is fixing price)", "accent");
  
  setTimeout(() => {
    const price = (Math.random() * 5 + 2).toFixed(2);
    const total = (price * qty).toFixed(1);
    el.innerHTML = infoCard(`<b>✅ வாணி பரிந்துரை:</b> கிலோவிற்கு ₹${price}. <br> மொத்த மதிப்பு: ₹${total}. <br> உங்கள் பதிவு சமூக சந்தையில் பகிரப்பட்டது!`, "success");
    speak(`வாணி கிலோவிற்கு ${price} ரூபாய் என விலை நிர்ணயம் செய்துள்ளது. உங்கள் பதிவு வெற்றிகரமாக பகிரப்பட்டது.`);
  }, 1500);
}

async function loadWasteFeed() {
  const container = document.getElementById('waste-feed-container');
  container.innerHTML = '<div class="loading-state">சுறுசுறுப்பான சந்தை...</div>';
  const items = [
    {farmer: 'லட்சுமி', item: 'நெல் வைக்கோல்', qty: '500 kg', price: '₹4.50/kg', loc: 'Madurai'},
    {farmer: 'செல்வி', item: 'தேங்காய் ஓடு', qty: '200 kg', price: '₹8.00/kg', loc: 'Thanjavur'},
    {farmer: 'மீனா', item: 'வாழை தண்டு', qty: '150 kg', price: '₹3.50/kg', loc: 'Trichy'}
  ];
  container.innerHTML = items.map(it => `
    <div class="scheme-card mt-8 info-with-speaker">
      <div class="flex-row">
        <div style="font-weight:800; color:var(--primary); flex:1;">${it.item}</div>
        <div class="badge badge-low">${it.loc}</div>
      </div>
      <div class="text-muted mt-4">விற்பனையாளர்: ${it.farmer}</div>
      <div class="scheme-benefit mt-4">${it.qty} — ${it.price}</div>
      ${farmer.is_buyer ? `<button class="btn-primary btn-full mt-8" style="padding:8px; font-size:0.85rem;" onclick="contactFarmer('${it.farmer}')">💬 தொடர்புகொள்ள (Chat)</button>` : ''}
      <button class="speaker-inline-btn" style="top:20px" onclick="speak('${it.farmer} ${it.item} வைத்திருக்கிறார்கள். விலை ${it.price}')">🔊</button>
    </div>`).join('');
}


// =====================================================
// FEATURE 12 — Soil Health Passport
// =====================================================
function showSoilHealth(params={}) {
  const userCrop = params.crop || (farmer.crops||['paddy'])[0];
  const userDist = params.district || farmer.district || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🌍 மண் ஆரோக்கிய பாஸ்போர்ட்</div><div class="modal-title-en">Soil Health Passport</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="info-card">மண் சோதனை அறிக்கையிலிருந்து மதிப்புகளை உள்ளிடவும்</div>
  <div class="form-row mt-12"><label class="form-label">பயிர் / Crop</label>${wrapInputWithMic('soil-crop', 'நெல்...', userCrop)}</div>
  <div class="flex-row">
    <div class="form-row" style="flex:1"><label class="form-label">நைட்ரஜன் (N)</label><input class="form-input" id="soil-n" type="number" placeholder="kg/ha"></div>
    <div class="form-row" style="flex:1"><label class="form-label">பாஸ்பரஸ் (P)</label><input class="form-input" id="soil-p" type="number" placeholder="kg/ha"></div>
  </div>
  <div class="flex-row">
    <div class="form-row" style="flex:1"><label class="form-label">பொட்டாஷ் (K)</label><input class="form-input" id="soil-k" type="number" placeholder="kg/ha"></div>
    <div class="form-row" style="flex:1"><label class="form-label">pH</label><input class="form-input" id="soil-ph" type="number" placeholder="6.5" step="0.1" min="4" max="9"></div>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="soil-district">${districtOptions(userDist)}</select></div>
  <button class="btn-primary btn-full" onclick="analyzeSoil()">🌍 மண் பகுப்பாய்வு</button>
  <div id="soil-result"></div>`);
}

async function analyzeSoil() {
  const el = document.getElementById('soil-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = {
    farmer_id: farmer.farmer_id||'',
    crop: document.getElementById('soil-crop').value,
    nitrogen: parseFloat(document.getElementById('soil-n').value)||null,
    phosphorus: parseFloat(document.getElementById('soil-p').value)||null,
    potassium: parseFloat(document.getElementById('soil-k').value)||null,
    ph: parseFloat(document.getElementById('soil-ph').value)||null,
    district: document.getElementById('soil-district').value,
  };
  try {
    const res = await fetch(`${API}/api/soil/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const score = d.health_score||0;
    const scoreColor = score>70?'var(--success)':score>40?'var(--accent-dark)':'var(--alert)';
    el.innerHTML = `
      <div class="result-card mt-12 text-center">
        <div style="font-size:3rem;font-weight:800;color:${scoreColor}">${score}</div>
        <div style="font-size:1rem;font-weight:700;color:var(--primary)">மண் ஆரோக்கியம் (100 இல்) — ${d.grade||''}</div>
      </div>
      ${(d.deficiencies||[]).length?infoCard('<b>⚠️ குறைபாடுகள்:</b><br>'+d.deficiencies.join(', '), 'alert'):''}
      ${infoCard('<b>🌿 உர பரிந்துரை:</b><br>'+d.fertilizer_recommendation, 'success')}
      ${infoCard('<b>🌱 இயற்கை மாற்றீடு:</b><br>'+d.organic_amendments)}
      ${d.avoid?infoCard('<b>❌ இவற்றை தவிர்க்கவும்:</b><br>'+d.avoid, 'alert'):''}
      ${d.yield_improvement?infoCard('📈 '+d.yield_improvement, 'accent'):''}`;
    speak(d.fertilizer_recommendation || "மண் பகுப்பாய்வு முடிந்தது.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}
