// backend/controllers/aiController.js
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const { Detection } = require('../models/mongoModels');

let model;

// 1. Load the Local Model into memory on server start
const loadModel = async () => {
    try {
        // Point to the model.json file you downloaded from Teachable Machine
        const modelPath = path.join(__dirname, '../ml_model/model.json');
        const handler = tf.io.fileSystem(modelPath);
        model = await tf.loadLayersModel(handler);
        console.log('🧠 Local Edge AI Model Loaded Successfully');
    } catch (error) {
        console.warn('⚠️ Local AI Model missing. Please place model files in backend/ml_model/');
    }
};
loadModel();

// 2. Define your Classes (THIS MUST MATCH YOUR TEACHABLE MACHINE ORDER EXACTLY)
// For example, if Class 1 was Healthy Maize, Class 2 was Streak Virus...
const CLASS_LABELS = [
    { crop: "Maize", disease: "Healthy", status: "Healthy", treatments: ["Continue normal maintenance."] },
    { crop: "Maize", disease: "Streak Virus", status: "Infected", treatments: ["Uproot infected plants", "Use resistant seed varieties"] },
    { crop: "Tomato", disease: "Late Blight", status: "Infected", treatments: ["Apply copper-based fungicide", "Ensure good plant spacing"] }
];

// 3. The main analysis function called by your routes
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
        
        // Match the index to our labels array
        const aiData = CLASS_LABELS[highestProbIndex];
        
        // Add a confidence score (e.g., 98%)
        aiData.confidence = Math.round(predictionsArray[highestProbIndex] * 100);

        // Memory Cleanup (CRITICAL: Prevents your Node server from crashing)
        tfImage.dispose();
        resizedImage.dispose();
        expandedImage.dispose();
        normalizedImage.dispose();

        // Save the result to MongoDB History
        const detectionRecord = await Detection.create({
            user_id: userId,
            ...aiData
        });

        // Delete the temporary uploaded image file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        return detectionRecord;

    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("Local AI Controller Error:", error.message);
        throw new Error("Failed to process image through local AI.");
    }
};

module.exports = { analyzeCropImage };