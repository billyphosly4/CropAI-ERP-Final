const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// --- DATABASE & MODELS ---
const { pgPool } = require('../config/db');
const { SensorLog, Detection } = require('../models/mongoModels');

// --- UTILS & CONTROLLERS ---
const sendVerificationEmail = require('../utils/sendEmail');
const { analyzeCropImage } = require('../controllers/aiController');

// --- MIDDLEWARE ---
const auth = require('../middleware/auth'); 
const optionalAuth = require('../middleware/optionalAuth');

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// ==========================================
// 1. AUTHENTICATION & PROFILES (PostgreSQL)
// ==========================================

// --- REGISTER ---
router.post('/auth/register', async (req, res) => {
    const { fullName, email, password } = req.body;
    
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const client = await pgPool.connect(); 

    try {
        await client.query('BEGIN'); 

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insert user with is_verified = false
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3) RETURNING id',
            [email, hash, false]
        );
        const userId = userResult.rows[0].id;

        // Insert into profiles
        await client.query(
            'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
            [userId, fullName]
        );

        await client.query('COMMIT'); 

        // Generate 1-hour verification token
        const verificationToken = jwt.sign(
            { id: userId }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // DYNAMICALLY build the tunnel-aware URL based on the request
        const protocol = req.protocol; 
        const host = req.get('host');  
        const fullVerificationUrl = `${protocol}://${host}/api/auth/verify/${verificationToken}`;

        // Send Email using the full, dynamic URL
        await sendVerificationEmail(email, fullVerificationUrl);
        
        res.status(201).json({ 
            message: "Account created! Please check your email to verify your account.", 
            user: { id: userId, email } 
        });

    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error("Registration Error:", err);
        
        if (err.code === '23505') { 
            res.status(400).json({ error: "This email is already registered." });
        } else {
            res.status(500).json({ error: "Server error during registration." });
        }
    } finally {
        client.release(); 
    }
});

// --- EMAIL VERIFICATION CATCH ---
router.get('/auth/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        await pgPool.query('UPDATE users SET is_verified = true WHERE id = $1', [decoded.id]);

        // Redirect to login page with a success query parameter
        res.redirect('/pages/login.html?verified=true');
    } catch (error) {
        res.status(400).send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2 style="color: #e74c3c;">Invalid or Expired Link ❌</h2>
                <p>Please try registering again or contact support.</p>
            </div>
        `);
    }
});

// --- LOGIN ---
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userQuery = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userQuery.rows.length === 0) return res.status(400).json({ error: "User not found" });
        
        const user = userQuery.rows[0];

        // SECURITY CHECK: Block unverified users
        if (!user.is_verified) {
            return res.status(403).json({ error: "Please verify your email address before logging in." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: "Login successful", token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- GET PROFILE ---
router.get('/auth/profile', auth, async (req, res) => {
    try {
        const result = await pgPool.query(
            `SELECT p.full_name, p.phone, p.location, u.email 
             FROM profiles p 
             JOIN users u ON p.user_id = u.id 
             WHERE u.id = $1`, [req.user.id]
        );
        res.json({
            fullName: result.rows[0].full_name,
            email: result.rows[0].email,
            phone: result.rows[0].phone,
            location: result.rows[0].location
        });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// --- UPDATE PROFILE ---
router.put('/auth/profile/update', auth, async (req, res) => {
    const { fullName, phone, location } = req.body;
    try {
        await pgPool.query(
            'UPDATE profiles SET full_name = $1, phone = $2, location = $3 WHERE user_id = $4',
            [fullName, phone, location, req.user.id]
        );
        res.json({ message: "Profile updated" });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// ==========================================
// 2. IOT SENSOR DATA (MongoDB)
// ==========================================

router.post('/iot/sensors', optionalAuth, async (req, res) => {
    const { temperature, humidity, soilMoisture } = req.body;
    const userId = req.user ? req.user.id : null;

    try {
        const newLog = await SensorLog.create({
            user_id: userId,
            temperature,
            humidity,
            soilMoisture
        });

        let alert = soilMoisture < 30 ? "CRITICAL: Soil moisture low. Irrigate soon." : "Optimal";
        res.status(201).json({ message: "Data received", alert, data: newLog });
    } catch (err) {
        res.status(500).json({ error: "Failed to log sensor data" });
    }
});

router.get('/iot/sensors/latest', async (req, res) => {
    try {
        const latestData = await SensorLog.findOne().sort({ timestamp: -1 });
        if (!latestData) return res.json({ temperature: '--', humidity: '--', soilMoisture: '--' });
        res.json(latestData);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sensor data" });
    }
});

// ==========================================
// 3. AI DETECTION & HISTORY (MongoDB)
// ==========================================

// Authenticated Detect (Saves to user dashboard)
router.post('/ai/detect', optionalAuth, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    try {
        const userId = req.user ? req.user.id : null;
        const result = await analyzeCropImage(req.file.path, req.file.mimetype, userId);
        
        res.json({ 
            message: userId ? "Saved to your dashboard." : "Analysis complete.", 
            data: result 
        });
    } catch (err) {
        res.status(500).json({ error: "AI analysis failed.", details: err.message });
    }
});

// Public Detect (Guest scan)
router.post('/ai/public-detect', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    try {
        const result = await analyzeCropImage(req.file.path, req.file.mimetype, null);
        res.json({ message: "Guest analysis complete.", data: result });
    } catch (err) {
        res.status(500).json({ error: "Public AI analysis failed.", details: err.message });
    }
});

// History Route (Strictly Protected)
router.get('/ai/history', auth, async (req, res) => {
    try {
        const history = await Detection.find({ user_id: req.user.id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

module.exports = router;