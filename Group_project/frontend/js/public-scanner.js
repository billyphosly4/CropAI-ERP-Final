/**
 * CropAI Public Scanner Logic
 * Fix: Image Persistence & Absolute Pathing
 */

const API_BASE_URL = window.location.origin + '/api';

const fileInput = document.getElementById('publicFile');
const uploadArea = document.getElementById('publicUploadArea');
const preview = document.getElementById('publicPreview');
const imgDisplay = document.getElementById('imgDisplay');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('publicResult');
const spinner = document.getElementById('spinner');
const resultImg = document.getElementById('resultImgDisplay'); // The new result image holder

// 1. Handle File Selection and local preview
fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imgDisplay.src = e.target.result; // Local data URL
            uploadArea.style.display = 'none';
            preview.style.display = 'block';
            resultDiv.style.display = 'none';
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// 2. Handle AI Request
analyzeBtn.addEventListener('click', async () => {
    if (!fileInput.files[0]) return alert("Please select an image!");

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    // UI state
    preview.style.display = 'none';
    spinner.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            headers: { "ngrok-skip-browser-warning": "true" }
        });

        const result = await response.json();

        if (response.ok) {
            // 🔥 TRANSFER IMAGE SOURCE
            // We move the image from the preview holder to the results holder
            resultImg.src = imgDisplay.src;

            // Robust JSON parsing (handles AI chatter)
            let data = result.data;
            if (typeof data === 'string') {
                const match = data.match(/\{[\s\S]*\}/);
                data = match ? JSON.parse(match[0]) : {};
            }

            // Populate Text Fields
            document.getElementById('diseaseHeader').textContent = data.disease || "Analysis Complete";
            document.getElementById('cropType').textContent = data.crop || "Identified Crop";
            document.getElementById('cropStatus').textContent = data.status || "Evaluated";
            
            const treatment = data.treatments || "Refer to manual.";
            document.getElementById('cropTreatment').textContent = Array.isArray(treatment) 
                ? treatment.join(', ') 
                : treatment;

            // Hide spinner and show the finalized card
            spinner.style.display = 'none';
            resultDiv.style.display = 'block';
            
            // Smoothly scroll to the result so judges see the card pop up
            resultDiv.scrollIntoView({ behavior: 'smooth' });

        } else {
            throw new Error(result.error || "AI Analysis failed.");
        }
    } catch (err) {
        spinner.style.display = 'none';
        preview.style.display = 'block';
        alert("Scanner Error: " + err.message);
    }
});
