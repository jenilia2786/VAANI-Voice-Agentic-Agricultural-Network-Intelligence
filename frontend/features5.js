// =====================================================
// FEATURE 16 — D2C Marketplace
// =====================================================
function showMarketplace(params={}) {
  const userCrop = params.crop || (farmer.crops||['paddy'])[0];
  const userDist = params.district || farmer.district || 'Chennai';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🛒 நேரடி சந்தை (D2C)</div><div class="modal-title-en">D2C Marketplace</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="flex-row mb-12">
    <button class="btn-primary" style="flex:1" onclick="showListForm()">+ பட்டியலிடு</button>
    <button class="btn-primary" style="flex:1;background:var(--accent-dark)" onclick="browseMarket()">🔍 வாங்க பார்</button>
  </div>
  <div id="mkt-list-form">
    <div class="form-row"><label class="form-label">பயிர் / Crop</label>${wrapInputWithMic('mp-crop', 'நெல்...', userCrop)}</div>
    <div class="flex-row">
      <div class="form-row" style="flex:1"><label class="form-label">அளவு (கிலோ)</label>${wrapInputWithMic('mp-qty', '50', params.quantity||'', 'number')}</div>
      <div class="form-row" style="flex:1"><label class="form-label">விலை (₹/கிலோ)</label>${wrapInputWithMic('mp-price', '35', params.price||'', 'number')}</div>
    </div>
    <div class="form-row"><label class="form-label">அறுவடை தேதி</label><input class="form-input" id="mp-date" type="date"></div>
    <label class="checkbox-row mb-12"><input type="checkbox" id="mp-organic"><span>இயற்கை விவசாயம் / Organic</span></label>
    <button class="btn-primary btn-full" onclick="listProduce()">📤 பட்டியலிடு</button>
  </div>
  <div id="mp-result"></div>`);

  if (params.browse || (!params.quantity && !params.price)) {
    setTimeout(browseMarket, 400);
  }
}

function showListForm() { document.getElementById('mkt-list-form').style.display='block'; }

async function listProduce() {
  const el = document.getElementById('mp-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = {
    farmer_id: farmer.farmer_id||'demo',
    name: farmer.name||'விவசாயி',
    crop: document.getElementById('mp-crop').value,
    quantity: parseFloat(document.getElementById('mp-qty').value)||10,
    price: parseFloat(document.getElementById('mp-price').value)||30,
    harvest_date: document.getElementById('mp-date').value||new Date().toISOString().split('T')[0],
    is_organic: document.getElementById('mp-organic').checked,
    district: farmer.district||'Chennai',
  };
  try {
    const res = await fetch(`${API}/api/marketplace/list`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    el.innerHTML = `
      <div class="success-state mt-12">
        <div class="success-icon">✅</div>
        <div class="success-title">வெற்றி!</div>
        <div class="success-msg">${d.message||'பட்டியல் பதிவாகியுள்ளது!'}</div>
      </div>
      ${d.description_tamil ? `<div class="info-card success mt-8"><b>📝 உங்கள் விளம்பரம்:</b><br>${d.description_tamil}</div>` : ''}
      ${d.qr_code_base64 ? `<div class="qr-display mt-12"><img src="data:image/png;base64,${d.qr_code_base64}" alt="QR Code"><div class="qr-label">பண்ணை தடமறிவு QR குறியீடு</div></div>` : ''}`;
    speak(d.message || "பட்டியல் பதிவாகியுள்ளது!");
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

async function browseMarket() {
  const el = document.getElementById('mp-result');
  document.getElementById('mkt-list-form').style.display = 'none';
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  try {
    const res = await fetch(`${API}/api/marketplace/browse`);
    const d = await res.json();
    const listings = (d.listings||[]).map(l=>`
      <div class="scheme-card mt-8 info-with-speaker">
        <div style="font-weight:800;color:var(--primary)">${l.crop} ${l.is_organic?'🌿 இயற்கை':''}</div>
        <div class="scheme-benefit">₹${l.price}/கிலோ · ${l.quantity}கிலோ</div>
        <div class="text-muted" style="font-size:.82rem">👩‍🌾 ${l.name||'விவசாயி'} · ${l.district||''}</div>
        <div class="text-muted" style="font-size:.78rem">அறுவடை: ${l.harvest_date||''}</div>
        ${farmer.is_buyer ? `<button class="btn-primary btn-full mt-8" style="padding:8px; font-size:0.85rem;" onclick="contactFarmer('${l.name}')">💬 தொடர்புகொள்ள (Chat)</button>` : ''}
        <button class="speaker-inline-btn" style="top:20px" onclick="speak('${l.name} ${l.crop} வைத்திருக்கிறார்கள். விலை ${l.price}')">🔊</button>
      </div>`).join('');
    el.innerHTML = `<div style="font-size:.82rem;font-weight:700;margin:8px 0">${d.total||0} பட்டியல்கள் கிடைத்தன</div>${listings}`;
    speak(`மொத்தம் ${d.total || 0} விற்பனை வாய்ப்புகள் சந்தையில் உள்ளன.`, null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 17 — Micro Processing Connector
// =====================================================
function showProcessing(params={}) {
  const crops = ['tomato','banana','chilli','turmeric','ginger','onion','garlic','coconut','groundnut','sesame'];
  const userCrop = params.crop || 'tomato';
  const userDist = params.district || farmer.district || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🏭 சிறு பதப்படுத்தல் இணைப்பு</div><div class="modal-title-en">Micro Processing Connector</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">பயிர் / Crop</label>
    <select class="form-input form-select" id="proc-crop">
      ${crops.map(c=>`<option value="${c}" ${c===userCrop.toLowerCase()?'selected':''}>${c}</option>`).join('')}
    </select>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="proc-district">${districtOptions(userDist)}</select></div>
  <button class="btn-primary btn-full" onclick="getProcessingOptions()">🏭 மதிப்பு கூட்டல் வழிகள்</button>
  <div id="proc-result"></div>`);

  if (params.crop) {
    setTimeout(getProcessingOptions, 400);
  }
}

async function getProcessingOptions() {
  const el = document.getElementById('proc-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = { crop: document.getElementById('proc-crop').value, district: document.getElementById('proc-district').value };
  try {
    const res = await fetch(`${API}/api/processing/options`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const vas = (d.value_additions||[]).map((v,i)=>`
      <div class="scheme-card mt-8">
        <div style="font-weight:800;color:var(--primary)">#${i+1} ${v.product||''}</div>
        <div class="flex-row mt-8">
          <div><div class="result-label">மூல விலை</div><div style="font-weight:700;color:var(--text-muted)">₹${v.raw_price_per_kg||0}/கிலோ</div></div>
          <div style="font-size:1.5rem;align-self:center">→</div>
          <div><div class="result-label">பதப்படுத்தல் விலை</div><div style="font-weight:800;color:var(--success)">₹${v.processed_price_per_kg||0}/கிலோ</div></div>
        </div>
        ${v.value_increase_percent?`<div class="scheme-benefit mt-4">+${v.value_increase_percent}% மதிப்பு உயர்வு 📈</div>`:''}
        <div class="text-muted mt-4" style="font-size:.8rem"><b>கருவிகள்:</b> ${v.equipment||''} (₹${(v.equipment_cost_inr||0).toLocaleString()})</div>
      </div>`).join('');
    el.innerHTML = `
      ${vas}
      ${d.fssai_requirements?infoCard('<b>🏭 FSSAI பதிவு:</b><br>'+d.fssai_requirements):''}
      ${d.ecommerce_platforms?.length?infoCard('<b>🛒 விற்பனை தளங்கள்:</b><br>'+(d.ecommerce_platforms||[]).join(' · '), 'success'):''}
      ${d.monthly_income_estimate?infoCard('💰 '+d.monthly_income_estimate, 'accent'):''}`;
    speak(d.monthly_income_estimate || "பதப்படுத்தல் வழிகள் கண்டறியப்பட்டன.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 18 — Mental Wellness Guardian
// =====================================================
let selectedMood = 3;
function showWellness(params={}) {
  const userMsg = params.problem || params.message || '';
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🌸 மன நல பாதுகாவலன்</div><div class="modal-title-en">Mental Wellness Guardian</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="info-card success"><b>உங்கள் தகவல்கள் முற்றிலும் தனிப்பட்டவை.</b> யாரும் பார்க்க மாட்டார்கள்.</div>
  <div style="text-align:center;margin:16px 0;font-size:.9rem;font-weight:600;color:var(--text-secondary)">இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?</div>
  <div class="mood-row">
    ${[['😢','மிகவும் மோசம்'],['😟','கஷ்டமாக'],['😐','சாதாரண'],['🙂','நல்லாய்'],['😄','மகிழ்ச்சி']].map((m,i)=>`<div class="mood-btn" id="mood-${i+1}" onclick="selectMood(${i+1})" title="${m[1]}">${m[0]}</div>`).join('')}
  </div>
  <div class="form-row"><label class="form-label">உங்கள் மனதில் என்ன? (optional)</label>
    ${wrapTextareaWithMic('wellness-msg', 'எதுவும் சொல்லலாம். VAANI கேட்கிறாள்...', userMsg)}
  </div>
  <button class="btn-primary btn-full mt-4" onclick="submitWellness()">🌸 VAANI கிட்டே பேசு</button>
  <div id="wellness-result"></div>`);
  selectMood(3);

  if (userMsg) {
    setTimeout(submitWellness, 400);
  }
}

function selectMood(n) {
  selectedMood = n;
  for(let i=1;i<=5;i++) { const el=document.getElementById('mood-'+i); if(el) el.classList.toggle('selected',i===n); }
}

async function submitWellness() {
  const el = document.getElementById('wellness-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌸</div></div>';
  const body = { farmer_id: farmer.farmer_id||'anonymous', mood_score: selectedMood, message: document.getElementById('wellness-msg').value };
  try {
    const res = await fetch(`${API}/api/wellness/checkin`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    el.innerHTML = `
      ${infoCard(d.response, 'success')}
      ${d.breathing_exercise?infoCard('🧘 '+d.breathing_exercise, 'accent'):''}
      ${d.urgent_message?infoCard('<b>💙 '+d.urgent_message+'</b>', 'alert'):''}
      ${d.helplines?.length?`<div style="font-size:.82rem;font-weight:700;margin:12px 0 8px">📞 உதவி எண்கள்</div>${d.helplines.map(h=>`<a href="tel:${h.number}" class="info-card alert mt-4" style="display:block;text-decoration:none"><b>${h.name}</b>: ${h.number}</a>`).join('')}`:''}`;
    speak(d.response || "வாணி உங்களுடன் இருக்கிறாள்.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card success mt-12">💚 வாணி உங்களுடன் இருக்கிறாள். நீங்கள் தனியாக இல்லீர்கள்! SNEHI: 044-24640050</div>`; }
}

// =====================================================
// FEATURE 19 — Water Intelligence
// =====================================================
function showWater(params={}) {
  const userCrop = params.crop || (farmer.crops||['paddy'])[0];
  const userDist = params.district || farmer.district || '';
  const userAcres = params.land_size || params.quantity || farmer.land_size || 1;

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">💧 நீர் நுண்ணறிவு</div><div class="modal-title-en">Water Intelligence</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">பயிர்</label>${wrapInputWithMic('wat-crop', 'நெல்...', userCrop)}</div>
  <div class="flex-row">
    <div class="form-row" style="flex:1"><label class="form-label">நிலம் (ஏக்கர்)</label>${wrapInputWithMic('wat-acres', '1', userAcres, 'number')}</div>
    <div class="form-row" style="flex:1"><label class="form-label">மண் வகை</label>
      <select class="form-input form-select" id="wat-soil">
        <option value="red loam">சிவப்பு மண்</option>
        <option value="black cotton">கரிசல்</option>
        <option value="alluvial">வண்டல்</option>
      </select>
    </div>
  </div>
  <div class="form-row"><label class="form-label">தற்போதைய பாசனம்</label>
    <select class="form-input form-select" id="wat-method">
      <option value="flood">வெள்ளம் பாசனம்</option>
      <option value="furrow">வாய்க்கால் பாசனம்</option>
      <option value="sprinkler">தெளிப்பான்</option>
      <option value="drip">சொட்டு நீர்</option>
    </select>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="wat-district">${districtOptions(userDist)}</select></div>
  <button class="btn-primary btn-full" onclick="calculateWater()">💧 நீர் கணக்கீடு</button>
  <div id="wat-result"></div>`);

  if (userCrop && userDist) {
    setTimeout(calculateWater, 400);
  }
}

async function calculateWater() {
  const el = document.getElementById('wat-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">💧</div></div>';
  const body = {
    farmer_id: farmer.farmer_id||'',
    crop: document.getElementById('wat-crop').value,
    acres: parseFloat(document.getElementById('wat-acres').value)||1,
    soil_type: document.getElementById('wat-soil').value,
    irrigation_method: document.getElementById('wat-method').value,
    district: document.getElementById('wat-district').value,
  };
  try {
    const res = await fetch(`${API}/api/water/calculate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const irrigateClass = d.should_irrigate ? 'badge-high' : 'badge-low';
    el.innerHTML = `
      <div class="result-card mt-12">
        <div class="result-label">இன்றைய தண்ணீர் தேவை</div>
        <div class="price-big">${(d.water_needed_liters||0).toLocaleString()}</div>
        <div class="price-unit">லிட்டர்</div>
        <div class="mt-12"><span class="badge ${irrigateClass}">${d.should_irrigate?'✅ இன்று பாசனம் செய்யுங்கள்':'⏭️ இன்று பாசனம் தேவையில்லை'}</span></div>
        <div class="text-muted mt-8" style="font-size:.85rem">${d.reason||''}</div>
      </div>
      ${d.calculation_explanation ? infoCard('<b>💡 அறிவியல் விளக்கம் (AI Logic):</b><br>'+d.calculation_explanation, 'accent') : ''}
      ${d.electricity_wasted_inr?infoCard('<b>⚠️ வீண் செலவு:</b> ₹'+d.electricity_wasted_inr+' மின்சாரம் வீணடிக்கப்படுகிறது', 'alert'):''}
      ${d.drip_savings_monthly_inr?infoCard('<b>💰 சொட்டு நீர்பாசனம் மூலம் மாத சேமிப்பு: ₹'+d.drip_savings_monthly_inr+'</b><br>முதல் திரும்ப கிடைக்க '+(d.drip_roi_months||18)+' மாதங்கள்', 'success'):''}
      ${d.tips?infoCard('💡 '+d.tips):''}`;
    speak(`இன்று ${(d.water_needed_liters||0).toLocaleString()} லிட்டர் தண்ணீர் தேவை. ${d.should_irrigate?'இன்று பாசனம் செய்யுங்கள்.':'இன்று பாசனம் தேவையில்லை.'}`, null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 20 — Government Dashboard
// =====================================================
function showGovtDashboard() {
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">📡 அரசு நுண்ணறிவு தளம்</div><div class="modal-title-en">Government Intelligence Dashboard</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row">
    <label class="form-label">மாவட்டம் / District</label>
    <select class="form-input form-select" id="gov-filter-dist" onchange="fetchGovtDashboard()">
      <option value="">அனைத்து மாவட்டங்கள் / All</option>
      ${districtOptions(farmer.district||'')}
    </select>
  </div>
  <div class="loading-state"><div class="loading-leaf">📊</div><div class="loading-text">தரவு திரட்டப்படுகிறது...</div></div>
  <div id="gov-result" style="display:none"></div>`);
  fetchGovtDashboard();
}

async function fetchGovtDashboard() {
  const el = document.getElementById('gov-result');
  const dist = document.getElementById('gov-filter-dist').value;
  try {
    const res = await fetch(`${API}/api/dashboard/overview?district=${encodeURIComponent(dist)}`);
    const d = await res.json();
    document.querySelector('.loading-state').style.display = 'none';
    el.style.display = 'block';
    el.innerHTML = `
      <div class="flex-row mb-12" style="flex-wrap:wrap">
        <div class="result-card" style="flex:1;min-width:120px"><div class="result-label">பதிவான விவசாயிகள்</div><div class="result-value">${(d.total_farmers_registered||0).toLocaleString()}</div></div>
        <div class="result-card" style="flex:1;min-width:120px"><div class="result-label">செயலில் மாவட்டங்கள்</div><div class="result-value">${d.active_districts||0}</div></div>
      </div>
      <div class="info-card alert mt-8"><b>🐛 பூச்சி வெடிப்பு மண்டலங்கள்:</b><br>${(d.pest_outbreak_zones||[]).join('<br>')}</div>
      <div class="info-card alert mt-8"><b>💰 விலை கையாடல் எச்சரிக்கை:</b><br>${(d.price_manipulation_alerts||[]).join('<br>')}</div>
      <div class="info-card accent mt-8"><b>💧 நீர் அழுத்த மாவட்டங்கள்:</b><br>${(d.water_stress_districts||[]).join(', ')}</div>
      ${infoCard('<b>♻️ கழிவு மாற்றம்:</b> ' + (d.total_waste_converted_kg||0).toLocaleString() + 'கிலோ | CO₂ மிச்சம்: ' + (d.co2_saved_kg||0).toLocaleString() + 'கிலோ', 'success')}
      <div style="font-size:.82rem;font-weight:700;margin:12px 0 8px">திட்ட பயன்பாடு</div>
      ${Object.entries(d.scheme_utilization||{}).map(([k,v])=>`<div class="mandi-card mt-4"><div class="mandi-name">${k}</div><div class="mandi-price">${v}</div></div>`).join('')}
      <button class="btn-primary btn-full mt-16" onclick="alert('CSV ஏற்றுமதி தயாரிக்கப்படுகிறது...')">📥 CSV ஏற்றுமதி</button>`;
  } catch(e) {
    document.querySelector('.loading-state').style.display = 'none';
    el.style.display = 'block';
    el.innerHTML = `<div class="info-card alert">⚠️ Backend offline.</div>`;
  }
}

// =====================================================
// FEATURE 21 — Farmer Community Group
// =====================================================
function showCommunity() {
  const defaultCrop = (farmer.crops && farmer.crops.length > 0) ? farmer.crops[0] : 'paddy';
  const defaultDistrict = farmer.district || 'All Districts';
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">👥 உழவர் சமூகம்</div><div class="modal-title-en">Farmer Community</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="comm-district">${districtOptions(defaultDistrict)}</select></div>
  <div class="form-row"><label class="form-label">பயிர் / Crop</label><input class="form-input" id="comm-crop" value="${defaultCrop}"></div>
  <button class="btn-primary btn-full mb-12" onclick="loadCommunityPosts()">🔄 செய்திகளைப் பார்க்க</button>
  
  <div style="background:var(--bg-light); padding:12px; border-radius:12px; margin-bottom:12px; border:1px solid rgba(0,0,0,0.05);">
    <div class="form-row">${wrapTextareaWithMic('comm-msg', 'கேள்வி அல்லது தகவலை பகிரவும்...', '')}</div>
    <button class="btn-primary btn-full mt-2" style="background:var(--accent-dark);" onclick="postCommunityMessage(this)">📤 செய்தி அனுப்பு</button>
  </div>
  
  <div id="comm-result"></div>`);
  loadCommunityPosts();
}

async function loadCommunityPosts() {
  const el = document.getElementById('comm-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const district = document.getElementById('comm-district').value;
  const crop = document.getElementById('comm-crop').value;
  
  try {
    const res = await fetch(`${API}/api/community/posts?district=${encodeURIComponent(district)}&crop=${encodeURIComponent(crop)}`);
    const d = await res.json();
    const posts = (d.posts||[]).map(p => {
      const isMe = p.farmer_id === farmer.farmer_id;
      return `<div class="info-card mt-8" style="background:${isMe?'#e8f5e9':'#fff'}; border:1px solid ${isMe?'var(--success)':'#eee'};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:var(--primary); font-size:0.9rem;">🧑‍🌾 ${p.name}</strong>
          <span style="font-size:0.75rem; color:#888;">${new Date(p.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="font-size:0.95rem; line-height:1.5;">${p.message}</div>
      </div>`;
    }).join('');
    
    if (posts) {
      el.innerHTML = posts;
    } else {
      el.innerHTML = `<div class="info-card text-center mt-12 text-muted">இந்த பகுதியில் இன்னும் செய்திகள் இல்லை. நீங்களே முதல் செய்தியை அனுப்பலாம்!</div>`;
    }
  } catch(e) {
    el.innerHTML = `<div class="info-card alert">⚠️ இணைப்பில் பிழை. Backend இயங்குகிறதா என சரிபார்க்கவும்.</div>`;
  }
}

async function postCommunityMessage(btn) {
  const msgInput = document.getElementById('comm-msg');
  const message = msgInput.value.trim();
  const district = document.getElementById('comm-district').value;
  const crop = document.getElementById('comm-crop').value;

  if (!message) return;

  if (btn) btn.innerHTML = '<span class="spinner"></span>';
  
  const body = {
    farmer_id: farmer.farmer_id || 'anonymous',
    name: farmer.name || 'விவசாயி',
    district: district,
    crop: crop,
    message: message
  };

  try {
    await fetch(`${API}/api/community/post`, {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    msgInput.value = '';
    loadCommunityPosts();
  } catch(e) {
    alert('பிழை. செய்தி அனுப்ப முடியவில்லை.');
  } finally {
    if (btn) btn.innerHTML = '📤 செய்தி அனுப்பு';
  }
}

// =====================================================
// FEATURE 22 — SHG Hub
// =====================================================
function showSHGHub() {
  const village = farmer.village || 'புதுக்கோட்டை';
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🏘️ SHG குழு மையம்</div><div class="modal-title-en">SHG Village Hub</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="info-card success">உங்கள் கிராமத்தில் (${village}) உள்ள SHG குழுக்கள்.</div>
  <div id="shg-list" class="mt-12">
    <div class="scheme-card mt-8">
      <div style="font-weight:800;color:var(--primary)">🌹 ரோஜா SHG</div>
      <div class="text-muted" style="font-size:.82rem">சேமிப்பு & தையல் பயிற்சி</div>
      <button class="btn-primary btn-full mt-8" onclick="joinSHGChat('ரோஜா SHG')">குழுவில் சேர</button>
    </div>
    <div class="scheme-card mt-8">
      <div style="font-weight:800;color:var(--primary)">🌾 பசும்பொன் SHG</div>
      <div class="text-muted" style="font-size:.82rem">சிறு தானிய உற்பத்தி</div>
      <button class="btn-primary btn-full mt-8" onclick="joinSHGChat('பசும்பொன் SHG')">குழுவில் சேர</button>
    </div>
  </div>
  <div id="shg-chat" style="display:none"></div>`);
}

function joinSHGChat(shgName) {
  const el = document.getElementById('shg-chat');
  document.getElementById('shg-list').style.display = 'none';
  el.style.display = 'block';
  el.innerHTML = `
    <button class="btn-primary" style="background:#888; padding:4px 12px; font-size:0.75rem; border-radius:12px; margin-bottom:12px;" onclick="showSHGHub()">← பின்செல்ல</button>
    <div style="font-weight:700; color:var(--primary); margin-bottom:8px;">${shgName} Group Chat</div>
    <div id="shg-messages" style="height:250px; overflow-y:auto; padding:10px; background:rgba(0,0,0,0.02); border-radius:12px; margin-bottom:12px; scroll-behavior: smooth;">
      <div style="text-align:left; margin-bottom:12px;"><strong style="font-size:0.7rem; color:var(--accent);">கனிமொழி:</strong><br><span style="background:#fff; padding:6px 12px; border-radius:12px; font-size:0.85rem; border:1px solid #eee;">நாளை கடன் தள்ளுபடி பற்றி மீட்டிங் இருக்கு.</span></div>
      <div style="text-align:left; margin-bottom:12px;"><strong style="font-size:0.7rem; color:var(--accent);">உமா:</strong><br><span style="background:#fff; padding:6px 12px; border-radius:12px; font-size:0.85rem; border:1px solid #eee;">👍 சரி வரேன்.</span></div>
    </div>
    <div class="flex-row">
       <button class="btn-primary" style="background:var(--accent-dark); padding:10px 14px;" onclick="sendVoiceMessage()">🎙️</button>
       <div style="flex:1; margin-left:8px;">${wrapInputWithMic('shg-input', 'செய்தி...', '')}</div>
    </div>
    <button class="btn-primary btn-full mt-4" onclick="sendSHGMsg()">அனுப்பு / Send</button>`;
}

function sendSHGMsg() {
  const inp = document.getElementById('shg-input');
  const msg = inp.value;
  if(!msg) return;
  const area = document.getElementById('shg-messages');
  area.innerHTML += `<div style="text-align:right; margin-top:12px;"><strong style="font-size:0.7rem; color:var(--primary);">நீங்க:</strong><br><span style="background:var(--primary); color:#fff; padding:6px 12px; border-radius:12px; font-size:0.85rem;">${msg}</span></div>`;
  inp.value = '';
  area.scrollTop = area.scrollHeight;
}

function sendVoiceMessage() {
  const area = document.getElementById('shg-messages');
  area.innerHTML += `<div style="text-align:right; margin-top:12px;"><strong style="font-size:0.7rem; color:var(--primary);">நீங்க:</strong><br><span style="background:var(--primary); color:#fff; padding:8px 16px; border-radius:12px; font-size:0.85rem; display:inline-flex; align-items:center;">🎙️ Voice Message 0:04</span></div>`;
  area.scrollTop = area.scrollHeight;
  speak("குரல் செய்தி அனுப்பப்பட்டது.");
}
