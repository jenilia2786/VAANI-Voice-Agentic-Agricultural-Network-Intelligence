// VAANI — features_sentinel.js (Pest Predictor Map)

function showPestOutbreak() {
    scrollToTop();
    const district = farmer.district || 'Madurai';
    
    openModal(`
        <span class="modal-handle"></span>
        <div class="modal-header">
            <div><div class="modal-title-ta">🐛 பூச்சி வெடிப்பு கணிப்பான்</div><div class="modal-title-en">Sentinel Risk Heatmap</div></div>
            <div class="modal-close" onclick="closeModal()">✕</div>
        </div>
        
        <div class="info-card alert mt-12"><b>⚠️ சமூக எச்சரிக்கை:</b> உங்கள் வட்டத்தில் கண்டறியப்பட்ட பூச்சி வெடிப்பு பகுதிகள் கீழே காட்டப்பட்டுள்ளன.</div>
        
        <style>
            .pulse-red {
                box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
                animation: pulse-red 2s infinite;
                border-radius: 50%;
            }
            @keyframes pulse-red {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
            }
        </style>
        
        <div id="sentinel-map" style="height:400px; width:100%; border-radius:24px; margin-top:16px; border:3px solid #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index:1;"></div>
        
        <div id="sentinel-legend" class="mt-12" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <!-- Legend items added by JS -->
        </div>
        
        <div class="info-card success mt-16" id="sentinel-advice">
            <b>🛡️ பாதுகாப்பு ஆலோசனை:</b> வரைபடத்தில் சிவப்பு நிற வட்டங்கள் அதிக பாதிப்பை குறிக்கின்றன. அங்கு உங்கள் பயிர் இருந்தால் உடனே தடுப்பு மருந்துகளை தெளிக்கவும்.
        </div>
    `);
    
    setTimeout(() => initSentinelMap(district), 500);
}

async function initSentinelMap(district) {
    const mapEl = document.getElementById('sentinel-map');
    if (!mapEl) return;
    
    // Map coords for Tamil Nadu districts (fallback)
    const distCoords = {
        'Madurai': [9.9252, 78.1198],
        'Coimbatore': [11.0168, 76.9558],
        'Chennai': [13.0827, 80.2707],
        'Tiruchirappalli': [10.7905, 78.7047],
        'Salem': [11.6643, 78.1460]
    };
    
    const center = distCoords[district] || [11.1271, 78.6569];
    const map = L.map('sentinel-map').setView(center, 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    try {
        const res = await fetch(`${API}/api/crop/sentinel-data?district=${district}`);
        const data = await res.json();
        const hotspots = data.hotspots || [];
        
        let legendHtml = '';
        
        hotspots.forEach(pt => {
            const color = pt.severity === 'critical' ? '#f44336' : '#ff9800';
            const radius = pt.count * 150; // Scale radius by report count
            
            L.circle([pt.lat, pt.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.4,
                radius: radius
            }).addTo(map)
            .bindPopup(`<b>${pt.disease}</b><br>பாதிப்பு: ${pt.severity}<br>எண்ணிக்கை: ${pt.count} விவசாயி`);
            
            legendHtml += `
                <div style="font-size:0.75rem; background:#fff; padding:6px; border-radius:8px; display:flex; align-items:center; gap:6px; border:1px solid #eee;">
                    <div style="width:10px; height:10px; background:${color}; border-radius:50%;"></div>
                    <span>${pt.disease} (${pt.count})</span>
                </div>
            `;
        });
        
        document.getElementById('sentinel-legend').innerHTML = legendHtml;
        
        // Voice alert
        if (hotspots.length > 0) {
            speak(`எச்சரிக்கை! உங்கள் மாவட்ட சுற்றுப்புற கிராமங்களில் ${hotspots[0].disease} உள்ளிட்ட பூச்சி பாதிப்புகள் கண்டறியப்பட்டுள்ளன. வரைபடத்தை பார்த்து முன்னெச்சரிக்கை நடவடிக்கைகளை எடுக்கவும்.`);
        }
        
    } catch(e) {
        console.error("Map load failed", e);
    }
}
