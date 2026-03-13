// backend/controllers/authController.js
const bcrypt = require('bcryptjs'); // or 'bcrypt'
const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db'); 
const sendVerificationEmail = require('../utils/sendEmail');

exports.register = async (req, res) => {
    // Assuming your frontend register.html now also sends 'fullName'
    const { fullName, email, password } = req.body; 
    
    // Grab a dedicated client from the pool for the transaction
    const client = await pgPool.connect();

    try {
        await client.query('BEGIN'); // Start Transaction

        // 1. Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 2. Insert into users table (Added is_verified = false)
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3) RETURNING id',
            [email, hash, false]
        );
        const userId = userResult.rows[0].id;

        // 3. Insert into profiles table
        await client.query(
            'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
            [userId, fullName]
        );

        // 4. Commit the transaction to unlock the database quickly
        await client.query('COMMIT'); 

        // 5. Generate Token & Send Email
        const verificationToken = jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Await the email sending process
        await sendVerificationEmail(email, verificationToken);

        res.status(201).json({ 
            message: "Farmer account created! Please check your email to verify your account." 
        });

    } catch (err) {
        // If ANYTHING above fails (like a duplicate email), undo all database changes
        await client.query('ROLLBACK');
        console.error("Registration Error:", err.message);
        res.status(500).json({ error: "Registration failed. Email might already exist." });
    } finally {
        // ALWAYS release the client back to the pool to prevent memory leaks
        client.release();
    }
};