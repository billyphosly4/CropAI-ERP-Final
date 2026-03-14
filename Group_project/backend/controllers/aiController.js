const fs = require('fs');
const { Detection } = require('../models/mongoModels');

/**
 * 1. MULTI-MODAL IMAGE ANALYSIS (Enhanced)
 * Identifying specific symptoms and detailed agricultural steps.
 */
const analyzeCropImage = async (filePath, mimeType, userId = null) => {
    try {
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');

        // Detailed prompt for deeper analysis
        const prompt = `Act as an expert Agricultural Pathologist. Analyze this leaf image.
        Provide a detailed diagnosis including:
        1. Specific Crop Type.
        2. Primary Disease/Pest name.
        3. Detailed symptom description.
        4. Status (Healthy or Infected).
        5. Actionable treatment plan with organic and chemical options.
        
        Return ONLY a raw JSON object: 
        {
            "crop": "string",
            "disease": "string",
            "status": "Healthy|Infected",
            "confidence": number,
            "symptoms": "Detailed description of leaf patterns observed",
            "treatments": ["Immediate Step", "Organic Fix", "Chemical Fix"],
            "prevention": "How to avoid this in the future"
        }`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "Qwen/Qwen3-VL-30B-A3B-Instruct",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]
                    }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let cleanContent = data.choices[0].message.content.trim();
        cleanContent = cleanContent.replace(/```json/gi, '').replace(/```/g, '').trim();

        const aiResponse = JSON.parse(cleanContent);

        // Save detailed record to MongoDB
        const detectionRecord = await Detection.create({
            user_id: userId,
            ...aiResponse,
            analyzedAt: new Date()
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return detectionRecord;

    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("AI Analysis Error:", error.message);
        throw error;
    }
};

/**
 * 2. PREDICTIVE INSIGHTS (Enhanced)
 * Combining user profile and IoT data for high-level expert advice.
 */
const generatePersonalizedInsight = async (userCrops, sensorData, imageResult) => {
    try {
        const prompt = `Farmer Profile: Growing ${userCrops}. 
        Current Environment: Temp ${sensorData?.temperature}°C, Humidity ${sensorData?.humidity}%.
        Recent Scan Result: ${imageResult.disease} in ${imageResult.crop}.
        
        Provide an expert agricultural summary.
        Return JSON ONLY: 
        {
            "alertHeadline": "string (Short & Urgent)",
            "expertRecommendation": "In-depth guide on recovery based on current weather",
            "futureRisk": "Risk level for surrounding crops",
            "economicImpact": "Low|Medium|High risk to yield"
        }`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V3.2",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2
            })
        });

        const data = await response.json();
        let clean = data.choices[0].message.content.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (err) {
        return { alertHeadline: "Data Sync Active", expertRecommendation: "Consult your local officer.", futureRisk: "Unknown" };
    }
};

/**
 * 3. ENVIRONMENTAL RISK PREDICTION (Enhanced)
 * Logic for regional warnings.
 */
const generateEnvironmentalRisk = async (crops, sensors) => {
    try {
        const prompt = `
        IoT Telemetry: Temp ${sensors.temperature}°C, Humidity ${sensors.humidity}%, Soil ${sensors.soilMoisture}%.
        Analyze risk for: ${crops}.
        
        Return JSON ONLY: 
        {
            "riskLevel": "Low|Medium|High",
            "predictedDisease": "Name of most likely disease",
            "likelyAffectedCrop": "Crop most at risk",
            "expertRecommendation": "What the farmer should do right now",
            "futureRisk": "How fast this could spread to neighboring farms"
        }`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V3.2",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1
            })
        });

        const data = await response.json();
        let clean = data.choices[0].message.content.trim().replace(/```json/gi, '').replace(/```/g, '');
        return JSON.parse(clean);
    } catch (err) {
        return null;
    }
};

module.exports = { analyzeCropImage, generatePersonalizedInsight, generateEnvironmentalRisk };
        const data = await response.json();

        if (data.error) {
            console.error("❌ Featherless Error:", data.error.message);
            throw new Error(data.error.message);
        }

        let cleanContent = data.choices[0].message.content.trim();
        cleanContent = cleanContent.replace(/```json/gi, '').replace(/```/g, '').trim();

        const aiResponse = JSON.parse(cleanContent);

        const detectionRecord = await Detection.create({
            user_id: userId,
            ...aiResponse
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return detectionRecord;

    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("AI Controller Error:", error.message);
        throw error;
    }
};

/**
 * 2. PREDICTIVE INSIGHTS
 * Using DeepSeek V3.2 from your available model list
 */
const generatePersonalizedInsight = async (userCrops, sensorData, imageResult) => {
    try {
        const prompt = `Analyze: Crops: ${userCrops}, Temp: ${sensorData?.temperature}°C, Scan: ${imageResult.disease}. 
        Return JSON ONLY: {"alertHeadline": "string", "expertRecommendation": "string", "futureRisk": "string"}`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V3.2", // FIXED: Model from your list
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2
            })
        });

        const data = await response.json();
        let cleanContent = data.choices[0].message.content.trim();
        cleanContent = cleanContent.replace(/```json/gi, '').replace(/```/g, '').trim();

        return JSON.parse(cleanContent);
    } catch (err) {
        return null;
    }
};

/**
 * 3. ENVIRONMENTAL RISK PREDICTION
 * Predicts disease based on IoT telemetry.
 */
const generateEnvironmentalRisk = async (crops, sensors) => {
    try {
        const prompt = `
        Context: Agriculture sensor data.
        - Crops in area: ${crops}
        - Current Data: Temp ${sensors.temperature}°C, Humidity ${sensors.humidity}%, Soil Moisture ${sensors.soilMoisture}%
        
        Predict the most likely disease to occur in these conditions.
        Return JSON ONLY: 
        {
            "riskLevel": "Low|Medium|High",
            "predictedDisease": "string",
            "likelyAffectedCrop": "string",
            "expertRecommendation": "string",
            "futureRisk": "Description of spread"
        }`;

        const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FEATHERLESS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V3.2",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1
            })
        });

        const data = await response.json();
        let clean = data.choices[0].message.content.trim().replace(/```json/gi, '').replace(/```/g, '');
        return JSON.parse(clean);
    } catch (err) {
        console.error("Prediction Error:", err);
        return null;
    }
};

module.exports = { analyzeCropImage, generatePersonalizedInsight };
