/**
 * Authentication & Security Controller
 * Handles Login, Registration, Session Management, and Page Guarding.
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // ==========================================
    // NEW: HANDLE EMAIL VERIFICATION REDIRECT
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true' && loginForm) {
        // Create a beautiful success banner
        const successBanner = document.createElement('div');
        successBanner.style.cssText = `
            background: #d4edda; 
            color: #155724; 
            padding: 1rem; 
            border-radius: 8px; 
            margin-bottom: 1.5rem; 
            text-align: center; 
            border: 1px solid #c3e6cb;
            font-weight: 600;
        `;
        successBanner.innerHTML = '<i class="fas fa-check-circle"></i> Email verified successfully! You may now log in.';
        
        // Insert it right above the login form
        loginForm.parentNode.insertBefore(successBanner, loginForm);
        
        // Clean up the URL so it doesn't stay there if they refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 1. UPDATED REGISTRATION LOGIC
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Select all new fields
            const fullName = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            
            // Validation: Ensure passwords match
            if (password !== confirmPassword) {
                alert("Passwords do not match. Please try again.");
                return;
            }

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Tell them to check their email!
                    alert('Account created successfully! Please check your email to verify your account.');
                    window.location.href = 'login.html'; 
                } else { 
                    throw new Error(data.error || 'Registration failed'); 
                }
            } catch (error) { 
                alert(error.message); 
            } finally { 
                submitBtn.innerHTML = 'Create My Account <i class="fas fa-check-circle" style="margin-left: 8px;"></i>'; 
                submitBtn.disabled = false; 
            }
        });
    }

    // 2. LOGIN LOGIC
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    window.location.replace('dashboard.html');
                } else { 
                    throw new Error(data.error); 
                }
            } catch (error) {
                // If they aren't verified, this will show the backend's "Please verify your email" error
                alert(error.message);
                submitBtn.innerHTML = 'Log In to Dashboard <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>';
                submitBtn.disabled = false;
            }
        });
    }

    updateAuthUI();
});

// 3. GLOBAL LOGOUT
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logout-btn');
    if (btn) {
        e.preventDefault();
        if (confirm("Sign out of CropAI?")) {
            localStorage.removeItem('token');
            window.location.replace('/index.html');
        }
    }
});

/**
 * UI SYNC & SECURITY GUARD
 */
function updateAuthUI() {
    const token = localStorage.getItem('token');
    const guestOnlyElements = document.querySelectorAll('.guest-only');
    const authOnlyElements = document.querySelectorAll('.auth-only');
    const currentPage = window.location.pathname;

    if (token) {
        guestOnlyElements.forEach(el => el.style.display = 'none');
        authOnlyElements.forEach(el => {
            el.style.display = (el.tagName === 'LI') ? 'block' : 'flex';
        });
    } else {
        guestOnlyElements.forEach(el => el.style.display = 'block');
        authOnlyElements.forEach(el => el.style.display = 'none');

        const restrictedPages = ['dashboard.html', 'hardware.html', 'history.html'];
        const isRestricted = restrictedPages.some(page => currentPage.includes(page));
        
        if (isRestricted) {
            window.location.replace('login.html');
        }
    }
}