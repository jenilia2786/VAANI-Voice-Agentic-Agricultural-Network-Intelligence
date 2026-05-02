// VAANI — features_shg.js
// Comprehensive module for SHG Community, Inventory, and Leadership

let shgChatInterval = null;
let shgMediaRecorder = null;
let shgAudioChunks = [];

// 1. Group Chat (WhatsApp style)
function openSHGChat() {
    scrollToTop();
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer') || '{}');
    
    // If not a member, show search hub
    if (!farmer.shg_member && !farmer.is_shg_leader) {
        openModal(`
            <span class="modal-handle"></span>
            <div class="modal-header">
                <div><div class="modal-title-ta">குழுவில் சேரவும்</div><div class="modal-title-en">Join SHG Community</div></div>
                <div class="modal-close" onclick="closeModal()">✕</div>
            </div>
            <div class="voice-search-box mt-16">
                <p class="text-muted">நீங்கள் இன்னும் எந்த குழுவிலும் உறுப்பினர் இல்லை. உங்கள் கிராமத்தில் உள்ள குழுக்களை தேடி சேரவும்.</p>
                <div class="form-row mt-12">
                    <label class="form-label">கிராமம் / Village</label>
                    <div style="display:flex; gap:8px;">
                        <input class="form-input" id="shg-village-search" placeholder="கிராமம் பெயர்..." value="${farmer.village || ''}">
                        <button class="btn-primary" onclick="searchSHGGroups()">🔍 தேடு</button>
                    </div>
                </div>
                <div id="shg-results" class="mt-16"></div>
            </div>
        `);
        return;
    }
    
    // Member/Leader UI
    openModal(`
        <span class="modal-handle"></span>
        <div class="modal-header">
            <div><div class="modal-title-ta">மகளிர் குழு அரட்டை</div><div class="modal-title-en">SHG Group Chat</div></div>
            <div class="modal-close" onclick="closeModal()">✕</div>
        </div>
        
        <div id="shg-chat-messages" style="height:380px; overflow-y:auto; padding:12px; background:#f9f9f9; border-radius:12px; display:flex; flex-direction:column; gap:8px; margin-top:10px; border:1px solid #eee;">
            <div class="loading-state">🌿 தகவல்கள் சேகரிக்கப்படுகிறது...</div>
        </div>
        
        <div class="chat-input-area mt-12" style="background:#fff; padding:8px; border-radius:24px; box-shadow:0 2px 8px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px;">
            <button id="shg-voice-btn" class="btn-mic" onclick="toggleSHGRecording()" style="min-width:44px; height:44px; border-radius:50%; background:#e8f5e9; border:none; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">🎤</button>
            <input type="text" id="shg-chat-input" placeholder="செய்தி அனுப்பவும்..." style="flex:1; border:none; padding:10px 4px; outline:none; font-size:0.95rem;" onkeypress="if(event.key==='Enter') sendSHGTextMessage()">
            <button class="btn-primary" onclick="sendSHGTextMessage()" style="min-width:44px; height:44px; border-radius:50%; padding:0; display:flex; align-items:center; justify-content:center;">📤</button>
        </div>
        <div id="shg-voice-status" style="font-size:0.75rem; color:#f44336; margin-top:6px; text-align:center; display:none; font-weight:700;">● குரல் பதிவு செய்யப்படுகிறது...</div>
    `);
    
    loadSHGMessages(farmer.shg_id || 'shg_demo');
    if (shgChatInterval) clearInterval(shgChatInterval);
    shgChatInterval = setInterval(() => loadSHGMessages(farmer.shg_id || 'shg_demo'), 3000);
}

async function searchSHGGroups() {
    const village = document.getElementById('shg-village-search').value;
    const el = document.getElementById('shg-results');
    el.innerHTML = '<div class="loading-state">🔍 தேடுகிறது...</div>';
    
    try {
        const resp = await fetch(`${API}/api/shg/groups?village=${encodeURIComponent(village)}`);
        const data = await resp.json();
        
        let html = '<div style="font-size:0.9rem; font-weight:700; margin-bottom:12px">முடிவுகள்:</div>';
        if (!data.groups || data.groups.length === 0) {
            html += '<p class="text-muted">குழுக்கள் எதுவும் இல்லை.</p>';
        } else {
            data.groups.forEach(g => {
                html += `
                    <div class="glass-card p-12 mb-12 d-flex justify-content-between align-items-center animate-pop" style="border-left:4px solid var(--primary)">
                        <div>
                            <div style="font-weight:700">${g.name}</div>
                            <small class="text-muted">👥 ${g.members_count} உறுப்பினர்கள்</small>
                        </div>
                        <button class="btn-sm btn-primary" onclick="requestToJoinSHG('${g.id}')">சேர விண்ணப்பி</button>
                    </div>
                `;
            });
        }
        el.innerHTML = html;
    } catch(e) { el.innerHTML = "Error fetching groups."; }
}

async function requestToJoinSHG(shgId) {
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    try {
        const res = await fetch(`${API}/api/shg/request-join`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                farmer_id: farmer.farmer_id,
                farmer_name: farmer.name,
                shg_id: shgId
            })
        });
        if (res.ok) {
            alert("விண்ணப்பம் அனுப்பப்பட்டது! தலைவர் அனுமதித்தவுடன் நீங்கள் குழுவில் சேரலாம்.");
            closeModal();
        }
    } catch(e) { alert("Failed to send request."); }
}

async function loadSHGMessages(shgId) {
    const el = document.getElementById('shg-chat-messages');
    if (!el) {
        if (shgChatInterval) clearInterval(shgChatInterval);
        return;
    }
    
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer') || '{}');
    
    try {
        const res = await fetch(`${API}/api/shg/messages?group_id=${shgId}`);
        const d = await res.json();
        const messages = d.messages || [];
        
        el.innerHTML = messages.map(m => {
            const isMe = m.farmer_id === farmer.farmer_id;
            const time = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            return `
                <div style="max-width:85%; align-self: ${isMe?'flex-end':'flex-start'};">
                    <div style="background:${isMe?'var(--primary)':'#fff'}; color:${isMe?'#fff':'#333'}; padding:10px 14px; border-radius: ${isMe?'18px 18px 2px 18px':'18px 18px 18px 2px'}; box-shadow:0 2px 4px rgba(0,0,0,0.06); border: ${isMe?'none':'1px solid #eee'};">
                        <div style="font-size:0.75rem; font-weight:800; margin-bottom:4px; color:${isMe?'rgba(255,255,255,0.9)':'var(--primary)'}">${m.farmer_name}</div>
                        ${m.text_content ? `<div style="font-size:0.95rem; line-height:1.4">${m.text_content}</div>` : ''}
                        ${m.voice_url ? `
                            <div style="display:flex; align-items:center; gap:10px; margin-top:6px; background:rgba(0,0,0,0.05); border-radius:20px; padding:6px 12px; min-width:140px;">
                                <button onclick="playSHGVoice('${m.voice_url}')" style="background:var(--primary); color:white; border:none; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; justify-content:center;">▶️</button>
                                <div style="flex:1; height:3px; background:rgba(0,0,0,0.1); position:relative; border-radius:2px;">
                                    <div style="width:100%; height:100%; border-radius:2px; background:var(--primary);"></div>
                                </div>
                            </div>
                        ` : ''}
                        <div style="font-size:0.65rem; text-align:right; margin-top:4px; opacity:0.7;">${time}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch(e) { console.warn('SHG fetch failed'); }
}

async function sendSHGTextMessage() {
    const input = document.getElementById('shg-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    input.value = '';
    
    const formData = new FormData();
    formData.append('group_id', farmer.shg_id || 'shg_demo');
    formData.append('farmer_id', farmer.farmer_id);
    formData.append('farmer_name', farmer.name);
    formData.append('text_content', text);
    
    try {
        await fetch(`${API}/api/shg/post`, { method: 'POST', body: formData });
        loadSHGMessages(farmer.shg_id || 'shg_demo');
    } catch(e) { alert("Message failed."); }
}

async function toggleSHGRecording() {
    const btn = document.getElementById('shg-voice-btn');
    const status = document.getElementById('shg-voice-status');
    
    if (shgMediaRecorder && shgMediaRecorder.state === "recording") {
        shgMediaRecorder.stop();
        btn.innerHTML = '🎤';
        btn.style.background = '#e8f5e9';
        status.style.display = 'none';
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        shgMediaRecorder = new MediaRecorder(stream);
        shgAudioChunks = [];
        
        shgMediaRecorder.ondataavailable = e => shgAudioChunks.push(e.data);
        shgMediaRecorder.onstop = () => {
            const blob = new Blob(shgAudioChunks, { type: 'audio/wav' });
            sendSHGVoiceMessage(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        
        shgMediaRecorder.start();
        btn.innerHTML = '⏹️';
        btn.style.background = '#ffebee';
        status.style.display = 'block';
    } catch(e) { alert("Mic required."); }
}

async function sendSHGVoiceMessage(blob) {
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    const formData = new FormData();
    formData.append('group_id', farmer.shg_id || 'shg_demo');
    formData.append('farmer_id', farmer.farmer_id);
    formData.append('farmer_name', farmer.name);
    formData.append('voice_file', blob, 'voice.wav');
    
    try {
        await fetch(`${API}/api/shg/post`, { method: 'POST', body: formData });
        loadSHGMessages(farmer.shg_id || 'shg_demo');
    } catch(e) { alert("Voice failed."); }
}

function playSHGVoice(url) {
    const audio = new Audio(`${API}/${url}`);
    audio.play();
}

// 2. Inventory Management (Reservation Logic)
function openSHGInventory() {
    scrollToTop();
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer') || '{}');
    openModal(`
        <span class="modal-handle"></span>
        <div class="modal-header">
            <div><div class="modal-title-ta">விளைபொருள் இருப்பு</div><div class="modal-title-en">Inventory Management</div></div>
            <div class="modal-close" onclick="closeModal()">✕</div>
        </div>
        
        <div class="info-card success mt-12">இங்கே உங்கள் விளைபொருட்களின் விற்பனை மற்றும் ஒதுக்கீட்டை நிர்வகிக்கலாம்.</div>
        
        <div id="inventory-list" class="mt-16">
            <div class="loading-state">🌿 பட்டியலைப் பெறுகிறது...</div>
        </div>
        
        <button class="btn-primary btn-full mt-16" onclick="openListProduceModal()">+ புதிய விளைபொருள் சேர் (Add New Listing)</button>
    `);
    
    loadMyInventory(farmer.farmer_id);
}

async function loadMyInventory(farmerId) {
    const el = document.getElementById('inventory-list');
    try {
        const res = await fetch(`${API}/api/marketplace/browse?farmer_id=${farmerId}`);
        const data = await res.json();
        
        if (!data.listings || data.listings.length === 0) {
            el.innerHTML = '<div class="info-card text-center">பதிவுகள் எதுவும் இல்லை.</div>';
            return;
        }
        
        el.innerHTML = data.listings.map(item => {
            const avail = item.quantity - (item.reserved_quantity||0) - (item.sold_quantity||0);
            return `
                <div class="glass-card mb-16 p-16 animate-pop" style="border-left:5px solid ${item.status==='active'?'var(--success)':'#888'}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div style="font-weight:800; font-size:1.1rem; color:var(--primary)">${item.crop}</div>
                        <span class="badge ${item.status==='active'?'bg-success':'bg-secondary'}" style="font-size:0.7rem">${item.status}</span>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:12px; text-align:center;">
                        <div style="background:#f1f8e9; padding:8px; border-radius:10px;">
                            <div style="font-size:0.7rem; color:#666">கிடைக்கும் (Stock)</div>
                            <div style="font-weight:700; color:var(--success)">${avail}kg</div>
                        </div>
                        <div style="background:#fff8e1; padding:8px; border-radius:10px;">
                            <div style="font-size:0.7rem; color:#666">ஒதுக்கீடு (Res)</div>
                            <div style="font-weight:700; color:#ff9800">${item.reserved_quantity||0}kg</div>
                        </div>
                        <div style="background:#e3f2fd; padding:8px; border-radius:10px;">
                            <div style="font-size:0.7rem; color:#666">விற்பனை (Sold)</div>
                            <div style="font-weight:700; color:var(--primary)">${item.sold_quantity||0}kg</div>
                        </div>
                    </div>
                    
                    <div class="mt-12 d-flex gap-8">
                        <button class="btn-sm btn-outline" style="flex:1" onclick="handleProduceSale('${item.id}', true)">நேரடி விற்பனை</button>
                        <button class="btn-sm btn-primary" style="flex:1" onclick="handleProduceSale('${item.id}', false)">ஒதுக்கீட்டில் விற்பனை</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) { el.innerHTML = "Error loading inventory."; }
}

async function handleProduceSale(listingId, isDirect) {
    const qty = prompt(isDirect ? "நேரடி விற்பனை அளவு (kg):" : "ஒதுக்கீட்டில் இருந்து விற்ற அளவு (kg):");
    if (!qty || isNaN(qty)) return;
    
    try {
        const res = await fetch(`${API}/api/marketplace/finalize-sale`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                listing_id: listingId,
                quantity: parseFloat(qty),
                is_direct: isDirect
            })
        });
        if (res.ok) {
            alert("விற்பனை பதிவாகியது!");
            loadMyInventory(JSON.parse(localStorage.getItem('vaani_farmer')).farmer_id);
        } else {
            const err = await res.json();
            alert(err.detail || "விற்பனை தோல்வி.");
        }
    } catch(e) { alert("Request failed."); }
}

function openListProduceModal() {
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    openModal(`
        <span class="modal-handle"></span>
        <div class="modal-header">
            <div><div class="modal-title-ta">புதிய விற்பனை பதிவு</div><div class="modal-title-en">Add New Farm Listing</div></div>
            <div class="modal-close" onclick="closeModal()">✕</div>
        </div>
        <div class="p-4">
            <div class="form-row">
                <label class="form-label">பயிர் / Crop</label>
                <input class="form-input" id="list-crop" placeholder="எ.கா: தக்காளி, நெல்">
            </div>
            <div class="form-row">
                <label class="form-label">அளவு (kg) / Quantity</label>
                <input class="form-input" id="list-qty" type="number" placeholder="100">
            </div>
            <div class="form-row">
                <label class="form-label">விலை (₹/kg) / Price</label>
                <input class="form-input" id="list-price" type="number" placeholder="35">
            </div>
            <button class="btn-primary btn-full mt-16" id="submit-listing-btn" onclick="submitNewListing()">சந்தையில் பதிவிடவும் (Post to Market)</button>
        </div>
    `);
}

async function submitNewListing() {
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    const crop = document.getElementById('list-crop').value;
    const qty = document.getElementById('list-qty').value;
    const price = document.getElementById('list-price').value;
    
    if (!crop || !qty || !price) { alert("தயவுசெய்து அனைத்து விவரங்களையும் நிரப்பவும்."); return; }
    
    const btn = document.getElementById('submit-listing-btn');
    btn.innerHTML = '⌛ பதிவாகிறது...';
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API}/api/marketplace/list`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                farmer_id: farmer.farmer_id,
                name: farmer.name,
                crop: crop,
                quantity: parseFloat(qty),
                price: parseFloat(price),
                harvest_date: new Date().toISOString().split('T')[0],
                district: farmer.district,
                shg_id: farmer.shg_id || null
            })
        });
        if (res.ok) {
            const data = await res.json();
            alert("வெற்றிகரமாக பதிவாகியது!");
            openSHGInventory(); // Refresh list
        }
    } catch(e) { alert("Listing failed."); }
}

// 3. Leader Management
function openLeaderDashboard() {
    scrollToTop();
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    openModal(`
        <span class="modal-handle"></span>
        <div class="modal-header">
            <div><div class="modal-title-ta">குழுத் தலைவி தளம்</div><div class="modal-title-en">Leader Panel</div></div>
            <div class="modal-close" onclick="closeModal()">✕</div>
        </div>
        
        <div style="display:flex; background:#f0f0f0; border-radius:12px; padding:4px; margin-top:12px;">
            <button class="tab-btn active" id="tab-req" onclick="showLeaderTab('requests')" style="flex:1; border:none; padding:10px; border-radius:10px; font-weight:700; cursor:pointer;">விண்ணப்பங்கள்</button>
            <button class="tab-btn" id="tab-sale" onclick="showLeaderTab('sales')" style="flex:1; border:none; padding:10px; border-radius:10px; font-weight:700; cursor:pointer; background:transparent;">குழு விற்பனை</button>
        </div>
        
        <div id="leader-content" class="mt-16">
            <div class="loading-state">🌿 தரவுகள் சேகரிக்கப்படுகிறது...</div>
        </div>
    `);
    showLeaderTab('requests');
}

function showLeaderTab(tab) {
    const reqBtn = document.getElementById('tab-req');
    const saleBtn = document.getElementById('tab-sale');
    const content = document.getElementById('leader-content');
    
    if (tab === 'requests') {
        reqBtn.style.background = '#fff';
        saleBtn.style.background = 'transparent';
        loadPendingRequests();
    } else {
        saleBtn.style.background = '#fff';
        reqBtn.style.background = 'transparent';
        content.innerHTML = '<div class="info-card text-center">குழு உறுப்பினர்களின் மொத்த விற்பனை விவரங்கள் இங்கே விரைவில் தோன்றும்.</div>';
    }
}

async function loadPendingRequests() {
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    const content = document.getElementById('leader-content');
    try {
        const res = await fetch(`${API}/api/shg/pending-requests?shg_id=${farmer.shg_id || 'shg_1'}`);
        const data = await res.json();
        const reqs = data.requests || [];
        
        if (reqs.length === 0) {
            content.innerHTML = '<div class="info-card text-center">புதிய விண்ணப்பங்கள் எதுவும் இல்லை.</div>';
            return;
        }
        
        content.innerHTML = reqs.map(r => `
            <div class="glass-card mb-12 p-12 d-flex justify-content-between align-items-center animate-pop" style="border-left:4px solid var(--accent)">
                <div>
                    <div style="font-weight:700">${r.farmer_name}</div>
                    <small class="text-muted">${r.phone || ''}</small>
                </div>
                <div class="d-flex gap-8">
                    <button class="btn-sm btn-primary" onclick="handleSHGJoinRequest('${r.id}', 'approve')">சரி</button>
                    <button class="btn-sm btn-outline" onclick="handleSHGJoinRequest('${r.id}', 'reject')">வேண்டாம்</button>
                </div>
            </div>
        `).join('');
    } catch(e) { content.innerHTML = "Error loading requests."; }
}

async function handleSHGJoinRequest(reqId, action) {
    const farmer = JSON.parse(localStorage.getItem('vaani_farmer'));
    try {
        const res = await fetch(`${API}/api/shg/handle-request`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                request_id: reqId,
                shg_id: farmer.shg_id,
                action: action
            })
        });
        if (res.ok) {
            alert(action === 'approve' ? "உறுப்பினர் சேர்க்கப்பட்டார்!" : "விண்ணப்பம் நிராகரிக்கப்பட்டது.");
            loadPendingRequests();
        }
    } catch(e) { alert("Failed to process request."); }
}
