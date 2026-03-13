/**
 * Dashboard Controller
 * Manages sensor polling, AI image analysis, user personalization, and alerts.
 */

const API_BASE_URL = '/api'; 

// DOM Selectors
const uploadArea = document.getElementById('uploadArea');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const imageInput = document.getElementById('imageInput');
const analysisModal = document.getElementById('analysisModal');
const analysisResult = document.getElementById('analysisResult');
const loadingSpinner = document.getElementById('loading-spinner');
const alertsList = document.getElementById('alertsList'); // Added Alerts DOM

document.addEventListener('DOMContentLoaded', () => {
    startSensorPolling();
    fetchUserProfile(); 
    
    // Preview image on selection
    if(imageInput) {
        imageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    uploadArea.style.display = 'none';
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
});

// --- 1. PERSONALIZATION LOGIC ---
async function fetchUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) return; // Leave as "Farmer" if it's a guest

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const firstName = data.fullName.split(' ')[0];
            
            // Specifically target the span, not the whole H1
            const welcomeName = document.getElementById('welcome-name');
            if (welcomeName) {
                welcomeName.textContent = firstName;
            }
        }
    } catch (err) {
        console.warn("Failed to load user profile for personalization.");
    }
}

// --- 2. AI SCANNER LOGIC (SMART ROUTING) ---
async function analyzeImage() {
    const file = imageInput.files[0];
    if (!file) return;

    analysisModal.style.display = 'flex';
    loadingSpinner.style.display = 'block';
    analysisResult.style.display = 'none';
    
    const formData = new FormData();
    formData.append('image', file);
    
    // Check if user is logged in to decide which endpoint to hit
    const token = localStorage.getItem('token');
    const endpoint = token ? `${API_BASE_URL}/ai/detect` : `${API_BASE_URL}/ai/public-detect`;
    
    // Setup headers (only include Authorization if token exists)
    const headers = { 'ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Analysis failed');

        loadingSpinner.style.display = 'none';
        displayResults(result.data);

    } catch (error) {
        console.error("AI Error:", error);
        alert("Diagnostic Error: " + error.message);
        closeModal();
    }
}

function displayResults(data) {
    analysisResult.style.display = 'block';
    document.getElementById('diseaseName').textContent = data.disease;
    document.getElementById('symptoms').textContent = `Detected in ${data.crop}. Status: ${data.status}`;
    
    const badge = document.getElementById('severityBadge');
    badge.textContent = data.status;
    // Ensure CSS classes match the status output (e.g., .healthy, .infected)
    badge.className = `severity ${data.status.toLowerCase()}`;

    const treatments = data.treatments && data.treatments.length > 0
        ? data.treatments.map(t => `<li style="margin-bottom:8px;"><i class="fas fa-check-circle" style="color:#2ecc71;"></i> ${t}</li>`).join('')
        : "No specific treatment required.";
        
    document.getElementById('treatment').innerHTML = `<ul style="list-style:none; padding:0; font-size:0.9rem;">${treatments}</ul>`;
}

function resetUpload() {
    imageInput.value = '';
    previewContainer.style.display = 'none';
    uploadArea.style.display = 'block';
}

function closeModal() {
    analysisModal.style.display = 'none';
    resetUpload();
}

// --- 3. IOT SENSOR POLLING & ALERTS ---
function startSensorPolling() {
    const fetchSensors = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/iot/sensors/latest`);
            const data = await res.json();
            
            if (data.temperature !== undefined) {
                // Update numerical values
                document.getElementById('temperatureValue').textContent = `${data.temperature}°C`;
                document.getElementById('moistureValue').textContent = `${data.soilMoisture}%`;
                document.getElementById('humidityValue').textContent = `${data.humidity}%`;

                // Check for critical conditions and update the alerts UI
                if (alertsList) {
                    if (data.soilMoisture < 30) {
                        alertsList.innerHTML = `
                            <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; border-left: 5px solid #ef4444; margin-bottom: 10px; font-weight: 500;">
                                <i class="fas fa-exclamation-triangle"></i> CRITICAL: Soil moisture low. Irrigate soon.
                            </div>`;
                    } else {
                        alertsList.innerHTML = `
                            <div style="background: #dcfce7; color: #166534; padding: 15px; border-radius: 8px; border-left: 5px solid #22c55e; margin-bottom: 10px; font-weight: 500;">
                                <i class="fas fa-check-circle"></i> Farm conditions are optimal.
                            </div>`;
                    }
                }
            }
        } catch (e) { 
            console.warn("Sensor sync idle. Is the simulator running?"); 
        }
    };
    
    fetchSensors(); // Run immediately
    setInterval(fetchSensors, 5000); // Poll every 5 seconds
}