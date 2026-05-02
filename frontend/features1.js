// =====================================================
// FEATURE 1 — Crop Disease Detector
// =====================================================
function showCropDisease(params={}) {
  const userCrop = params.crop || '';
  const problem = params.problem || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🔬 பயிர் நோய் கண்டறிதல்</div><div class="modal-title-en">Crop Disease Detector</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="upload-area" onclick="document.getElementById('crop-img-input').click()">
    <div class="upload-icon">📷</div>
    <div class="upload-text">படம் எடுக்கவும் அல்லது பதிவேற்றவும்<br><small>Take photo or upload image</small></div>
    <input type="file" id="crop-img-input" accept="image/*" capture="environment" style="display:none" onchange="previewCropImage(event)">
  </div>
  <div id="crop-preview" style="display:none;margin-top:12px;text-align:center">
    <img id="crop-preview-img" style="max-width:100%;border-radius:12px;max-height:200px;object-fit:cover">
  </div>
  <div class="form-row mt-12">
    <label class="form-label">பயிர் வகை / Crop Type</label>
    ${wrapInputWithMic('crop-type-input', 'நெல், தக்காளி, பருத்தி...', userCrop)}
  </div>
  <div class="form-row">
    <label class="form-label">பிரச்சனை விவரம் (Optional)</label>
    ${wrapTextareaWithMic('crop-problem-desc', 'இலைகளில் மஞ்சள் புள்ளிகள், பூச்சிகள்...', problem)}
  </div>
  <button class="btn-primary btn-full mt-4" onclick="analyzeCropDisease()">🔬 பகுப்பாய்வு செய்க / Analyze</button>
  <div id="crop-result"></div>`);

  if (problem) {
    setTimeout(() => {
      const el = document.getElementById('crop-result');
      el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">உங்கள் விவரங்களை ஆராய்கிறேன்...</div></div>';
      analyzeCropDiseaseText(userCrop, problem);
    }, 500);
  }
}

function previewCropImage(e) {
  const file = e.target.files[0]; if(!file) return;
  const img = document.getElementById('crop-preview-img');
  const prev = document.getElementById('crop-preview');
  img.src = URL.createObjectURL(file); prev.style.display = 'block';
}

async function analyzeCropDisease() {
  const input = document.getElementById('crop-img-input');
  const cropType = document.getElementById('crop-type-input').value || '';
  const resultEl = document.getElementById('crop-result');
  if (!input.files[0]) { resultEl.innerHTML = '<div class="info-card alert">படம் தேர்ந்தெடுக்கவும்!</div>'; return; }
  resultEl.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">VAANI பகுப்பாய்வு செய்கிறது...</div></div>';
  const fd = new FormData();
  fd.append('image', input.files[0]);
  fd.append('crop_type', cropType);
  if (farmer.farmer_id) fd.append('farmer_id', farmer.farmer_id);
  try {
    const res = await fetch(`${API}/api/crop/diagnose`, {method:'POST', body:fd});
    const d = await res.json();
    renderDiagnosisResult(d, resultEl);
  } catch(e) {
    resultEl.innerHTML = `<div class="info-card alert">⚠️ தொடர்பு இல்லை. Backend இயங்குகிறதா என சரிபார்க்கவும்.</div>`;
  }
}

async function analyzeCropDiseaseText(crop, problem) {
  const resultEl = document.getElementById('crop-result');
  const fd = new FormData();
  fd.append('crop_type', crop);
  fd.append('problem_description', problem);
  if (farmer.farmer_id) fd.append('farmer_id', farmer.farmer_id);
  try {
    const res = await fetch(`${API}/api/crop/diagnose-text`, {method:'POST', body:fd});
    const d = await res.json();
    renderDiagnosisResult(d, resultEl);
  } catch(e) {
    resultEl.innerHTML = `<div class="info-card alert">⚠️ பிழை ஏற்பட்டது.</div>`;
  }
}

function renderDiagnosisResult(d, resultEl) {
  const sev = d.severity||'medium';
  const sevClass = sev==='low'?'badge-low':sev==='high'?'badge-high':sev==='critical'?'badge-critical':'badge-medium';
  
  if (d.needs_image) {
    resultEl.innerHTML = `
      <div class="result-card mt-12" style="border-left-color: #f44336; background: #fffde7;">
        <div class="result-label" style="color: #d32f2f;">விவரங்கள் தேவை / Need More Info</div>
        <div class="result-value">சரியாக என்னன்னு இப்போதைக்கு சொல்ல முடியல</div>
      </div>
      <div class="info-card alert mt-12">
        <b>💡 வாணியின் ஆலோசனை:</b> தவறான மருந்தை கொடுக்க நான் விரும்பவில்லை ${h()}. நீங்க அந்த பயிர் இலையை ஒரு தெளிவான புகைப்படம் எடுத்து அனுப்புங்க, அப்பதான் என்ன நோய்ன்னு துல்லியமா சொல்ல முடியும்.
      </div>
      <button class="btn-primary btn-full mt-8" style="background:#f9a825;" onclick="document.getElementById('crop-img-input').click()">📸 புகைப்படம் எடுக்கவும் (Take Photo)</button>
      <button class="btn-primary btn-full mt-12" style="background:#555; border:none;" onclick="closeModal()">❌ மூடுக</button>
    `;
    speak(`${h()}, நீங்க சொன்ன தகவல மட்டும் வெச்சு என்ன நோய்ன்னு என்னால சரியா சொல்ல முடியல. தப்பா ஏதாவது சொல்லி உங்க பயிருக்கு பாதிப்பு வரக்கூடாதுன்னு நான் நினைக்கிறேன். அதனால, தயவுசெஞ்சு அந்த இலைல ஒரு தெளிவான போட்டோ எடுத்து போடுங்க, நான் உடனே என்னன்னு பாத்து தெளிவா சொல்றேன்.`, null, true);
    return;
  }

  resultEl.innerHTML = `
    <div class="result-card mt-12">
      <div class="result-label">நோய் பெயர் / Disease</div>
      <div class="result-value">${d.disease_name||'கண்டறியப்பட்டது'}</div>
      <span class="badge ${sevClass} mt-8">${sev.toUpperCase()}</span>
    </div>
    ${d.is_text_based ? infoCard('<b>💡 இது ஒரு ஆரம்ப கட்ட கணிப்பு மட்டுமே.</b> துல்லியமான முடிவுக்கு ஒரு புகைப்படம் எடுக்கவும்.', 'alert', false) : ''}
    ${infoCard('<b>🌿 இயற்கை மருத்துவம்:</b><br>'+d.organic_remedy, 'success')}
    ${infoCard('<b>💊 ரசாயன மருத்துவம்:</b><br>'+d.chemical_remedy)}
    ${d.explanation ? infoCard('<b>💡 விளக்கம் / Explanation:</b><br>'+d.explanation, 'accent') : ''}
    ${d.cost_estimate ? infoCard('<b>💰 செலவு மதிப்பீடு:</b> '+d.cost_estimate, 'accent') : ''}
    ${infoCard('<b>🛡️ தடுப்பு குறிப்புகள்:</b><br>'+d.prevention_tips)}
    <div style="margin-top: 24px; display: flex; gap: 12px;">
      <button class="btn-primary btn-full" style="background:#555; border:none;" onclick="closeModal()">❌ மூடுக / Close</button>
      <button class="btn-primary btn-full" style="background:#f9a825; color: #1a2e1a;" onclick="document.getElementById('crop-img-input').click()">📸 மீண்டும் புகைப்படம் எடு</button>
    </div>`;
  
  let speechText = "";
  if (d.is_text_based) {
    speechText = `அம்மா, நீங்க சொன்னத வெச்சு பாத்தா இது ${d.disease_name} போல தெரியுது. இதுக்கு நீங்க ${d.organic_remedy} செய்யலாம். முடிஞ்சா ஒரு போட்டோ எடுத்து போடுங்கம்மா, நான் இன்னும் தெளிவா சொல்றேன்.`;
  } else {
    speechText = `அம்மா, இந்த போட்டோல இருக்குறது ${d.disease_name}. பயப்படாதிங்க, இத ${d.organic_remedy} செஞ்சு சரி பண்ணிடலாம்.`;
  }
  speak(speechText, null, true);
}

// =====================================================
// FEATURE 2 — Market Truth Engine
// =====================================================
function showMarketPrices(params={}) {
  const crops = ['paddy','rice','tomato','onion','banana','sugarcane','cotton','groundnut','chilli','turmeric','maize','black gram','green gram','coconut','ginger','garlic'];
  
  // Map common tamil names to english just in case AI returns tamil
  const tamilToEng = {
    'நெல்': 'paddy', 'தக்காளி': 'tomato', 'வெங்காயம்': 'onion', 'அரிசி': 'rice', 'பருத்தி': 'cotton',
    'மஞ்சள்': 'turmeric', 'மிளகாய்': 'chilli', 'வாழை': 'banana', 'தேங்காய்': 'coconut', 'மக்காச்சோளம்': 'maize'
  };
  
  let passedCrop = (params.crop || '').toLowerCase().trim();
  if (tamilToEng[passedCrop]) passedCrop = tamilToEng[passedCrop];
  
  const cropOpts = crops.map(c=>`<option value="${c}" ${c===passedCrop?'selected':''}>${c}</option>`).join('');
  
  let userDist = params.district || farmer.district || '';
  // Basic tamil district mapping
  if (userDist === 'கரூர்') userDist = 'Karur';
  if (userDist === 'மதுரை') userDist = 'Madurai';
  if (userDist === 'சென்னை') userDist = 'Chennai';
  if (userDist === 'கோவை') userDist = 'Coimbatore';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">📊 சந்தை உண்மை இயந்திரம்</div><div class="modal-title-en">Market Truth Engine</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row">
    <label class="form-label">பயிர் / Crop</label>
    <select class="form-input form-select" id="mkt-crop">${cropOpts}</select>
  </div>
  <div class="form-row">
    <label class="form-label">மாவட்டம் / District</label>
    <select class="form-input form-select" id="mkt-district"><option>தேர்ந்தெடுக்கவும்</option>${districtOptions(userDist)}</select>
  </div>
  <button class="btn-primary btn-full" onclick="fetchMarketPrices()">📊 விலை பெறுக</button>
  <div id="mkt-result"></div>`);

  if (passedCrop) {
    setTimeout(fetchMarketPrices, 400);
  }
}

async function fetchMarketPrices() {
  const crop = document.getElementById('mkt-crop').value;
  const district = document.getElementById('mkt-district').value;
  const el = document.getElementById('mkt-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">விலை பெறப்படுகிறது...</div></div>';
  try {
    let url = `${API}/api/market/prices?crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}`;
    const res = await fetch(url);
    const d = await res.json();
    const trend = d.trend_direction==='rising'?'📈 உயரும்':'📉 குறையும்';
    const fraudHtml = d.fraud_alert?.detected ? `<div class="fraud-alert mt-12"><span class="fraud-alert-icon">🚨</span><span class="fraud-alert-text">${d.fraud_alert.message}</span></div>` : '';
    const mandisHtml = (d.mandis||[]).map(m=>`<li class="mandi-item"><div><div class="mandi-name">${m.mandi}</div><div class="mandi-dist">${m.distance_km}km</div></div><div class="mandi-price">₹${m.price}</div></li>`).join('');
    const chartData = d.seven_day_trend||[];
    const unitTa = d.unit === 'kg' ? 'கிலோ' : d.unit === 'quintal' ? 'குவிண்டால்' : d.unit;
    el.innerHTML = `
      ${fraudHtml}
      <div class="result-card mt-12">
        <div class="result-label">இன்றைய விலை / Today's Price</div>
        <div class="price-big">₹${d.current_price}</div>
        <div class="price-unit">ஒரு ${unitTa}</div>
        <div class="mt-8">${trend} &nbsp; <span class="text-muted" style="font-size:.8rem">${d.sell_recommendation_tamil||''}</span></div>
        <button class="speaker-inline-btn" onclick="speak('இன்றைய விலை ${d.current_price} ரூபாய்.')">🔊</button>
      </div>
      <div class="chart-wrap"><canvas id="price-chart" height="140"></canvas></div>
      <div style="font-size:.82rem;font-weight:700;color:var(--text-secondary);margin:12px 0 8px">அருகில் உள்ள மண்டிகள்</div>
      <ul class="mandi-list">${mandisHtml}</ul>`;
    if (chartData.length && window.Chart) {
      const labels = chartData.map((_,i)=>i===chartData.length-1?'இன்று':`-${chartData.length-1-i}நாள்`);
      new Chart(document.getElementById('price-chart'), {
        type:'line',
        data:{labels,datasets:[{label:'விலை (₹)',data:chartData,borderColor:'#1B5E20',backgroundColor:'rgba(27,94,32,0.08)',tension:0.4,fill:true,pointRadius:4,pointBackgroundColor:'#F9A825'}]},
        options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false}}}
      });
    }

    // Native TTS often reads digits directly in Tamil if lang is set.
    // If we want it explicitly, we pass the exact Number.
    const priceAmount = d.current_price;

    // Unified way to get the crop name for speaking
    const cropTranslations = {
        'paddy': 'நெல்', 'rice': 'அரிசி', 'wheat': 'கோதுமை', 'sugarcane': 'கரும்பு', 'cotton': 'பருத்தி',
        'groundnut': 'நிலக்கடலை', 'onion': 'வெங்காயம்', 'tomato': 'தக்காளி', 'banana': 'வாழை', 'coconut': 'தேங்காய்',
        'turmeric': 'மஞ்சள்', 'chilli': 'மிளகாய்', 'maize': 'மக்காச்சோளம்', 'garlic': 'பூண்டு', 'ginger': 'இஞ்சி'
    };
    
    // Fallback: If crop is missing but problem text is present, search for keywords
    let cropEng = document.querySelector('#mkt-crop option:checked') ? document.querySelector('#mkt-crop option:checked').value : crop;
    if (!cropEng && params.problem) {
        const text = params.problem.toLowerCase();
        for (const [eng, tam] of Object.entries(cropTranslations)) {
            if (text.includes(eng) || text.includes(tam)) { 
                cropEng = eng; 
                document.getElementById('mkt-crop').value = eng;
                break; 
            }
        }
    }

    const cropNameTa = cropTranslations[cropEng.toLowerCase()] || cropEng || 'பயிர்';
    const distNameTa = district.replace('Madurai', 'மதுரை').replace('Chennai', 'சென்னை').replace('Coimbatore', 'கோயம்புத்தூர்').replace('Karur', 'கரூர்').replace('Trichy', 'திருச்சி').replace('Tiruchirappalli', 'திருச்சிராப்பள்ளி'); 
    
    const speechText = `இன்று ${distNameTa} சந்தையில், ஒரு கிலோ ${cropNameTa} விலை சுமார் ${priceAmount} ரூபாய்.`;
    speak(speechText, null, true);

  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ Backend இயங்குகிறதா?</div>`; }
}

// =====================================================
// FEATURE 3 — Government Scheme Finder
// =====================================================
function showGovtSchemes(params={}) {
  const userLand = params.land_size || farmer.land_size || 1;
  const userCrop = params.crop || (farmer.crops||['paddy'])[0];
  const userDist = params.district || farmer.district || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🏛️ அரசு திட்ட கண்டுபிடிப்பான்</div><div class="modal-title-en">Govt Scheme Finder</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">நிலப்பரப்பு (ஏக்கர்)</label>${wrapInputWithMic('sch-land', '1', userLand, 'number')}</div>
  <div class="form-row"><label class="form-label">பயிர் வகை</label>${wrapInputWithMic('sch-crop', 'நெல்...', userCrop)}</div>
  <div class="form-row"><label class="form-label">ஆண்டு வருமானம் (₹)</label>${wrapInputWithMic('sch-income', '50000', '50000', 'number')}</div>
  <div class="form-row"><label class="form-label">சாதி பிரிவு</label>
    <select class="form-input form-select" id="sch-caste">
      <option value="general">பொது / General</option>
      <option value="obc">OBC</option>
      <option value="sc">SC</option>
      <option value="st">ST</option>
    </select>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="sch-district">${districtOptions(userDist)}</select></div>
  <label class="checkbox-row mb-12"><input type="checkbox" id="sch-shg" ${farmer.shg_member?'checked':''}><span>SHG உறுப்பினர்</span></label>
  <button class="btn-primary btn-full" onclick="matchSchemes()">🔍 திட்டங்கள் கண்டுபிடி</button>
  <div id="scheme-result"></div>`);

  if (params.crop || params.district) {
    setTimeout(matchSchemes, 400);
  }
}

async function matchSchemes() {
  const el = document.getElementById('scheme-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">VAANI திட்டங்கள் தேடுகிறது...</div></div>';
  const body = {
    farmer_id: farmer.farmer_id,
    land_size: parseFloat(document.getElementById('sch-land').value)||1,
    crop_type: document.getElementById('sch-crop').value||'paddy',
    annual_income: parseFloat(document.getElementById('sch-income').value)||50000,
    caste_category: document.getElementById('sch-caste').value,
    district: document.getElementById('sch-district').value||'Chennai',
    shg_member: document.getElementById('sch-shg').checked,
    bank_account: true
  };
  try {
    const res = await fetch(`${API}/api/schemes/match`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await res.json();
    const schemes = data.schemes||[];
    el.innerHTML = `<div class="mt-12" style="font-size:.85rem;color:var(--success);font-weight:700">✅ ${schemes.length} திட்டங்கள் கிடைத்தன!</div>` +
      schemes.map(s=>`
        <div class="scheme-card mt-12 info-with-speaker">
          <div class="scheme-name-ta">${s.scheme_name_tamil||s.scheme_name_english||''}</div>
          <div class="scheme-name-en">${s.scheme_name_english||''}</div>
          <div class="scheme-benefit">💰 ${s.benefit_amount||'விவரங்கள் கிடைக்கவில்லை'}</div>
          <div class="scheme-docs"><b>ஆவணங்கள்:</b> ${Array.isArray(s.documents_needed)?s.documents_needed.join(', '):s.documents_needed||'—'}</div>
          ${s.eligibility_reason ? `<div class="info-card mt-8" style="background:#f1f8e9; border:none; padding:8px; font-size:0.8rem"><b>💡 ஏன் நான் தகுதியானவர்?</b><br>${s.eligibility_reason}</div>` : ''}
          <div class="scheme-docs mt-8"><b>விண்ணப்ப முறை:</b> ${s.application_process||'—'}</div>
          ${s.apply_url?`<a href="${s.apply_url}" target="_blank" class="scheme-apply-btn">விண்ணப்பிக்கவும் 🔗</a>`:''}
          <button class="speaker-inline-btn" style="top:20px" onclick="speak('${(s.scheme_name_tamil||s.scheme_name_english||'').replace(/'/g,"\\'")} - ${s.benefit_amount?.replace(/'/g,"\\'")}')">🔊</button>
        </div>`).join('');
    speak(`உங்களுக்காக ${schemes.length} அரசு திட்டங்கள் கண்டறியப்பட்டுள்ளன.`, null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை ஏற்பட்டது.</div>`; }
}

// =====================================================
// FEATURE 4 — Collective Sale Organizer
// =====================================================
function showCollective(params={}) {
  const userCrop = params.crop || '';
  const userQty = params.quantity || '';
  const userDist = params.district || farmer.district || '';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🤝 கூட்டு விற்பனை ஏற்பாடு</div><div class="modal-title-en">Collective Sale Organizer</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">பெயர்</label><input class="form-input" id="col-name" value="${farmer.name||''}"></div>
  <div class="form-row"><label class="form-label">பயிர் / Crop</label>${wrapInputWithMic('col-crop', 'நெல், வெங்காயம்...', userCrop)}</div>
  <div class="form-row"><label class="form-label">அளவு (கிலோ) / Qty (kg)</label>${wrapInputWithMic('col-qty', '500', userQty, 'number')}</div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="col-district">${districtOptions(userDist)}</select></div>
  <div class="form-row"><label class="form-label">கிராமம் / Village</label>${wrapInputWithMic('col-village', 'கிராமம் பெயர்', '')}</div>
  <button class="btn-primary btn-full mt-4" onclick="joinCollective()">🤝 கூட்டில் சேர</button>
  <div id="col-result"></div>`);

  if (userCrop && userQty) {
    setTimeout(joinCollective, 400);
  }
}

async function joinCollective() {
  const el = document.getElementById('col-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = {
    farmer_id: farmer.farmer_id||'demo',
    name: document.getElementById('col-name').value,
    crop: document.getElementById('col-crop').value,
    quantity: parseFloat(document.getElementById('col-qty').value)||100,
    district: document.getElementById('col-district').value,
    village: document.getElementById('col-village').value,
  };
  try {
    const res = await fetch(`${API}/api/collective/join`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const cs = d.collective_status||{};
    const matched = cs.buyer_matched;
    el.innerHTML = `
      <div class="result-card mt-12 ${matched?'':''}">
        <div class="result-label">கூட்டு நிலை / Collective Status</div>
        <div class="result-value ${matched?'text-primary':'text-accent'}">${cs.status||''}</div>
        <div class="divider"></div>
        <div class="flex-row mt-8">
          <div><div class="result-label">மொத்த அளவு</div><div class="result-value">${cs.total_quantity_kg||0} kg</div></div>
          <div><div class="result-label">விவசாயிகள்</div><div class="result-value">${cs.num_farmers||1}</div></div>
        </div>
      </div>
      ${cs.negotiation_script ? infoCard('<b>🗣️ பேச்சுவார்த்தை ஸ்கிரிப்ட்:</b><br>'+cs.negotiation_script, 'success') : ''}
      <div class="map-placeholder mt-12">🗺️<br><small style="font-size:.8rem;color:var(--text-muted)">வரைபட தொகுப்பு</small></div>`;
    speak(`கூட்டு விற்பனை நிலை: ${cs.status}. இப்போதைக்கு ${cs.total_quantity_kg} கிலோ கிடைச்சிருக்கு.`, null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}
