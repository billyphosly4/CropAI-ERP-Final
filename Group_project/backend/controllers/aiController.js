// backend/controllers/aiController.js

// ==========================================
// 1. NODE V24 COMPATIBILITY FIX (POLYFILL)
// ==========================================
// This must stay at the very top. It prevents the 
// "(0 , util_1.isNullOrUndefined) is not a function" crash.
const util = require('util');
if (typeof util.isNullOrUndefined !== 'function') {
    util.isNullOrUndefined = function (obj) {
        return obj === null || obj === undefined;
    };
}

// ==========================================
// 2. IMPORTS & SETUP
// ==========================================
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const { Detection } = require('../models/mongoModels');

let model;

// --- Load the Local Model ---
const loadModel = async () => {
    try {
        const modelPath = path.join(__dirname, '../ml_model/model.json');
        const handler = tf.io.fileSystem(modelPath);
        model = await tf.loadLayersModel(handler);
        console.log('🧠 Local Edge AI Model Loaded Successfully');
    } catch (error) {
        console.warn('⚠️ Local AI Model missing. Please place model files in backend/ml_model/');
    }
};
loadModel();

// --- Define Classes ---
// ⚠️ IMPORTANT: These must match the exact order you trained them in Teachable Machine!
const CLASS_LABELS = [
    { crop: "Maize", disease: "Healthy", status: "Healthy", treatments: ["Continue normal maintenance."] },
    { crop: "Maize", disease: "Streak Virus", status: "Infected", treatments: ["Uproot infected plants", "Use resistant seed varieties"] },
    { crop: "Tomato", disease: "Late Blight", status: "Infected", treatments: ["Apply copper-based fungicide", "Ensure good plant spacing"] }
];

// ==========================================
// 3. MAIN ANALYSIS LOGIC
// ==========================================
const analyzeCropImage = async (filePath, mimeType, userId = null) => {
    try {
        if (!model) throw new Error("Local AI Model is offline.");

        // Read image and convert to a Tensor (Matrix)
        const imageBuffer = fs.readFileSync(filePath);
        const tfImage = tf.node.decodeImage(imageBuffer, 3); // 3 channels for RGB

        // Teachable Machine models require 224x224 images
        const resizedImage = tf.image.resizeBilinear(tfImage, [224, 224]);
        const expandedImage = resizedImage.expandDims(0);
        const normalizedImage = expandedImage.div(255.0); // Normalize pixels to 0-1

        // Run the prediction
        const predictionsArray = await model.predict(normalizedImage).data();
        
        // Find the index with the highest probability
        const highestProbIndex = predictionsArray.indexOf(Math.max(...predictionsArray));
        
        // Match the index to our labels array and clone it
        const resultData = { ...CLASS_LABELS[highestProbIndex] };
        
        // Add a confidence score (e.g., 98)
        resultData.confidence = Math.round(predictionsArray[highestProbIndex] * 100);

        // Memory Cleanup (CRITICAL: Prevents memory leaks and server crashes)
        tfImage.dispose();
        resizedImage.dispose();
        expandedImage.dispose();
        normalizedImage.dispose();

        // Save the result to MongoDB History
        const detectionRecord = await Detection.create({
            user_id: userId,
            ...resultData
        });

        // Delete the temporary uploaded image file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        return detectionRecord;

    } catch (error) {
        // Ensure file is deleted even if analysis fails
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("Local AI Controller Error:", error.message);
        throw new Error("Failed to process image through local AI.");
    }
};

module.exports = { analyzeCropImage };