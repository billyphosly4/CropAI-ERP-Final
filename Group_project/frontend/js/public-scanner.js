/**
 * CropAI Public Scanner Logic
 * Optimized for Build-with-AI Hackathon 2026
 * Handles: File-based uploads, Absolute Pathing, and Robust AI Parsing.
 */

// 1. DYNAMIC API TARGETING
// Ensures requests hit the root domain regardless of subfolder depth
const API_BASE_URL = window.location.origin + '/api';

// 2. DOM ELEMENT SELECTION
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('publicUploadArea');
const preview = document.getElementById('publicPreview');
const imgDisplay = document.getElementById('imgDisplay');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('publicResult');
const spinner = document.getElementById('spinner');
const resultImg = document.getElementById('resultImgDisplay');

// Global reference for the file to be uploaded
let selectedFile = null;

// 3. IMAGE PREVIEW LOGIC
fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        selectedFile = this.files[0];
        
        // Safety check for file size (10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            alert("File too large. Please select an image under 10MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imgDisplay.src = e.target.result; // Set local preview image
            
            // UI Transition: Show Preview, Hide Upload Area
            uploadArea.style.display = 'none';
            preview.style.display = 'block';
            resultDiv.style.display = 'none'; // Clear previous results
            spinner.style.display = 'none';
        };
        reader.readAsDataURL(selectedFile);
    }
});

// 4. AI ANALYSIS LOGIC
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return alert("Please select a leaf image first!");

    const formData = new FormData();
    formData.append('image', selectedFile);

    // UI State: Enter "Thinking" Mode
    preview.style.display = 'none';
    spinner.style.display = 'block';
    resultDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            headers: {
                // Bypass ngrok landing page warnings during testing
                "ngrok-skip-browser-warning": "69420" 
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }

        const result = await response.json();

        // 5. ROBUST AI PARSING
        // Extracts JSON even if AI wraps it in markdown backticks or conversational text
        let analysis = result.data;
        if (typeof analysis === 'string') {
            try {
                const jsonMatch = analysis.match(/\{[\s\S]*\}/);
                analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            } catch (e) {
                console.error("Critical: AI returned malformed data:", e);
                analysis = {};
            }
        }

        // 6. UI POPULATION
        spinner.style.display = 'none';
        resultDiv.style.display = 'block';
        
        // Transfer the local image to the Result Card
        resultImg.src = imgDisplay.src;

        // Map results to HTML elements
        document.getElementById('diseaseHeader').textContent = analysis.disease || "Diagnosis Complete";
        document.getElementById('cropType').textContent = analysis.crop || "Not Identified";
        document.getElementById('cropStatus').textContent = analysis.status || "Analyzed";
        
        // Handle Treatment Plan (Handles both Arrays and Strings)
        const treatmentElement = document.getElementById('cropTreatment');
        const treatmentData = analysis.treatments || "Refer to agricultural guidelines.";
        
        treatmentElement.textContent = Array.isArray(treatmentData) 
            ? treatmentData.join('. ') 
            : treatmentData;

        // Auto-scroll to the Result Card for better UX
        resultDiv.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error("Diagnostic Error:", err);
        spinner.style.display = 'none';
        preview.style.display = 'block'; // Allow user to try again
        alert("Scanning failed: " + err.message);
    }
});

/**
 * HELPER: Reset Diagnostic Hub
 * Linked to "New Scan" button in HTML
 */
function resetScanner() {
    selectedFile = null;
    fileInput.value = "";
    uploadArea.style.display = 'block';
    preview.style.display = 'none';
    resultDiv.style.display = 'none';
    spinner.style.display = 'none';
}
fileInput.addEventListener('change', () => loadSelectedImage(fileInput));

// Analyze Button Click Logic
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return alert("Please select or capture an image!");

    const formData = new FormData();
    formData.append('image', selectedFile);

    // Transition UI to loading
    preview.style.display = 'none';
    spinner.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/ai/public-detect`, {
            method: 'POST',
            body: formData,
            headers: { "ngrok-skip-browser-warning": "69420" }
        });

        const result = await response.json();

        if (response.ok) {
            // Transfer current preview image to the results card
            document.getElementById('resultImgDisplay').src = imgDisplay.src;

            // Extract AI data (Handles raw JSON or Markdown-wrapped JSON)
            let data = result.data || {};
            if (typeof data === 'string') {
                const match = data.match(/\{[\s\S]*\}/);
                data = match ? JSON.parse(match[0]) : {};
            }

            // Populate Results UI
            document.getElementById('diseaseHeader').textContent = data.disease || "Diagnosis Found";
            document.getElementById('cropType').textContent = data.crop || "Unknown Crop";
            document.getElementById('cropStatus').textContent = data.status || "Analyzed";
            
            const treatment = data.treatments || "Refer to manual for treatment steps.";
            document.getElementById('cropTreatment').textContent = Array.isArray(treatment) 
                ? treatment.join(', ') 
                : treatment;

            // Final UI Reveal
            spinner.style.display = 'none';
            resultDiv.style.display = 'block';
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
