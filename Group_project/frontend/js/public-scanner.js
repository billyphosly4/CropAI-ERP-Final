/**
 * CropAI Public Scanner Logic
 * Handles image preview, upload, and AI analysis for guest users.
 */

// 1. Dynamic API URL targeting (Works on Localhost, Ngrok, and Render)
const API_BASE_URL = window.location.origin + '/api';

// 2. DOM Elements
const fileInput = document.getElementById('publicFile');
const uploadArea = document.getElementById('publicUploadArea');
const preview = document.getElementById('publicPreview');
const imgDisplay = document.getElementById('imgDisplay');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('publicResult');

// 3. Handle Image Selection & Preview
fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imgDisplay.src = e.target.result;
            uploadArea.style.display = 'none';
            preview.style.display = 'block';
            resultDiv.style.display = 'none'; // Hide old results
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// 4. Handle AI Analysis
analyzeBtn.addEventListener('click', async () => {
    if (!fileInput.files[0]) return alert("Please capture or select an image first!");

    // UI Feedback: Show Loading State
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing Patterns...';
    resultDiv.style.display = 'none';

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            headers: {
                "ngrok-skip-browser-warning": "true" // Bypass ngrok landing page
            }
        });

        const result = await response.json();

        if (response.ok) {
            // 5. Robust Data Parsing
            // AI models sometimes wrap JSON in markdown backticks; this cleans it.
            let data = result.data;
            if (typeof data === 'string') {
                try {
                    const jsonMatch = data.match(/\{[\s\S]*\}/);
                    data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                }
            }

            // 6. Update UI with AI Data
            document.getElementById('diseaseHeader').textContent = data.disease || "Analysis Complete";
            document.getElementById('cropType').textContent = data.crop || "Not Specified";
            document.getElementById('cropStatus').textContent = data.status || "Healthy";
            
            // Handle treatments as either an array or a string
            const treatments = data.treatments || "No specific treatment steps identified.";
            document.getElementById('cropTreatment').textContent = Array.isArray(treatments) 
                ? treatments.join(', ') 
                : treatments;

            // Reveal Result Card
            resultDiv.style.display = 'block';
            resultDiv.scrollIntoView({ behavior: 'smooth' });

        } else {
            throw new Error(result.error || "The AI engine is currently busy.");
        }
    } catch (err) {
        console.error("Scanner Error:", err);
        alert("Scan Failed: " + err.message);
    } finally {
        // Reset Button State
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = 'Analyze with AI';
    }
});

/**
 * LOGOUT HELPER (If included in this script)
 */
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}
            document.getElementById('cropTreatment').textContent = Array.isArray(treatmentList) 
                ? treatmentList.join(', ') 
                : treatmentList;

        } else {
            throw new Error(result.error || "AI failed to analyze image");
        }
    } catch (err) {
        spinner.style.display = 'none';
        preview.style.display = 'block';
        alert("Error: " + err.message);
        console.error("Scanner Error:", err);
    }
});
