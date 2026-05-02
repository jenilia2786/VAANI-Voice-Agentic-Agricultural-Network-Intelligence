// =====================================================
// FEATURE 13 — Weather & Crop Calendar
// =====================================================
function showWeather(params={}) {
  const userDist = params.district || farmer.district || 'Chennai';
  const userCrop = params.crop || (farmer.crops||[''])[0];

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🌤️ வானிலை & பயிர் நாட்காட்டி</div><div class="modal-title-en">Weather & Crop Calendar</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">மாவட்டம்</label><select class="form-input form-select" id="wx-district">${districtOptions(userDist)}</select></div>
  <div class="form-row"><label class="form-label">பயிர் (விரிவான ஆலோசனைக்கு)</label><input class="form-input" id="wx-crop" value="${userCrop}" placeholder="நெல், தக்காளி..."></div>
  <button class="btn-primary btn-full" onclick="fetchWeather()">🌤️ வானிலை பெறுக</button>
  <div id="wx-result"></div>`);

  if (userDist || params.problem) {
    setTimeout(fetchWeather, 400);
  }
}

async function fetchWeather() {
  const el = document.getElementById('wx-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">வானிலை தரவு பெறப்படுகிறது...</div></div>';
  const district = document.getElementById('wx-district').value;
  const crop = document.getElementById('wx-crop').value;
  try {
    const res = await fetch(`${API}/api/weather/forecast?district=${encodeURIComponent(district)}&crop=${encodeURIComponent(crop)}`);
    const d = await res.json();
    const forecast = (d.forecast||[]).slice(0,7);
    const rows = forecast.map(day=>`
      <div class="weather-day">
        <div class="weather-date-col">${day.date?.slice(5)||''}</div>
        <div class="weather-icon-col">${day.description?.split(' ')[0]||'🌤️'}</div>
        <div class="weather-desc-col">${day.description?.split(' ').slice(1).join(' ')||''}</div>
        <div class="weather-rain">${day.rainfall_mm>0?day.rainfall_mm+'mm':''}</div>
        <div class="weather-temp">${day.max_temp||30}°</div>
      </div>`).join('');
    const calHtml = d.crop_calendar?.daily_advice ? d.crop_calendar.daily_advice.slice(0,3).map(a=>`<div class="info-card mt-8"><b>${a.date||''}:</b> ${a.advice||''}<br>${a.do?'✅ '+a.do:''} ${a.avoid?'<br>❌ '+a.avoid:''}</div>`).join('') : '';
    el.innerHTML = `
      ${d.disaster_alert?infoCard(d.alert_message, 'alert'):''}
      <div class="result-card mt-12">${rows}</div>
      ${calHtml ? `<div style="font-size:.82rem;font-weight:700;margin:12px 0 8px">📅 பண்ணை ஆலோசனை</div>${calHtml}` : ''}`;
    speak(d.alert_message || "வானிலை தரவு பெறப்பட்டது.", null, true);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}

// =====================================================
// FEATURE 14 — Legal Shield
// =====================================================
function showLegal(params={}) {
  const issues = ['land_dispute','scheme_rejection','buyer_fraud','domestic_violence','moneylender','general'];
  const issueTa = ['நிலத் தகராறு','திட்ட நிராகரிப்பு','வாங்குபவர் மோசடி','குடும்ப வன்முறை','பண கடன் துன்புறுத்தல்','பொது சட்ட உதவி'];
  const userProblem = params.problem || '';
  const userIssue = params.issue_type || 'general';

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">⚖️ சட்ட கேடயம்</div><div class="modal-title-en">Legal Shield</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="form-row"><label class="form-label">பிரச்னை வகை / Issue Type</label>
    <select class="form-input form-select" id="legal-issue">
      ${issues.map((v,i)=>`<option value="${v}" ${v===userIssue?'selected':''}>${issueTa[i]}</option>`).join('')}
    </select>
  </div>
  <div class="form-row"><label class="form-label">உங்கள் பிரச்னையை விவரிக்கவும்</label>
    ${wrapTextareaWithMic('legal-problem', 'உங்கள் பிரச்னையை தமிழிலோ ஆங்கிலத்திலோ சொல்லுங்கள்...', userProblem)}
  </div>
  <button class="btn-primary btn-full mt-4" onclick="getLegalAdvice()">⚖️ சட்ட ஆலோசனை பெறுக</button>
  <div id="legal-result"></div>`);

  if (userProblem) {
    setTimeout(getLegalAdvice, 400);
  }
}

async function getLegalAdvice() {
  const el = document.getElementById('legal-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">VAANI சட்ட நிபுணர்...</div></div>';
  const body = {
    problem: document.getElementById('legal-problem').value||'பொது சட்ட உதவி தேவை',
    issue_type: document.getElementById('legal-issue').value,
    farmer_id: farmer.farmer_id||'',
    district: farmer.district||'',
  };
  try {
    const res = await fetch(`${API}/api/legal/advice`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    const adv = d.advice;
    const hlHtml = (d.helplines||[]).map(h=>`<div class="mandi-card mt-4"><div><div class="mandi-name">${h.name}</div><a href="tel:${h.number}" class="mandi-price" style="color:var(--primary)">📞 ${h.number}</a></div></div>`).join('');
    
    let steps = '';
    if (Array.isArray(adv.action_plan)) {
      steps = adv.action_plan.map(s=> `<div class="info-card mt-2">${s}</div>`).join('');
    } else if (adv.action_plan) {
      steps = `<div class="info-card mt-2">${adv.action_plan}</div>`;
    }

    el.innerHTML = `
      ${infoCard('<b>⚖️ உங்கள் உரிமைகள்:</b><br>' + adv.rights_explained, 'success')}
      <div style="font-size:.82rem;font-weight:700;margin:12px 0 4px">📋 நடவடிக்கை திட்டம்:</div>
      ${steps}
      ${adv.time_limits ? infoCard('<b>⏰ நேர வரம்பு:</b> ' + adv.time_limits, 'accent') : ''}
      ${adv.important_note ? infoCard('<b>📌 குறிப்பு:</b> ' + adv.important_note) : ''}
      <div style="font-size:.82rem;font-weight:700;margin:16px 0 8px">📞 உதவி எண்கள்</div>
      ${hlHtml}`;
    speak(adv.spoken_response || adv.important_note || "சட்ட ஆலோசனை வழங்கப்பட்டது.", null, true);
  } catch(e) { 
    console.error(e);
    el.innerHTML = `<div class="info-card alert" style="font-size: 0.8rem; overflow-wrap: break-word;">⚠️ பிழை: ${e.message} <br/><br/> ${e.stack}</div>`; 
  }
}

// =====================================================
// FEATURE 15 — Disaster Response
// =====================================================
function showDisaster(params={}) {
  const userDis = params.disaster_type || 'flood';
  const userCrop = params.crop || (farmer.crops||['paddy'])[0];

  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">🆘 பேரிடர் மீட்பு</div><div class="modal-title-en">Disaster Response</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="info-card"><b>📸 முதலில் — இப்போதே ஆவணப்படுத்துங்கள்!</b><br>பேரிடர் வருவதற்கு முன்பே உங்கள் பண்ணையை ஆவணப்படுத்துங்கள்</div>
  <div class="form-row mt-12"><label class="form-label">பேரிடர் வகை</label>
    <select class="form-input form-select" id="dis-type">
      <option value="flood" ${userDis==='flood'?'selected':''}>வெள்ளம் / Flood</option>
      <option value="drought" ${userDis==='drought'?'selected':''}>வறட்சி / Drought</option>
      <option value="cyclone" ${userDis==='cyclone'?'selected':''}>புயல் / Cyclone</option>
      <option value="hailstorm" ${userDis==='hailstorm'?'selected':''}>ஆலங்கட்டி மழை</option>
      <option value="fire" ${userDis==='fire'?'selected':''}>தீ விபத்து</option>
    </select>
  </div>
  <div class="form-row"><label class="form-label">விவரம்</label><textarea class="form-input" id="dis-desc" rows="3" placeholder="பண்ணை நிலை விவரிக்கவும்...">${params.problem||params.description||''}</textarea></div>
  <button class="btn-primary btn-full" onclick="documentFarm()">📸 பண்ணையை ஆவணப்படுத்து</button>
  <div class="divider"></div>
  <div style="font-size:.88rem;font-weight:700;color:var(--alert);margin-bottom:8px">பேரிடர் பிறகு — கோரிக்கை தாக்கல்</div>
  <div class="form-row"><label class="form-label">பயிர்</label><input class="form-input" id="dis-crop" value="${userCrop}"></div>
  <div class="form-row"><label class="form-label">பாதிக்கப்பட்ட நிலம் (ஏக்கர்)</label><input class="form-input" id="dis-area" type="number" placeholder="ஏக்கர்" value="${params.area||''}"></div>
  <button class="btn-primary btn-full" style="background:var(--alert)" onclick="fileClaim()">🆘 கோரிக்கை தாக்கல் செய்க</button>
  <div id="dis-result"></div>`);

  if (params.problem || params.area || params.disaster_type) {
    setTimeout(fileClaim, 400);
  }
}

async function documentFarm() {
  const el = document.getElementById('dis-result');
  const body = {
    farmer_id: farmer.farmer_id||'demo',
    disaster_type: document.getElementById('dis-type').value,
    description: document.getElementById('dis-desc').value,
  };
  try {
    const res = await fetch(`${API}/api/disaster/document`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    el.innerHTML = `<div class="info-card success mt-12">✅ ${d.message||'ஆவணம் பதிவாகியுள்ளது!'}<br><small>நேர முத்திரை: ${d.timestamp?.slice(0,19).replace('T',' ')||''}</small></div>`;
  } catch(e) { el.innerHTML = `<div class="info-card success mt-12">✅ ஆவணம் பதிவாகியுள்ளது! (offline)</div>`; }
}

async function fileClaim() {
  const el = document.getElementById('dis-result');
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  const body = {
    farmer_id: farmer.farmer_id||'demo',
    disaster_type: document.getElementById('dis-type').value,
    date: new Date().toISOString().split('T')[0],
    crop_type: document.getElementById('dis-crop').value,
    area_affected: parseFloat(document.getElementById('dis-area').value)||1,
  };
  try {
    const res = await fetch(`${API}/api/disaster/claim`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d = await res.json();
    el.innerHTML = `
      <div class="result-card mt-12">
        <div class="result-label">கோரிக்கை எண்</div>
        <div class="result-value" style="font-size:1rem">${d.claim_number||''}</div>
        <div class="result-label mt-8">மதிப்பீட்டு இழப்பீடு</div>
        <div class="result-value text-accent">₹${(d.compensation_estimate_inr||0).toLocaleString()}</div>
      </div>
      <div class="info-card mt-8"><b>📋 ஆவணங்கள் தேவை:</b><br>${(d.documents_checklist||[]).join('<br>')}</div>
      ${(d.submission_steps||[]).map(s=>`<div class="info-card mt-4">${s}</div>`).join('')}`;
    speak(`உங்கள் கோரிக்கை எண் ${d.claim_number}. மதிப்பீட்டு இழப்பீடு ${d.compensation_estimate_inr} ரூபாய்.`);
  } catch(e) { el.innerHTML = `<div class="info-card alert">⚠️ பிழை.</div>`; }
}
