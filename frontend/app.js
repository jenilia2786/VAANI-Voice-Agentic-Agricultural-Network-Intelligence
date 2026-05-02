// VAANI — app.js
// Dynamic API detection. If running on a different port (like Live Server 5500), point to 8000. 
// If running on 8000 or production, use relative path.
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '8000' && window.location.protocol !== 'file:' 
    ? 'http://localhost:8000' 
    : (window.location.protocol === 'file:' ? 'http://localhost:8000' : '');
let farmer = JSON.parse(localStorage.getItem('vaani_farmer') || '{}');
let recognizing = false;
let recognition = null;
let radioPlaying = false;
let radioIndex = 0;
let fetchedNews = [];

const FEATURES = [
  {id:'crop_disease',icon:'🔬',ta:'பயிர் நோய் கண்டறிதல்',en:'Crop Disease Detector'},
  {id:'market_prices',icon:'📊',ta:'சந்தை உண்மை இயந்திரம்',en:'Market Truth Engine'},
  {id:'govt_schemes',icon:'🏛️',ta:'அரசு திட்ட கண்டுபிடிப்பான்',en:'Govt Schemes'},
  {id:'collective_sale',icon:'🤝',ta:'கூட்டு விற்பனை',en:'Collective Sale'},
  {id:'credit_score',icon:'💳',ta:'விவசாய கடன் மதிப்பெண்',en:'Farm Credit Score'},
  {id:'fake_input',icon:'🔍',ta:'போலி உள்ளீடு கண்டுபிடிப்பான்',en:'Fake Input Detector'},
  {id:'contract',icon:'📄',ta:'ஒப்பந்த பாதுகாவலன்',en:'Contract Reader'},
  {id:'cold_storage',icon:'❄️',ta:'குளிர் சேமிப்பு',en:'Cold Storage'},
  {id:'crop_planning',icon:'🌱',ta:'பயிர் திட்டமிடல்',en:'Crop Planning Oracle'},
  {id:'pest_outbreak',icon:'🐛',ta:'பூச்சி வெடிப்பு கணிப்பான்',en:'Pest Predictor'},
  {id:'waste',icon:'♻️',ta:'கழிவை செல்வமாக்கு',en:'Waste to Wealth'},
  {id:'soil_health',icon:'🌍',ta:'மண் ஆரோக்கிய பாஸ்போர்ட்',en:'Soil Health Passport'},
  {id:'weather',icon:'🌤️',ta:'வானிலை & பயிர் நாட்காட்டி',en:'Weather & Crop Calendar'},
  {id:'legal',icon:'⚖️',ta:'சட்ட கேடயம்',en:'Legal Shield'},
  {id:'disaster',icon:'🆘',ta:'பேரிடர் மீட்பு',en:'Disaster Response'},
  {id:'marketplace',icon:'🛒',ta:'நேரடி சந்தை (D2C)',en:'D2C Marketplace'},
  {id:'shg-hub',icon:'🏘️',ta:'குழு மையம்',en:'SHG Village Hub'},
  {id:'shg_inventory',icon:'📦',ta:'பயன்பாட்டு இருப்பு',en:'Inventory Management'},
  {id:'leader_panel',icon:'👑',ta:'தலைவி மேலாண்மை',en:'Leader Dashboard'},
  {id:'govt-dash',icon:'📡',ta:'அரசு நுண்ணறிவு தளம்',en:'Govt Dashboard'},
  {id:'processing',icon:'🏭',ta:'சிறு பதப்படுத்தல்',en:'Micro Processing'},
  {id:'wellness',icon:'🌸',ta:'மன நல பாதுகாவலன்',en:'Mental Wellness Guardian'},
  {id:'water',icon:'💧',ta:'நீர் நுண்ணறிவு',en:'Water Intelligence'},
  {id:'community',icon:'👥',ta:'உழவர் சமூகம்',en:'Farmer Community'},
  {id:'radio',icon:'📻',ta:'வேளாண் வானொலி',en:'Agri Radio'},
];

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  if (!farmer.farmer_id && window.location.pathname.includes('dashboard')) {
    window.location.href = 'index.html';
    return;
  }
  initTopbar();
  renderFeatureCards();
  initVoice();
  syncFarmerProfile();
  fetchDashboardSummary();

  // If govt admin, open dashboard immediately
  if (farmer.is_govt) {
    const el = document.getElementById('alert-text');
    if (el) el.innerHTML = 'தமிழ்நாடு அரசு வேளாண்மை துறை / TN Govt Agriculture Dept';
    const voiceSec = document.querySelector('.voice-section');
    if (voiceSec) voiceSec.style.display = 'none'; // Govt doesn't need voice assistant
    setTimeout(() => openFeature('govt_dashboard'), 500);
  }
});

function initTopbar() {
  const name = farmer.name || 'விவசாயி';
  const district = farmer.district || '';
  const el = document.getElementById('tb-name');
  if (el) el.textContent = name;
  const del = document.getElementById('tb-district');
  if (del) del.textContent = district;
  const av = document.getElementById('tb-avatar');
  if (av) av.textContent = name.charAt(0).toUpperCase();

  // Highlight if leader
  if(farmer.is_shg_leader) {
    if(av) av.style.border = '2px solid gold';
    if(el) el.innerHTML = name + ' 👑';
  }
}

async function syncFarmerProfile() {
  if (!farmer.farmer_id) return;
  try {
    const res = await fetch(`${API}/api/farmer/${farmer.farmer_id}`);
    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('vaani_farmer', JSON.stringify(data));
        farmer = data;
        initTopbar();
    }
  } catch(e) {
    console.warn("Profile sync failed", e);
  }
}

async function fetchDashboardSummary() {
    if (!farmer.farmer_id) return;
    try {
        const res = await fetch(`${API}/api/farmer/${farmer.farmer_id}/dashboard-summary`);
        if (res.ok) {
            const data = await res.json();
            const alertText = document.getElementById('alert-text');
            if (alertText) {
                alertText.innerHTML = `<b>${data.todays_tip}</b> | ${data.quick_alerts[0]}`;
                alertText.style.color = 'var(--primary-dark)';
            }
            // If the voice buffer is empty, maybe say the greeting? 
            // Better to let user trigger voice.
        }
    } catch(e) {
        console.warn("Dashboard summary fetch failed", e);
    }
}

function renderFeatureCards() {
  const grid = document.getElementById('features-grid');
  if (!grid) return;
  
  let visibleFeatures = FEATURES;
  if (farmer.is_govt) {
    visibleFeatures = FEATURES.filter(f => ['govt-dash', 'community', 'market_prices'].includes(f.id));
  } else if (farmer.is_buyer) {
    visibleFeatures = FEATURES.filter(f => ['marketplace', 'market_prices', 'waste', 'community'].includes(f.id));
  } else {
    // Farmer / Leader
    visibleFeatures = FEATURES.filter(f => f.id !== 'govt-dash');
    
    // HIDE SHG for Men
    if (farmer.gender === 'male') {
        visibleFeatures = visibleFeatures.filter(f => !['shg-hub', 'shg_inventory', 'leader_panel'].includes(f.id));
    }

    if (!farmer.is_shg_leader) {
      visibleFeatures = visibleFeatures.filter(f => f.id !== 'leader_panel');
    }
  }
  
  // Update Bottom Nav based on Gender
  const shgNav = document.getElementById('nav-shg');
  if (shgNav) {
      shgNav.style.display = (farmer.gender === 'male') ? 'none' : 'flex';
  }
  grid.innerHTML = visibleFeatures.map(f => `
    <div class="feature-card" onclick="openFeature('${f.id}')" id="card-${f.id}">
      <div class="feature-icon">${f.icon}</div>
      <div class="feature-name-ta">${f.ta || f.title}</div>
      <div class="feature-name-en">${f.en || f.subtitle}</div>
    </div>
  `).join('');

  // Update Top Ribbon (Always show all for demo feel, or filter like grid)
  const ribbon = document.getElementById('features-ribbon');
  if (ribbon) {
    const lang = localStorage.getItem('vaani_lang') || 'ta';
    let ribbonFeatures = FEATURES;
    if (farmer.gender === 'male') {
        ribbonFeatures = FEATURES.filter(f => !['shg-hub', 'shg_inventory', 'leader_panel'].includes(f.id));
    }
    
    ribbon.innerHTML = ribbonFeatures.map((f, i) => `
      <div class="fpill" onclick="openFeature('${f.id}')" style="animation-delay: ${0.1 + (i*0.05)}s">
        <i>${f.icon}</i> ${lang === 'ta' ? f.ta : f.en}
      </div>
    `).join('');
  }
}

function scrollToTop() { window.scrollTo({top:0,behavior:'smooth'}); }

async function openProfile() {
  // Fresh fetch to get latest history
  let pData = farmer;
  try {
    const res = await fetch(`${API}/api/farmer/${farmer.farmer_id}`);
    if (res.ok) {
        pData = await res.json();
        localStorage.setItem('vaani_farmer', JSON.stringify(pData));
        farmer = pData;
    }
  } catch(e) {}

  const historyHtml = (pData.activity_history || []).slice(-5).reverse().map(h => `
    <div style="font-size: 0.85rem; padding: 10px; border-bottom: 1px solid rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; font-weight:600; color:var(--primary);">
            <span>${h.feature}</span>
            <span style="font-size:0.75rem; color:#888;">${h.date}</span>
        </div>
        <div style="color:#444;">${h.action}: ${h.details || ''}</div>
    </div>
  `).join('') || '<div style="padding:15px; text-align:center; color:#888; font-style:italic;">No history yet. Start using VAANI to build your credit trust.</div>';

  openModal(`
    <span class="modal-handle"></span>
    <div class="modal-header">
      <div><div class="modal-title-ta">சுயவிவரம்</div><div class="modal-title-en">My Profile</div></div>
      <div class="modal-close" onclick="closeModal()">✕</div>
    </div>
    
    <div class="result-card">
      <div class="result-label">பெயர் / Name</div>
      <div class="result-value">${pData.name||'—'} ${pData.is_shg_leader ? '👑' : ''}</div>
    </div>
    
    <div class="result-card">
      <div class="result-label">மாவட்டம் / District</div>
      <div class="result-value">${pData.district||'—'}</div>
    </div>

    ${pData.designation ? `
    <div class="result-card">
      <div class="result-label">பதவி / Designation</div>
      <div class="result-value">${pData.designation}</div>
    </div>
    <div class="result-card">
      <div class="result-label">துறை / Department</div>
      <div class="result-value">${pData.department || 'Agriculture'}</div>
    </div>
    ` : ''}

    ${pData.shg_name ? `
    <div class="result-card" style="border-left-color: gold;">
      <div class="result-label">குழு பெயர் / SHG Group</div>
      <div class="result-value">${pData.shg_name}</div>
    </div>
    <div class="result-card">
      <div class="result-label">உறுப்பினர்கள் / Members</div>
      <div class="result-value">${pData.member_count || '—'}</div>
    </div>
    ` : ''}
    
    <div class="result-card">
      <div class="result-label">${pData.is_shg_leader ? 'குழு கையிருப்பு / Group Inventory' : 'பயிர்கள் / Crops Cultivated'}</div>
      <div class="result-value">${(pData.crops || pData.inventory || []).join(', ') || '—'}</div>
    </div>
    
    ${pData.land_size ? `
    <div class="result-card">
      <div class="result-label">நிலம் / Land Size</div>
      <div class="result-value">${pData.land_size} ஏக்கர் (Acres)</div>
    </div>
    ` : ''}

    ${pData.credit_score ? `
    <div class="result-card" style="border: 2px solid var(--accent); background: #FFFDE7;">
      <div class="result-label">கடன் மதிப்பெண் / Credit Score</div>
      <div class="result-value" style="color: var(--accent-dark); font-size: 2.22rem; line-height: 1;">${pData.credit_score}</div>
      <div style="font-size: 0.72rem; color: #666; margin-top: 4px;">நிதி தகுதி: உயர் (Financial Trust: High)</div>
    </div>
    ` : ''}

    <div class="section-title mt-16" style="margin-bottom:8px">செயல்பாட்டு வரலாறு / History</div>
    <div style="background:#fff; border-radius:12px; border:1px solid rgba(0,0,0,0.08); overflow:hidden; margin-bottom:16px;">
        ${historyHtml}
    </div>

    <div style="background:var(--primary); color:white; padding:15px; border-radius:16px; margin-bottom:16px; display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="window.open('${API}/api/activity/download-proof?farmer_id=${pData.farmer_id}')">
        <div style="font-size:1.8rem;">📄</div>
        <div style="flex:1;">
            <div style="font-weight:700; font-size:1rem;">மின்னணு சான்றிதழ் (PDF)</div>
            <div style="font-size:0.8rem; opacity:0.9;">Download Official Credit Evidence</div>
        </div>
        <div style="font-size:1.2rem;">⬇️</div>
    </div>

    <button class="btn-primary btn-full" style="background:#f44336; border:none;" onclick="localStorage.removeItem('vaani_farmer');window.location.href='index.html'">
      வெளியேறு / Logout
    </button>
  `);
}

// ---- Modal System ----
function openModal(html, center=false) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay' + (center?' center-modal':'');
  overlay.id = 'active-modal';
  
  const speakerHtml = `
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.05); text-align: center; position: sticky; bottom: -20px; background: white; z-index: 10;">
       <button class="voice-read-btn" style="width:100%; padding:12px; background:var(--bg-light); border:1px solid var(--primary); color:var(--primary); font-weight:700; border-radius:12px; cursor:pointer;" onclick="speakModalContent()">🔊 விவரங்களை படிக்க (Read Details)</button>
    </div>
  `;
  
  overlay.innerHTML = `<div class="modal-sheet animate-pop">${html}${speakerHtml}</div>`;
  overlay.addEventListener('click', e => { if(e.target===overlay) closeModal(); });
  document.getElementById('modal-container').appendChild(overlay);
  
  setTimeout(() => overlay.classList.add('visible'), 10);
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  const m = document.getElementById('active-modal');
  if(m) m.remove();
  document.body.style.overflow = '';
  // Stop all audio when closing any module
  stopRadio();
}

function speakModalContent() {
  const m = document.getElementById('active-modal');
  if(!m) return;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  
  // Clone to remove the speaker button text from being read
  const clone = m.cloneNode(true);
  const btns = clone.querySelectorAll('.voice-read-btn');
  // Remove interactive elements like buttons before reading
  btns.forEach(b => b.remove());
  const inputs = clone.querySelectorAll('input, select, textarea');
  inputs.forEach(i => i.remove());
  
  const text = clone.textContent.replace(/✕/g, "").replace(/\s+/g, " ").trim();
  
  if (!text) return;

  const btnNodes = document.querySelectorAll('.voice-read-btn');
  btnNodes.forEach(n => n.textContent = '⏳ படித்துக் கொண்டிருக்கிறது...');

  fetch(`${API}/api/audio/simplify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({text})
  }).then(r => r.json()).then(d => {
      btnNodes.forEach(n => n.textContent = '🔊 முழுவதையும் படிக்க (Read Aloud)');
      speak(d.spoken_text || text);
  }).catch(e => {
      btnNodes.forEach(n => n.textContent = '🔊 முழுவதையும் படிக்க (Read Aloud)');
      speak(text); 
  });
}

// ---- Voice ----
let voiceBuffer = "";

function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.lang = 'ta-IN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = e => {
    voiceBuffer = [...e.results].map(r=>r[0].transcript).join('');
    showTranscript(voiceBuffer);
  };
  recognition.onend = async () => { 
      if (recognizing) {
          // If browser forcibly stops but user hasn't clicked Stop yet, restart buffer naturally
          recognition.start();
      }
  };
  recognition.onerror = e => { 
      if (e.error !== 'no-speech') {
          recognizing = false; 
          setVoiceUI(false); 
      }
  };
}

async function toggleVoice() {
  if (radioPlaying) stopRadio(); // Stop radio if starting voice
  if (!recognition) { alert('உங்கள் browser voice input ஐ ஆதரிக்கவில்லை'); return; }
  
  if (recognizing) { 
      // User clicked Stop manually. Now we process the gathered buffer
      recognizing = false; 
      recognition.stop();
      setVoiceUI(false);
      
      showTranscript(voiceBuffer ? "வாணி சிந்திக்கிறாள் (Thinking...)" : "விவரங்கள் இல்லை...");
      if (voiceBuffer && voiceBuffer.trim()) {
          await routeVoiceInput(voiceBuffer);
      }
      return; 
  }
  
  voiceBuffer = "";
  showTranscript("பேசவும்... எப்பொழுது முடிகிறதோ, மீண்டும் Mic பட்டனை அழுத்தவும் (Speak now, click again to finish)");
  recognizing = true; 
  setVoiceUI(true);
  recognition.start(); 
}

function setVoiceUI(on) {
  const btn = document.getElementById('voice-btn');
  const wrap = document.getElementById('voice-btn-wrap');
  if (!btn) return;
  btn.textContent = on ? '⏹️' : '🎙️';
  btn.classList.toggle('recording', on);
  wrap.classList.toggle('recording', on);
}

function showTranscript(text) {
  const el = document.getElementById('voice-transcript');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
}

async function routeVoiceInput(text) {
  try {
    const res = await fetch(`${API}/api/voice/route`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,farmer_id:farmer.farmer_id})});
    const data = await res.json();
    
    // Clear any previous audio/state cleanly
    stopRadio();
    
    // Always speak the summary if provided
    const summary = data.summary_tamil || "சரிம்மா, நான் என்னன்னு பார்க்கிறேன்.";
    speak(summary, null, true);

    if (data.feature_id && data.feature_id !== 'chat' && data.feature_id !== 'None') {
      if (!data.is_incomplete) {
        window.vaaniFollowUpPending = true;
      } else {
        window.vaaniFollowUpPending = false;
      }
      // Open feature after a short delay so she has time to start speaking
      setTimeout(() => openFeature(data.feature_id, data.extracted_params||{}), 800);
    }
  } catch(e) {
    console.warn('Voice route failed', e);
    speak("மன்னிக்கவும், எனக்கு புரியவில்லை. மீண்டும் முயற்சிக்கவும்.");
  }
}

window.vaaniQueue = [];
window.vaaniAudioObj = null;
window.vaaniIsSpeaking = false;
window.vaaniFollowUpPending = false;
let vaaniFollowUpTimer = null;

// Fires "feel free to ask anything else" after the answer finishes,
// using a debounce so it never interrupts the answer mid-sentence.
function checkAndFireFollowUp() {
  if (!window.vaaniFollowUpPending) return;
  if (vaaniFollowUpTimer) clearTimeout(vaaniFollowUpTimer);
  vaaniFollowUpTimer = setTimeout(() => {
    vaaniFollowUpTimer = null;
    // Only fire if queue is still empty and nothing is playing
    if (window.vaaniFollowUpPending && window.vaaniQueue.length === 0 && !window.vaaniIsSpeaking) {
      window.vaaniFollowUpPending = false;
      speak("இதுல வேற ஏதாச்சும் கேக்கணும்னா தயங்காம கேளுங்கம்மா, நான் சொல்றேன்.");
    }
  }, 3500); // 3.5s delay fits better for feature loading + original answer
}

function stopRadio() {
  radioPlaying = false;
  window.vaaniQueue = [];
  window.vaaniIsSpeaking = false;
  window.vaaniFollowUpPending = false;
  if (vaaniFollowUpTimer) { clearTimeout(vaaniFollowUpTimer); vaaniFollowUpTimer = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (window.vaaniAudioObj) {
      window.vaaniAudioObj.pause();
      window.vaaniAudioObj.currentTime = 0;
      window.vaaniAudioObj = null;
  }
}

async function processVaaniQueue() {
  if (window.vaaniIsSpeaking || window.vaaniQueue.length === 0) return;
  window.vaaniIsSpeaking = true;
  
  const task = window.vaaniQueue.shift();
  const text = task.text;
  
  try {
      const resp = await fetch(`${API}/api/audio/tts`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({text: text})
      });
      
      if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || "Backend TTS Failed");
      }
      
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.vaaniAudioObj = new Audio(url);
      
      window.vaaniAudioObj.onended = () => {
          URL.revokeObjectURL(url);
          window.vaaniIsSpeaking = false;
          if (task.onComplete) task.onComplete();
          processVaaniQueue();
          // If queue just drained, check whether to fire the follow-up
          if (window.vaaniQueue.length === 0) checkAndFireFollowUp();
      };
      
      window.vaaniAudioObj.onerror = () => {
          URL.revokeObjectURL(url);
          console.warn("Audio chunk failed to play from backend.");
          window.vaaniIsSpeaking = false;
          if (task.onComplete) task.onComplete();
          processVaaniQueue();
          if (window.vaaniQueue.length === 0) checkAndFireFollowUp();
      };
      
      window.vaaniAudioObj.play().catch(e => {
          URL.revokeObjectURL(url);
          console.error("Audio blocked by browser config:", e);
          window.vaaniIsSpeaking = false;
          if (task.onComplete) task.onComplete();
          processVaaniQueue();
          if (window.vaaniQueue.length === 0) checkAndFireFollowUp();
      });
  } catch (err) {
      console.warn("Backend TTS failed, trying next chunk.", err);
      window.vaaniIsSpeaking = false;
      if (task.onComplete) task.onComplete();
      processVaaniQueue();
  }
}

function speak(text, onEndCallback = null, append = false) {
  if (!append) stopRadio(); // Clear any ongoing audio
  if (!text) return;
  
  // Strip Emojis using Regex
  let cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
  
  // Remove questions if they look like "பயிர் வகை / Crop Type" and just keep the Label if possible?
  // Actually, Vaani should only speak the answer. 
  // For modal contents, we'll try to focus on result-value and info-cards.
  
  const chunks = cleanText.match(/[^.!?\n।]+[.!?\n।]*/g) || [cleanText];
  chunks.forEach((chunk, index) => {
      const trimmed = chunk.trim();
      if (!trimmed) return;
      window.vaaniQueue.push({
          text: trimmed,
          onComplete: (index === chunks.length - 1) ? onEndCallback : null
      });
  });
  
  // New items added — cancel any pending follow-up debounce timer
  if (vaaniFollowUpTimer) { clearTimeout(vaaniFollowUpTimer); vaaniFollowUpTimer = null; }
  
  processVaaniQueue();
}

// ---- Feature Router ----
function openFeature(id, params={}) {
  const f = FEATURES.find(x=>x.id===id);
  if (!f) return;
  
  // Track activity
  if (farmer.farmer_id) {
    fetch(`${API}/api/activity/log`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        farmer_id: farmer.farmer_id,
        feature: f.en,
        action: "Opened Feature"
      })
    }).catch(e => console.warn("Activity log failed", e));
  }

  switch(id) {
    case 'crop_disease': showCropDisease(params); break;
    case 'market_prices': showMarketPrices(params); break;
    case 'govt_schemes': showGovtSchemes(params); break;
    case 'collective_sale': showCollective(params); break;
    case 'credit_score': showCreditScore(params); break;
    case 'fake_input': showFakeInput(params); break;
    case 'contract': showContract(params); break;
    case 'cold_storage': showColdStorage(params); break;
    case 'crop_planning': showCropPlanning(params); break;
    case 'pest_outbreak': showPestOutbreak(params); break;
    case 'waste': showWaste(params); break;
    case 'soil_health': showSoilHealth(params); break;
    case 'weather': showWeather(params); break;
    case 'legal': showLegal(params); break;
    case 'disaster': showDisaster(params); break;
    case 'marketplace': showMarketplace(params); break;
    case 'processing': showProcessing(params); break;
    case 'wellness': showWellness(params); break;
    case 'water': showWater(params); break;
    case 'shg-hub': showSHGHub(params); break;
    case 'shg_inventory': openSHGInventory(); break;
    case 'leader_panel': openLeaderDashboard(); break;
    case 'govt-dash': showGovtDashboard(params); break;
    case 'govt_dashboard': showGovtDashboard(params); break;
    case 'community': showCommunity(params); break;
    case 'shg_community': openSHGChat(); break;
    case 'radio': toggleRadio(); break;
  }
}

// ==== Agri Radio Feature ====
async function toggleRadio() {
  const radioBtn = document.getElementById('radio-btn');
  if (radioPlaying) {
      stopRadio();
      if(radioBtn) radioBtn.classList.remove('playing');
      speak("ரேடியோ நிறுத்தப்பட்டது"); // "Radio stopped"
      return;
  }
  
  if(radioBtn) radioBtn.classList.add('playing');
  radioPlaying = true;
  // Clear old news to force a fresh fetch for real-world updates
  fetchedNews = []; 
  
  speak("இன்றைய உங்களுக்கான சிறப்பு செய்திகள் தயாராகின்றன...", async () => {
      // First, fetch a personalized intro script
      try {
        const context = {
            name: farmer.name,
            district: farmer.district,
            crops: farmer.crops || ['Paddy']
        };
        const scriptRes = await fetch(`${API}/api/audio/daily-news-script`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text: JSON.stringify(context)})
        });
        const scriptData = await scriptRes.json();
        
        // Fetch global news as well
        await fetchFreshNews();
        
        // Prepend personalized script to world news
        if (scriptData.script) {
            fetchedNews.unshift(scriptData.script);
        }
        
        if (radioPlaying) {
            playAllNews();
        }
      } catch(e) {
          await fetchFreshNews();
          if (radioPlaying) playAllNews();
      }
  });
}

async function fetchFreshNews() {
    try {
        const res = await fetch(`${API}/api/radio/news?t=${Date.now()}`);
        const data = await res.json();
        fetchedNews = data.news || ["மன்னிக்கவும், செய்திகளை பெற முடியவில்லை."];
    } catch(e) {
        fetchedNews = ["மன்னிக்கவும், இணைய இணைப்பு இல்லை."];
    }
}

function speakNewsIndex(index) {
  if (fetchedNews && fetchedNews[index]) {
      speak(fetchedNews[index]);
  }
}

function speakNews(text) {
  speak(text);
}

function playAllNews() {
  stopRadio();
  radioPlaying = true;
  radioIndex = 0;
  playNextNews();
}

function playNextNews() {
  if (!radioPlaying) return;
  if (radioIndex >= fetchedNews.length) {
    radioPlaying = false;
    return;
  }
  
  const text = fetchedNews[radioIndex];
  // Pre-processing text
  let cleanText = text
    .replace(/<[^>]*>?/gm, '') // Remove HTML
    .replace(/[*_#~]/g, '')    // Remove Markdown
    .replace(/['"]/g, '')      // Remove Quotes
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ''); // Remove Emojis

  speak(cleanText, async () => {
      if (!radioPlaying) return;
      radioIndex++;
      if (radioIndex >= fetchedNews.length) {
          // Silent fetch for continuous real-world news without intro phrase
          await fetchFreshNews();
          radioIndex = 0;
          playNextNews();
      } else {
          setTimeout(playNextNews, 800);
      }
  });
}


function loading(title,en) {
  return `<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">${title}</div><div class="modal-title-en">${en}</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="loading-state"><div class="loading-leaf">🌿</div><div class="loading-text">VAANI யோசிக்கிறது...</div></div>`;
}

function districts() {
  return ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar', 'Kanyakumari'];
}
function districtOptions(selected='') {
  const s = String(selected).toLowerCase().trim();
  return districts().map(d=>`<option value="${d}" ${d.toLowerCase()===s?'selected':''}>${d}</option>`).join('');
}

async function submitManualQuery() {
  const input = document.getElementById('manual-query-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await routeVoiceInput(text);
}

// ---- Helpers for Mic/Speaker UI ----
function wrapInputWithMic(id, placeholder, value='', type='text') {
  return `
    <div class="input-with-mic mt-4">
      <input class="form-input" id="${id}" type="${type}" placeholder="${placeholder}" value="${value}">
      <button class="mic-inline-btn" title="Speak" onclick="startInlineMic('${id}')">🎙️</button>
    </div>
  `;
}

function wrapTextareaWithMic(id, placeholder, value='') {
  return `
    <div class="input-with-mic mt-4">
      <textarea class="form-input" id="${id}" rows="3" placeholder="${placeholder}">${value}</textarea>
      <button class="mic-inline-btn" style="bottom: 12px; top: auto;" title="Speak" onclick="startInlineMic('${id}')">🎙️</button>
    </div>
  `;
}

function startInlineMic(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Browser not supporting voice."); return; }
  
  const rec = new SR();
  rec.lang = 'ta-IN';
  el.style.borderColor = 'var(--accent)';
  
  rec.onresult = e => {
    el.value = e.results[0][0].transcript;
    el.style.borderColor = '';
  };
  rec.onerror = () => { el.style.borderColor = ''; };
  rec.onend = () => { el.style.borderColor = ''; };
  rec.start();
}

function infoCard(content, type='', speaker=true) {
  if (!content) return '';
  // Clean content for speaking (remove tags)
  const clean = content.replace(/<[^>]*>?/gm, '').replace(/'/g, "\\'");
  const speakerBtn = speaker ? `<button class="speaker-inline-btn" onclick="speak('${clean}')">🔊</button>` : '';
  return `
    <div class="info-card ${type} ${speaker?'info-with-speaker':''} mt-8">
      ${content}
      ${speakerBtn}
    </div>
  `;
}

// Add Enter key listener for manual input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('manual-query-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitManualQuery();
        });
    }
});

function contactFarmer(name) {
  openModal(`
    <span class="modal-handle"></span>
    <div class="modal-header">
      <div><div class="modal-title-ta">💬 ${name} உடன் உரையாடு</div><div class="modal-title-en">Chat with ${name}</div></div>
      <div class="modal-close" onclick="closeModal()">✕</div>
    </div>
    ${infoCard('பாதுகாப்பான முறையில் ஆப் மூலம் மட்டும் பேசவும்.', 'success', false)}
    <div id="chat-messages" style="height:200px; overflow-y:auto; padding:10px; background:rgba(0,0,0,0.02); border-radius:12px; margin-bottom:12px; margin-top:12px;">
      <div style="text-align:right;"><span style="background:var(--primary); color:#fff; padding:6px 12px; border-radius:12px; font-size:0.85rem;">வணக்கம், நான் உங்கள் பொருளை வாங்க விழைகிறேன்.</span></div>
    </div>
    ${wrapInputWithMic('chat-input', 'செய்தி அனுப்பவும்...', '')}
    <button class="btn-primary btn-full mt-8" onclick="sendMessage()">அனுப்பு / Send</button>
  `);
}

function sendMessage() {
  const inp = document.getElementById('chat-input');
  const msg = inp.value;
  if(!msg) return;
  const area = document.getElementById('chat-messages');
  area.innerHTML += `<div style="text-align:right; margin-top:12px;"><span style="background:var(--primary); color:#fff; padding:6px 12px; border-radius:12px; font-size:0.85rem;">${msg}</span></div>`;
  inp.value = '';
  // Fake auto-reply
  setTimeout(() => {
     area.innerHTML += `<div style="text-align:left; margin-top:12px;"><span style="background:#eee; padding:6px 12px; border-radius:12px; font-size:0.85rem;">நிச்சயமாக சார். எப்போது வரலாம்?</span></div>`;
     if(area) area.scrollTop = area.scrollHeight;
  }, 1000);
}

// Global Gender Honorific Helper
function h(ta=true) {
    const gender = (farmer && farmer.gender) || "female";
    if (ta) {
        return gender === "female" ? "அம்மா" : "ஐயா";
    } else {
        return gender === "female" ? "Amma" : "Sir";
    }
}
