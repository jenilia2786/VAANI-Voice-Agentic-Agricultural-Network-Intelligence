// =====================================================
// FEATURE 22 — SHG Community Group Chat
// =====================================================
let currentSHGGroupId = null;
let shgChatInterval = null;
let mediaRecorder = null;
let audioChunks = [];

function showSHGHub(params={}) {
  const userVillage = params.village || params.district || farmer.district || '';
  
  openModal(`<span class="modal-handle"></span>
  <div class="modal-header">
    <div><div class="modal-title-ta">👩‍👩‍👧‍👧 மகளிர் சுயவுதவி குழு (SHG)</div><div class="modal-title-en">SHG Community Hub</div></div>
    <div class="modal-close" onclick="closeModal()">✕</div>
  </div>
  <div class="info-card success">உங்கள் கிராமத்தில் உள்ள மகளிர் குழுக்களுடன் இணைந்து சேமிப்பு மற்றும் அரசு உதவிகள் பற்றி பேசுங்கள்.</div>
  
  <div class="form-row mt-12">
    <label class="form-label">உங்கள் கிராமம் / Village</label>
    <div style="display:flex; gap:8px;">
        <input class="form-input" id="shg-village-search" placeholder="கிராமம் பெயர்..." value="${userVillage}">
        <button class="btn-primary" onclick="searchSHGGroups()">🔍 தேடு</button>
    </div>
  </div>
  
  <div id="shg-hub-result"></div>`);
  
  if (userVillage) {
      setTimeout(searchSHGGroups, 300);
  }
}

async function searchSHGGroups() {
  const el = document.getElementById('shg-hub-result');
  const village = document.getElementById('shg-village-search').value.trim();
  if (!village) return;
  
  el.innerHTML = '<div class="loading-state"><div class="loading-leaf">🌿</div></div>';
  
  try {
    const res = await fetch(`${API}/api/shg/groups?village=${encodeURIComponent(village)}`);
    const d = await res.json();
    const groups = d.groups || [];
    
    if (groups.length === 0) {
        el.innerHTML = `<div class="info-card text-center mt-12">மன்னிக்கவும், இந்த கிராமத்தில் குழுக்கள் எதுவும் இல்லை. <br><button class="btn-primary mt-8" onclick="alert('குழு உருவாக்கும் அம்சம் விரைவில்!')">+ புதிய குழு உருவாக்கு</button></div>`;
        return;
    }
    
    el.innerHTML = `<div style="font-size:0.85rem; font-weight:700; color:var(--text-secondary); margin:12px 0 8px;">கிடைத்த குழுக்கள் (${groups.length})</div>` + 
      groups.map(g => `
        <div class="mandi-card mt-8" onclick="enterSHGGroup('${g.id}', '${g.name}')" style="cursor:pointer; border-left:4px solid var(--success);">
          <div>
            <div class="mandi-name">${g.name}</div>
            <div class="mandi-dist">👥 ${g.members_count || 0} உறுப்பினர்கள்</div>
          </div>
          <div class="mandi-price" style="color:var(--primary);">சேர் ➔</div>
        </div>
      `).join('');
    speak(`உங்கள் கிராமத்தில் ${groups.length} மகளிர் குழுக்கள் உள்ளன.`);
  } catch(e) {
    el.innerHTML = `<div class="info-card alert">குழுக்களைத் தேடுவதில் பிழை.</div>`;
  }
}

async function enterSHGGroup(groupId, groupName) {
    currentSHGGroupId = groupId;
    
    // Open chat UI in the same modal
    const modalEl = document.getElementById('modal-container').firstChild;
    if (!modalEl) return;
    
    // UI Layout for chat
    openModal(`<div class="modal-header">
        <div style="display:flex; align-items:center; gap:12px;">
            <div onclick="showSHGHub()" style="cursor:pointer; font-size:1.2rem;">⬅️</div>
            <div>
                <div class="modal-title-ta">${groupName}</div>
                <div class="modal-title-en">SHG Group Chat</div>
            </div>
        </div>
        <div class="modal-close" onclick="closeModal()">✕</div>
    </div>
    
    <div id="shg-chat-messages" style="height:350px; overflow-y:auto; padding:12px; background:var(--bg-light); border-radius:12px; display:flex; flex-direction:column; gap:8px;">
        <div class="loading-state"><div class="loading-leaf">🌿</div></div>
    </div>
    
    <div style="padding:12px; background:#fff; border-top:1px solid #eee; margin-top:8px;">
        <div style="display:flex; gap:8px; align-items:flex-end;">
            <button id="shg-voice-btn" class="voice-btn-small" onclick="toggleSHGRecording()" style="background:#e8f5e9; border:none; border-radius:50%; width:44px; height:44px; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">🎤</button>
            <textarea id="shg-chat-input" class="form-input" style="flex:1; border-radius:20px; padding:10px 15px; margin:0;" placeholder="செய்தி அனுப்பவும்..." rows="1"></textarea>
            <button class="btn-primary" onclick="postSHGTextMessage()" style="border-radius:50%; width:44px; height:44px; padding:0; display:flex; align-items:center; justify-content:center;">📤</button>
        </div>
        <div id="shg-voice-status" style="font-size:0.7rem; color:red; margin-top:4px; display:none; animation: pulse-red 1.5s infinite;">● ரெக்கார்டிங் ஆகிறது...</div>
    </div>`);
    
    // Start polling for messages
    loadSHGMessages();
    shgChatInterval = setInterval(loadSHGMessages, 3000);
    
    // Add close handler to stop interval
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
        const originalClose = closeBtn.onclick;
        closeBtn.onclick = () => {
            clearInterval(shgChatInterval);
            if (originalClose) originalClose();
        };
    }
}

async function loadSHGMessages() {
    if (!currentSHGGroupId) return;
    const el = document.getElementById('shg-chat-messages');
    if (!el) return;
    
    try {
        const res = await fetch(`${API}/api/shg/messages?group_id=${currentSHGGroupId}`);
        const d = await res.json();
        const messages = d.messages || [];
        
        el.innerHTML = messages.map(m => {
            const isMe = m.farmer_id === farmer.farmer_id;
            const time = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            return `
                <div style="max-width:85%; align-self: ${isMe?'flex-end':'flex-start'};">
                    <div style="background:${isMe?'var(--primary)':'#fff'}; color:${isMe?'#fff':'#333'}; padding:10px 14px; border-radius: ${isMe?'16px 16px 4px 16px':'16px 16px 16px 4px'}; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-size:0.75rem; font-weight:800; margin-bottom:4px; color:${isMe?'rgba(255,255,255,0.8)':'var(--primary)'}">${m.farmer_name}</div>
                        ${m.text_content ? `<div style="font-size:0.95rem;">${m.text_content}</div>` : ''}
                        ${m.voice_url ? `
                            <div style="display:flex; align-items:center; gap:8px; margin-top:4px; background:rgba(255,255,255,0.2); border-radius:20px; padding:4px 10px;">
                                <button onclick="playSHGVoice('${m.voice_url}')" style="background:none; border:none; cursor:pointer; font-size:1rem;">▶️</button>
                                <div style="height:4px; flex:1; background:rgba(0,0,0,0.1); border-radius:2px;">
                                    <div style="width:100%; height:100%; border-radius:2px; background:${isMe?'#fff':'var(--primary)'};"></div>
                                </div>
                            </div>
                        ` : ''}
                        <div style="font-size:0.65rem; text-align:right; margin-top:4px; opacity:0.7;">${time}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch(e) {
        console.warn('SHG messages fetch failed');
    }
}

async function postSHGTextMessage() {
    const input = document.getElementById('shg-chat-input');
    const text = input.value.trim();
    if (!text || !currentSHGGroupId) return;
    
    input.value = '';
    
    const formData = new FormData();
    formData.append('group_id', currentSHGGroupId);
    formData.append('farmer_id', farmer.farmer_id || 'demo');
    formData.append('farmer_name', farmer.name || 'விவசாயி');
    formData.append('text_content', text);
    
    try {
        await fetch(`${API}/api/shg/post`, { method: 'POST', body: formData });
        loadSHGMessages();
    } catch(e) {
        alert('செய்தி அனுப்ப முடியவில்லை.');
    }
}

async function toggleSHGRecording() {
    const btn = document.getElementById('shg-voice-btn');
    const status = document.getElementById('shg-voice-status');
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        btn.innerHTML = '🎤';
        btn.style.background = '#e8f5e9';
        status.style.display = 'none';
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            sendSHGVoiceMessage(audioBlob);
            // Stop stream
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        btn.innerHTML = '⏹️';
        btn.style.background = '#ffebee';
        status.style.display = 'block';
        
    } catch (err) {
        alert("மைக் உபயோகிக்க அனுமதி தேவை / Mic permission required");
    }
}

async function sendSHGVoiceMessage(blob) {
    if (!currentSHGGroupId) return;
    
    const formData = new FormData();
    formData.append('group_id', currentSHGGroupId);
    formData.append('farmer_id', farmer.farmer_id || 'demo');
    formData.append('farmer_name', farmer.name || 'விவசாயி');
    formData.append('voice_file', blob, 'voice_msg.wav');
    
    try {
        await fetch(`${API}/api/shg/post`, { method: 'POST', body: formData });
        loadSHGMessages();
    } catch(e) {
        alert('வாய்ஸ் செய்தி அனுப்ப முடியவில்லை.');
    }
}

function playSHGVoice(url) {
    const fullUrl = url.startsWith('http') ? url : `${API}/${url}`;
    const audio = new Audio(fullUrl);
    audio.play();
}

// Global styles for animations
const style = document.createElement('style');
style.textContent = `
@keyframes pulse-red {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
}
.voice-btn-small:hover { transform: scale(1.1); transition: 0.2s; }
`;
document.head.appendChild(style);
