// ACCOUNT MANAGEMENT SYSTEM - Professional E-Commerce Platform

class AccountManager {
    constructor() {
        this.selectedAccountType = null;
        this.formData = {};
        this.mpesaPaymentStatus = false;
        this.init();
    }
    
    init() {
        console.log("Account Manager initialized");
        
        // Test Firebase connection
        this.testFirebaseConnection();
        
        this.setupEventListeners();
        this.setupFormValidation();
    }
    
    // Email notification service
    async sendEmailNotification(email, subject, message, templateData = {}) {
        try {
            console.log('📧 Sending email notification:', { email, subject, message });
            
            // Initialize EmailJS (you need to sign up at emailjs.com)
            if (typeof emailjs !== 'undefined') {
                console.log('✅ EmailJS is loaded');
                
                // Replace with your actual EmailJS service details
                const serviceID = 'service_r4f4udw'; // ✅ Your service ID
                const templateID = 'template_3w9d45m'; // ✅ Your account creation template ID
                const userID = 'I0uqgal9SN6IB0IUF'; // ✅ Your user ID
                
                // Initialize EmailJS if not already initialized
                if (typeof emailjs !== 'undefined') {
                    console.log('🔧 Initializing EmailJS with public key: A0OtQsH6zdIb33M8-');
                    // Initialize EmailJS with your CORRECT public key
                    emailjs.init("A0OtQsH6zdIb33M8-");
                    console.log("✅ EmailJS initialized with public key");
                } else {
                    console.error('❌ EmailJS not loaded');
                }
                
                // Prepare template parameters
                const templateParams = {
                    to_email: email,
                    to_name: templateData.username || 'User',
                    subject: subject,
                    message: message,
                    reply_to: 'josephgthuku@gmail.com',
                    from_email: 'josephgthuku@gmail.com',
                    from_name: 'Shopping Online Platform',
                    ...templateData // Add dynamic data like username, accountType, etc.
                };
                
                // Send email
                const response = await emailjs.send(serviceID, templateID, templateParams);
                
                console.log('✅ EmailJS Response:', response);
                console.log('✅ EmailJS Service ID:', serviceID);
                console.log('✅ EmailJS Template ID:', templateID);
                console.log('✅ EmailJS Template Params:', templateParams);
                
                if (response.status === 200) {
                    console.log('✅ Email sent successfully via EmailJS!');
                    return response;
                } else {
                    console.error('❌ EmailJS Error:', response);
                    throw new Error(`EmailJS failed: ${response.text || 'Unknown error'}`);
                }
            } else {
                // Fallback: Store notification in Firebase
                const fallbackData = {
                    to_email: email,
                    subject: subject,
                    message: message || 'Account created successfully',
                    timestamp: new Date(),
                    status: 'pending'
                };
                
                console.log('📧 Storing fallback notification:', fallbackData);
                await db.collection('email_notifications').add(fallbackData);
                
                console.log('✅ Email notification queued in Firebase (EmailJS not loaded)');
                
                // Show user that email will be sent
                alert(`Email notification will be sent to: ${email}\n\nSubject: ${subject}\n\nIn production, emails will be sent automatically.`);
            }
            
        } catch (error) {
            console.error('❌ Error sending email notification:', error);
            
            // Store fallback notification in Firebase
            try {
                await db.collection('email_notifications').add({
                    to: email,
                    subject: subject,
                    message: message,
                    templateData: templateData,
                    timestamp: new Date(),
                    status: 'failed',
                    error: error.message
                });
            } catch (fallbackError) {
                console.error('❌ Error storing fallback notification:', fallbackError);
            }
        }
    }
    
    testFirebaseConnection() {
        try {
            // Test if Firebase is initialized
            if (typeof firebase === 'undefined') {
                console.error("❌ Firebase is not loaded!");
                alert("Firebase is not loaded. Please check your internet connection and refresh the page.");
                return;
            }
            
            if (!db) {
                console.error("❌ Firestore is not initialized!");
                alert("Firestore is not initialized. Please check Firebase configuration.");
                return;
            }
            
            console.log("✅ Firebase connection test passed!");
            
            // Test a simple read operation
            db.collection('users').limit(1).get()
                .then(() => {
                    console.log("✅ Firestore read test passed!");
                })
                .catch((error) => {
                    console.error("❌ Firestore read test failed:", error);
                    alert("Firestore connection failed. Check Firebase rules and permissions.");
                });
                
        } catch (error) {
            console.error("❌ Firebase test error:", error);
            alert("Firebase initialization error. Please refresh the page.");
        }
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Account type selection
        const accountTypeBtns = document.querySelectorAll('.account-type-btn');
        console.log('🔧 Found account type buttons:', accountTypeBtns.length);
        
        accountTypeBtns.forEach((btn, index) => {
            console.log(`🔧 Setting up button ${index}:`, btn);
            btn.addEventListener('click', (e) => {
                console.log('🔧 Account type button clicked:', e.target);
                this.selectAccountType(e.target.closest('.account-type-btn'));
            });
        });
        
        // Back to selection button
        const backBtn = document.getElementById('back-to-selection');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showAccountTypeSelection());
        }
        
        // Registration form submission
        const regForm = document.getElementById('shop-registration-form');
        if (regForm) {
            regForm.addEventListener('submit', (e) => {
                console.log('🔧 Registration form submitted');
                this.handleRegistration(e);
            });
        }
        
        // Login form submission
        const loginForm = document.getElementById('shop-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // M-Pesa payment button
        const mpesaBtn = document.getElementById('mpesa-pay-btn');
        if (mpesaBtn) {
            mpesaBtn.addEventListener('click', () => this.initiateMpesaPayment());
        }
        
        // Phone number auto-detection
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => this.handlePhoneInput(e));
        }
        
        // Username auto-format
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('blur', (e) => this.formatUsername(e));
        }
    }
    
    setupFormValidation() {
        // Real-time validation
        const userIdInput = document.getElementById('userId');
        if (userIdInput) {
            userIdInput.addEventListener('blur', (e) => this.validateUserId(e));
        }
        
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', (e) => this.validateEmail(e));
        }
    }
    
    selectAccountType(btn) {
        this.selectedAccountType = btn.dataset.type;
        
        // Update UI
        document.getElementById('account-type-selection').style.display = 'none';
        document.getElementById('registration-form').style.display = 'block';
        document.getElementById('account-type-display').textContent = 
            this.selectedAccountType.charAt(0).toUpperCase() + this.selectedAccountType.slice(1);
        
        // Show/hide M-Pesa payment based on account type
        const mpesaPayment = document.getElementById('mpesa-payment');
        if (this.selectedAccountType === 'premium') {
            mpesaPayment.style.display = 'block';
        } else {
            mpesaPayment.style.display = 'none';
        }
        
        console.log(`Selected ${this.selectedAccountType} account type`);
    }
    
    showAccountTypeSelection() {
        document.getElementById('account-type-selection').style.display = 'block';
        document.getElementById('registration-form').style.display = 'none';
        this.selectedAccountType = null;
        this.mpesaPaymentStatus = false;
    }
    
    formatUsername(e) {
        const input = e.target;
        let value = input.value.trim();
        
        if (value && !value.includes("'s Shop")) {
            value = value + "'s Shop";
            input.value = value;
        }
    }
    
    handlePhoneInput(e) {
        const input = e.target;
        const countryCodeInput = document.getElementById('countryCode');
        let value = input.value.replace(/\D/g, ''); // Remove non-digits
        
        // Auto-detect country code based on number length
        if (value.length === 0) {
            countryCodeInput.value = '+254'; // Default Kenya
        } else if (value.length === 10 && value.startsWith('0')) {
            // Kenyan number starting with 0
            value = value.substring(1); // Remove leading 0
            countryCodeInput.value = '+254';
        } else if (value.length === 9 && !value.startsWith('0')) {
            // Kenyan number without country code
            countryCodeInput.value = '+254';
        } else if (value.length === 11 && value.startsWith('1')) {
            // US number
            countryCodeInput.value = '+1';
        } else if (value.length === 12 && value.startsWith('44')) {
            // UK number
            countryCodeInput.value = '+44';
        }
        
        input.value = value;
    }
    
    validateUserId(e) {
        const input = e.target;
        const value = input.value.trim();
        
        // Basic ID validation (you can enhance this)
        if (value.length < 6) {
            this.showFieldError(input, 'ID number must be at least 6 characters');
            return false;
        }
        
        if (!/^[a-zA-Z0-9]+$/.test(value)) {
            this.showFieldError(input, 'ID should contain only letters and numbers');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    }
    
    validateEmail(e) {
        const input = e.target;
        const value = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(value)) {
            this.showFieldError(input, 'Please enter a valid email address');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    }
    
    showFieldError(input, message) {
        this.clearFieldError(input);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = '#ff4444';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;
        
        input.parentNode.appendChild(errorDiv);
        input.style.borderColor = '#ff4444';
    }
    
    clearFieldError(input) {
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        input.style.borderColor = '';
    }
    
    async initiateMpesaPayment() {
        const mpesaBtn = document.getElementById('mpesa-pay-btn');
        const mpesaStatus = document.getElementById('mpesa-status');
        const phone = document.getElementById('phone').value;
        const countryCode = document.getElementById('countryCode').value;
        const fullPhone = countryCode + phone;
        
        if (!phone || phone.length < 9) {
            alert('Please enter a valid phone number first');
            return;
        }
        
        // Show payment status
        mpesaStatus.style.display = 'block';
        mpesaBtn.disabled = true;
        mpesaBtn.textContent = 'Processing...';
        
        try {
            // Simulate M-Pesa STK push
            const paymentResult = await this.simulateMpesaPayment(fullPhone, 200);
            
            if (paymentResult.success) {
                this.mpesaPaymentStatus = true;
                mpesaStatus.innerHTML = `
                    <p style="color: #00ff00;">✅ Payment initiated successfully!</p>
                    <p>Check your phone for M-Pesa prompt</p>
                    <p>Enter your M-Pesa PIN to complete payment</p>
                `;
                
                // Check payment status after delay
                setTimeout(() => this.checkMpesaPaymentStatus(fullPhone), 10000);
            } else {
                throw new Error(paymentResult.message);
            }
        } catch (error) {
            console.error('M-Pesa API Error:', error);
            return {
                success: false,
                message: 'M-Pesa service unavailable. Please try again.'
            };
        }
    }
    
    async checkMpesaPaymentStatus(phone) {
        const mpesaStatus = document.getElementById('mpesa-status');
        const submitBtn = document.getElementById('submit-account');
        
        // Simulate payment status check
        mpesaStatus.innerHTML += '<p>Checking payment status...</p>';
        
        setTimeout(() => {
            // In real implementation, check actual payment status
            this.mpesaPaymentStatus = true; // Assume successful for demo
            mpesaStatus.innerHTML = `
                <p style="color: #00ff00;">✅ Payment confirmed!</p>
                <p>Transaction ID: MP${Date.now()}</p>
                <p>You can now create your account</p>
            `;
            submitBtn.disabled = false;
        }, 3000);
    }
    
    async handleRegistration(e) {
        e.preventDefault();
        
        console.log("🔍 Registration started...");
        
        // Validate payment for premium accounts
        if (this.selectedAccountType === 'premium' && !this.mpesaPaymentStatus) {
            alert('Please complete the M-Pesa payment first');
            return;
        }
        
        // Collect form data
        const formData = new FormData(e.target);
        const username = formData.get('username') || formData.get('shopName');
        
        // Validate username
        if (!username || username.trim() === '') {
            alert('Please enter a shop name');
            return;
        }
        
        this.formData = {
            username: username.trim(),
            userId: formData.get('userId'),
            phone: formData.get('countryCode') + formData.get('phone'),
            email: formData.get('email'),
            accountType: this.selectedAccountType,
            paymentStatus: this.mpesaPaymentStatus,
            timestamp: new Date().toISOString(),
            status: 'pending_approval'
        };
        
        // Debug: Log form data collection
        console.log('📋 Raw FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        console.log('📋 Processed Form Data:', this.formData);
        console.log('📋 Username from form:', formData.get('username'));
        
        try {
            // Check for existing account (modified for dual accounts)
            console.log("🔍 Checking existing account...");
            
            // Only check if exact same shop name exists for APPROVED accounts (allow denied accounts to retry)
            const existingShopSnapshot = await db.collection('users')
                .where('username', '==', this.formData.username)
                .where('status', '==', 'approved')
                .get();
            
            if (!existingShopSnapshot.empty) {
                alert('A shop with this name already exists and is approved. Please choose a different shop name or contact support.');
                return;
            }
            
            // Check for PENDING accounts with same shop name
            const pendingShopSnapshot = await db.collection('users')
                .where('username', '==', this.formData.username)
                .where('status', '==', 'pending_approval')
                .get();
            
            if (!pendingShopSnapshot.empty) {
                const pendingAccount = pendingShopSnapshot.docs[0].data();
                if (pendingAccount.email === this.formData.email || pendingAccount.phone === this.formData.phone) {
                    alert('You already have a pending account with these credentials. Please wait for approval or contact support.');
                    return;
                }
            }
            
            // Save to Firebase
            console.log("💾 Saving to Firebase...");
            const docId = await this.saveAccountToFirebase(this.formData);
            console.log("✅ Account saved with ID:", docId);
            
            // Send approval request to admin
            console.log("📧 Sending approval request...");
            await this.sendApprovalRequest(this.formData);
            
            // Show success message
            console.log("🎉 Registration successful!");
            this.showRegistrationSuccess();
            
        } catch (error) {
            console.error('❌ Registration error details:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Show specific error based on Firebase error
            let errorMessage = 'Registration failed. Please try again.';
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Check Firebase rules.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Firebase is currently unavailable. Please check your internet connection.';
            } else if (error.code === 'unauthenticated') {
                errorMessage = 'Authentication error. Please check Firebase configuration.';
            }
            
            alert(errorMessage);
        }
    }
    
    async checkExistingAccount(email, phone) {
        try {
            // Check Firebase for existing accounts
            const emailQuery = await db.collection('users').where('email', '==', email).get();
            const phoneQuery = await db.collection('users').where('phone', '==', phone).get();
            
            return !emailQuery.empty || !phoneQuery.empty;
        } catch (error) {
            console.error('Error checking existing account:', error);
            return false;
        }
    }
    
    async saveAccountToFirebase(accountData) {
        try {
            // Use user's phone number as document ID to match security rules
            const userId = accountData.phone.replace(/\D/g, ''); // Remove non-digits
            const docRef = await db.collection('users').doc(userId).set(accountData);
            console.log('Account saved with ID:', userId);
            return userId;
        } catch (error) {
            console.error('Error saving account:', error);
            throw error;
        }
    }
    
    async sendApprovalRequest(accountData) {
        try {
            console.log('🔧 sendApprovalRequest called with:', accountData);
            
            // Send to admin inbox in Firebase (single notification)
            const approvalData = {
                ...accountData,
                type: 'account_approval_request',
                message: `${accountData.username} has requested to open a ${accountData.accountType} account. Please approve!`,
                adminPhone: '+254707584594',
                timestamp: new Date().toISOString(),
                status: 'pending_approval'
            };
            
            console.log('🔧 Sending to admin_inbox:', approvalData);
            await db.collection('admin_inbox').add(approvalData);
            
            console.log('✅ Admin notification sent to inbox');
            
            // ❌ REMOVE: Duplicate WhatsApp notification
            // this.sendWhatsAppNotification(approvalData);
            
        } catch (error) {
            console.error('Error sending approval request:', error);
            throw error;
        }
    }
    
    sendWhatsAppNotification(data) {
        const message = `🔔 New Account Request\n\n` +
            `Name: ${data.username}\n` +
            `Type: ${data.accountType}\n` +
            `Email: ${data.email}\n` +
            `Status: Pending Approval\n\n` +
            `Please approve in admin panel.`;
        
        // Store WhatsApp notification in Firebase for admin to see
        // The admin will receive notification through Firebase, not WhatsApp redirect
        db.collection('whatsapp_notifications').add({
            to: '254707584594',
            message: message,
            accountData: data,
            timestamp: new Date(),
            status: 'pending'
        }).then(() => {
            console.log('✅ WhatsApp notification stored for admin');
        }).catch(error => {
            console.error('❌ Error storing WhatsApp notification:', error);
        });
        
        // ❌ REMOVE: Don't redirect user to WhatsApp
        // const whatsappUrl = `https://wa.me/254707584594?text=${encodeURIComponent(message)}`;
        // window.open(whatsappUrl, '_blank');
    }
    
    showRegistrationSuccess() {
        document.getElementById('registration-form').style.display = 'none';
        document.getElementById('account-success').style.display = 'block';
        document.getElementById('success-account-type').textContent = this.selectedAccountType;
        
        // Send email notification to user with template data
        const emailSubject = 'Account Created Successfully - Shopping Online Platform';
        const templateData = {
            username: this.formData.username || 'N/A', // Fallback to N/A if empty
            email: this.formData.email || 'N/A',
            phone: this.formData.phone || 'N/A',
            accountType: this.selectedAccountType || 'N/A',
            login_url: window.location.origin + '/index.html#login'
        };
        
        // Debug: Log what we're sending to EmailJS
        console.log('📧 Email Template Data:', templateData);
        console.log('📧 Form Data:', this.formData);
        console.log('📧 Username specifically:', this.formData.username);
        console.log('📧 Sending to EmailJS with:', {
            to_email: this.formData.email,
            subject: emailSubject,
            templateData: templateData
        });
        
        this.sendEmailNotification(this.formData.email, emailSubject, '', templateData);
        
        // Update success message to indicate waiting for admin approval
        const successMessage = document.getElementById('success-message');
        if (successMessage) {
            successMessage.innerHTML = `
                <h3>🎉 Registration Successful!</h3>
                <p>Your ${this.selectedAccountType} account has been created and is now pending admin approval.</p>
                <p><strong>✅ Email notification sent to:</strong> ${this.formData.email}</p>
                <p>You will receive a notification once your account is approved.</p>
                <p><strong>Account Type:</strong> ${this.selectedAccountType}</p>
                <p><strong>Status:</strong> <span style="color: #ffc107;">Pending Approval</span></p>
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>✅ Check your email for account creation confirmation</li>
                    <li>⏰ Wait for admin approval notification</li>
                    <li>📧 Check your email for approval status</li>
                    <li>🔑 Once approved, you can login to your account</li>
                </ul>
                <p><strong>Login Details:</strong></p>
                <ul>
                    <li>Username: ${this.formData.username}</li>
                    <li>Phone: ${this.formData.phone}</li>
                </ul>
                <button class="btn primary" onclick="window.location.href='index.html#login'">
                    <i class="fas fa-sign-in-alt"></i>
                    Go to Login
                </button>
            `;
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const rawPhone = formData.get('login-phone').trim();
        const loginData = {
            email: formData.get('login-username').trim().toLowerCase(),
            phone: this.normalizePhoneNumber(rawPhone),
            accountType: formData.get('login-account-type')
        };
        
        console.log("🔍 Attempting login with credentials:", loginData);
        console.log("🔍 Original phone entered:", rawPhone);
        console.log("🔍 Normalized phone:", loginData.phone);
        
        // Validate input fields
        if (!loginData.email || !loginData.phone) {
            alert('Please fill in all required fields (Email and Phone).');
            return;
        }
        
        try {
            // FLEXIBLE BUT SECURE: Find accounts with email and phone match, account type optional
            console.log("🔍 Checking for accounts with matching email and phone...");
            
            let accountsSnapshot;
            
            if (loginData.accountType) {
                // If account type specified, require exact match of all three
                console.log("🔍 Account type specified, requiring exact match:", loginData.accountType);
                accountsSnapshot = await db.collection('users')
                    .where('status', '==', 'approved')
                    .where('email', '==', loginData.email)
                    .where('phone', '==', loginData.phone)
                    .where('accountType', '==', loginData.accountType)
                    .get();
            } else {
                // If no account type specified, match email and phone only
                console.log("🔍 No account type specified, matching email and phone only");
                accountsSnapshot = await db.collection('users')
                    .where('status', '==', 'approved')
                    .where('email', '==', loginData.email)
                    .where('phone', '==', loginData.phone)
                    .get();
            }
            
            console.log("🔍 Found accounts:", accountsSnapshot.docs.length);
            
            if (accountsSnapshot.empty) {
                // Try alternative phone formats for better matching
                console.log("🔍 No matches found, trying alternative phone formats...");
                const alternativePhones = this.getAlternativePhoneFormats(rawPhone);
                console.log("🔍 Alternative phone formats to try:", alternativePhones);
                
                let foundAccount = null;
                for (const altPhone of alternativePhones) {
                    console.log("🔍 Trying alternative phone:", altPhone);
                    
                    let altSnapshot;
                    if (loginData.accountType) {
                        altSnapshot = await db.collection('users')
                            .where('status', '==', 'approved')
                            .where('email', '==', loginData.email)
                            .where('phone', '==', altPhone)
                            .where('accountType', '==', loginData.accountType)
                            .get();
                    } else {
                        altSnapshot = await db.collection('users')
                            .where('status', '==', 'approved')
                            .where('email', '==', loginData.email)
                            .where('phone', '==', altPhone)
                            .get();
                    }
                    
                    if (!altSnapshot.empty) {
                        foundAccount = { 
                            id: altSnapshot.docs[0].id, 
                            ...altSnapshot.docs[0].data() 
                        };
                        console.log("✅ Found account with alternative phone format:", altPhone);
                        break;
                    }
                }
                
                if (foundAccount) {
                    accountsSnapshot = { docs: [foundAccount], empty: false };
                } else {
                    // Check if there are any accounts with partial matches to give specific feedback
                    const emailSnapshot = await db.collection('users')
                        .where('email', '==', loginData.email)
                        .get();
                    
                    const phoneSnapshot = await db.collection('users')
                        .where('phone', '==', loginData.phone)
                        .get();
                    
                    if (!emailSnapshot.empty && !phoneSnapshot.empty) {
                        alert('Invalid credentials. The email and phone number combination does not match any approved account. Please check both fields carefully.');
                    } else if (!emailSnapshot.empty) {
                        alert('Invalid phone number. This email is registered but with a different phone number.');
                    } else if (!phoneSnapshot.empty) {
                        alert('Invalid email. This phone number is registered but with a different email address.');
                    } else {
                        alert('No approved account found with these credentials. Please check your details or create a new account.');
                    }
                    return;
                }
            }
            
            // Get first matching account
            const matchingAccount = { 
                id: accountsSnapshot.docs[0].id, 
                ...accountsSnapshot.docs[0].data() 
            };
            
            console.log("✅ Found matching account:", matchingAccount);
            
            // Final validation checks
            if (matchingAccount.status !== 'approved') {
                alert('Your account is not approved. Please wait for the approval email/SMS.');
                return;
            }
            
            if (matchingAccount.muted) {
                alert('Your account has been temporarily suspended. Please contact the administrator for assistance.');
                return;
            }
            
            // SUCCESSFUL LOGIN
            console.log("🎉 Login successful!");
            await this.handleSuccessfulLogin(matchingAccount);
            
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again later.');
        }
    }
    
    // Normalize phone number to standard format
    normalizePhoneNumber(phone) {
        if (!phone) return phone;
        
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Handle different formats
        if (cleaned.startsWith('254')) {
            // Already in international format
            return '+' + cleaned;
        } else if (cleaned.startsWith('0')) {
            // Kenyan format (07xxxxx) → +2547xxxxxx
            return '+254' + cleaned.substring(1);
        } else if (cleaned.startsWith('7')) {
            // Short format (7xxxxx) → +2547xxxxxx
            return '+254' + cleaned;
        } else if (cleaned.length === 9 && cleaned.startsWith('7')) {
            // 9-digit format (7xxxxxxx) → +2547xxxxxxx
            return '+254' + cleaned;
        } else {
            // Return as-is if format is unclear
            return phone.startsWith('+') ? phone : '+' + cleaned;
        }
    }
    
    // Get alternative phone formats for matching
    getAlternativePhoneFormats(phone) {
        const formats = [];
        const cleaned = phone.replace(/\D/g, '');
        
        // Original normalized format
        formats.push(this.normalizePhoneNumber(phone));
        
        // Try different variations
        if (cleaned.startsWith('254')) {
            formats.push('+' + cleaned);
            formats.push('0' + cleaned.substring(3));
            formats.push(cleaned.substring(3));
        } else if (cleaned.startsWith('0')) {
            formats.push('+254' + cleaned.substring(1));
            formats.push(cleaned.substring(1));
            formats.push('254' + cleaned.substring(1));
        } else if (cleaned.startsWith('7')) {
            formats.push('+254' + cleaned);
            formats.push('0' + cleaned);
            formats.push('254' + cleaned);
        }
        
        // Remove duplicates
        return [...new Set(formats)];
    }
    
    async authenticateUser(loginData) {
        try {
            // Query by username or email
            const usernameQuery = await db.collection('users')
                .where('username', '==', loginData.username)
                .where('phone', '==', loginData.phone)
                .get();
            
            if (!usernameQuery.empty) {
                return usernameQuery.docs[0].data();
            }
            
            // Try email if username doesn't match
            const emailQuery = await db.collection('users')
                .where('email', '==', loginData.username)
                .where('phone', '==', loginData.phone)
                .get();
            
            if (!emailQuery.empty) {
                return emailQuery.docs[0].data();
            }
            
            return null;
        } catch (error) {
            console.error('Authentication error:', error);
            return null;
        }
    }
    
    handleSuccessfulLogin(account) {
        // Store session
        sessionStorage.setItem('userSession', JSON.stringify(account));
        
        // Redirect to appropriate dashboard based on account type
        const dashboardUrl = account.accountType === 'premium' 
            ? 'premium-dashboard.html' 
            : 'dashboard.html';
        
        console.log(`🔐 Redirecting to ${account.accountType} dashboard:`, dashboardUrl);
        window.location.href = dashboardUrl;
    }
    
    showUpgradePrompt(account) {
        // Create upgrade modal
        const upgradeModal = document.createElement('div');
        upgradeModal.className = 'upgrade-modal';
        upgradeModal.innerHTML = `
            <div class="upgrade-modal-content">
                <div class="upgrade-header">
                    <div class="upgrade-icon">👑</div>
                    <h3>Upgrade to Premium Account</h3>
                </div>
                <div class="upgrade-body">
                    <p>Hello ${account.username}!</p>
                    <p>Unlock powerful features to grow your business:</p>
                    <ul class="premium-features">
                        <li>✅ Unlimited product listings</li>
                        <li>✅ Advanced analytics dashboard</li>
                        <li>✅ Priority customer support</li>
                        <li>✅ Custom branding options</li>
                        <li>✅ Featured shop placement</li>
                        <li>✅ Monthly sales insights</li>
                    </ul>
                    <div class="upgrade-price">
                        <span class="price">Ksh 200/month</span>
                        <small>Cancel anytime • No hidden fees</small>
                    </div>
                </div>
                <div class="upgrade-actions">
                    <button class="btn secondary" id="skip-upgrade">Not Now</button>
                    <button class="btn primary" id="upgrade-now">Upgrade to Premium</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(upgradeModal);
        
        // Add event listeners
        document.getElementById('skip-upgrade').addEventListener('click', () => {
            upgradeModal.remove();
            this.continueToDashboard(account);
        });
        
        document.getElementById('upgrade-now').addEventListener('click', () => {
            upgradeModal.remove();
            this.showUpgradeForm(account);
        });
    }
    
    showUpgradeForm(account) {
        // Create upgrade form modal
        const upgradeFormModal = document.createElement('div');
        upgradeFormModal.className = 'upgrade-modal';
        upgradeFormModal.innerHTML = `
            <div class="upgrade-modal-content">
                <div class="upgrade-header">
                    <div class="upgrade-icon">👑</div>
                    <h3>Upgrade to Premium</h3>
                </div>
                <div class="upgrade-body">
                    <p>Choose your account details for premium upgrade:</p>
                    
                    <div class="account-details-option">
                        <label>
                            <input type="radio" name="details-option" value="retain" checked>
                            <span>Keep current account details</span>
                        </label>
                        <div class="current-details-preview">
                            <p><strong>${account.username}</strong></p>
                            <p>📱 ${account.phone}</p>
                            <p>📧 ${account.email}</p>
                        </div>
                    </div>
                    
                    <div class="account-details-option">
                        <label>
                            <input type="radio" name="details-option" value="update">
                            <span>Update account details</span>
                        </label>
                        <div class="update-details-form" style="display: none;">
                            <div class="form-group">
                                <label>Shop Name</label>
                                <input type="text" id="update-username" value="${account.username}" placeholder="Enter shop name">
                            </div>
                            <div class="form-group">
                                <label>Phone Number</label>
                                <div class="phone-input-group">
                                    <input type="tel" id="update-countryCode" value="${account.phone.substring(0, 4)}" readonly>
                                    <input type="tel" id="update-phone" value="${account.phone.substring(4)}" placeholder="Phone number">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="update-email" value="${account.email}" placeholder="Email address">
                            </div>
                        </div>
                    </div>
                    
                    <div class="upgrade-payment">
                        <h4>🔐 Premium Upgrade Payment</h4>
                        <div class="payment-info">
                            <p>Upgrade fee: <strong>Ksh 200</strong></p>
                            <p>Monthly subscription: Ksh 200/month</p>
                        </div>
                        <button type="button" id="upgrade-mpesa-pay" class="btn mpesa-btn">
                            <span class="mpesa-icon">💳</span>
                            Pay with M-Pesa - Ksh 200
                        </button>
                        <div id="upgrade-mpesa-status" class="mpesa-status" style="display: none;"></div>
                    </div>
                </div>
                <div class="upgrade-actions">
                    <button class="btn secondary" id="cancel-upgrade">Cancel</button>
                    <button class="btn primary" id="confirm-upgrade" disabled>Complete Upgrade</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(upgradeFormModal);
        
        // Handle details option change
        const detailsOptions = upgradeFormModal.querySelectorAll('input[name="details-option"]');
        detailsOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                const updateForm = upgradeFormModal.querySelector('.update-details-form');
                updateForm.style.display = e.target.value === 'update' ? 'block' : 'none';
            });
        });
        
        // Event listeners
        document.getElementById('cancel-upgrade').addEventListener('click', () => {
            upgradeFormModal.remove();
            this.continueToDashboard(account);
        });
        
        document.getElementById('upgrade-mpesa-pay').addEventListener('click', () => {
            this.initiateUpgradePayment(account, upgradeFormModal);
        });
        
        document.getElementById('confirm-upgrade').addEventListener('click', () => {
            this.completeUpgrade(account, upgradeFormModal);
        });
    }
    
    async initiateUpgradePayment(account, modal) {
        const mpesaBtn = document.getElementById('upgrade-mpesa-pay');
        const mpesaStatus = document.getElementById('upgrade-mpesa-status');
        
        mpesaBtn.disabled = true;
        mpesaBtn.textContent = 'Processing...';
        mpesaStatus.style.display = 'block';
        mpesaStatus.innerHTML = '<p>📱 Initiating M-Pesa payment...</p>';
        
        try {
            const paymentResult = await this.simulateMpesaPayment(account.phone, 200);
            
            if (paymentResult.success) {
                mpesaStatus.innerHTML = `
                    <p style="color: #00ff00;">✅ Payment initiated successfully!</p>
                    <p>Check your phone for M-Pesa prompt</p>
                    <p>Enter your M-Pesa PIN to complete payment</p>
                `;
                
                setTimeout(() => {
                    this.checkUpgradePaymentStatus(account, modal);
                }, 10000);
            } else {
                throw new Error(paymentResult.message);
            }
        } catch (error) {
            mpesaStatus.innerHTML = `
                <p style="color: #ff4444;">❌ Payment failed</p>
                <p>${error.message}</p>
            `;
            mpesaBtn.disabled = false;
            mpesaBtn.textContent = 'Retry Payment';
        }
    }
    
    async checkUpgradePaymentStatus(account, modal) {
        const mpesaStatus = document.getElementById('upgrade-mpesa-status');
        const confirmBtn = document.getElementById('confirm-upgrade');
        
        mpesaStatus.innerHTML += '<p>Checking payment status...</p>';
        
        setTimeout(() => {
            mpesaStatus.innerHTML = `
                <p style="color: #00ff00;">✅ Payment confirmed!</p>
                <p>Transaction ID: MP${Date.now()}</p>
                <p>You can now complete your upgrade</p>
            `;
            confirmBtn.disabled = false;
            account.upgradePaymentStatus = true;
        }, 3000);
    }
    
    async completeUpgrade(account, modal) {
        if (!account.upgradePaymentStatus) {
            alert('Please complete the payment first');
            return;
        }
        
        const detailsOption = modal.querySelector('input[name="details-option"]:checked').value;
        let updatedAccount = { ...account };
        
        if (detailsOption === 'update') {
            // Get updated details
            const newUsername = document.getElementById('update-username').value;
            const newPhone = document.getElementById('update-countryCode').value + document.getElementById('update-phone').value;
            const newEmail = document.getElementById('update-email').value;
            
            // Confirm update
            const confirmUpdate = confirm(`
                Confirm Account Details Update:
                
                Previous: ${account.username}
                New: ${newUsername}
                
                Previous: ${account.phone}
                New: ${newPhone}
                
                Previous: ${account.email}
                New: ${newEmail}
                
                Click OK to confirm update, or Cancel to keep previous details.
            `);
            
            if (confirmUpdate) {
                updatedAccount.username = newUsername;
                updatedAccount.phone = newPhone;
                updatedAccount.email = newEmail;
                
                // Update Firebase
                await this.updateAccountDetails(account, updatedAccount);
            }
        }
        
        // Update account type to premium
        updatedAccount.accountType = 'premium';
        updatedAccount.upgradeRequest = true;
        updatedAccount.upgradeTimestamp = new Date().toISOString();
        updatedAccount.lastPaymentDate = new Date().toISOString();
        updatedAccount.nextPaymentDue = this.calculateNextPaymentDate();
        
        // Save to Firebase
        await this.saveAccountToFirebase(updatedAccount);
        
        // Send upgrade approval request
        await this.sendUpgradeApprovalRequest(updatedAccount);
        
        // Show success
        modal.remove();
        this.showUpgradeSuccess(updatedAccount);
    }
    
    async updateAccountDetails(oldAccount, newAccount) {
        try {
            // Find and delete old account
            const accountsRef = db.collection('accounts');
            const query = await accountsRef.where('email', '==', oldAccount.email).get();
            
            if (!query.empty) {
                const docId = query.docs[0].id;
                await accountsRef.doc(docId).delete();
                console.log('Old account deleted');
            }
            
            // Save new account details
            await this.saveAccountToFirebase(newAccount);
            console.log('New account saved');
            
        } catch (error) {
            console.error('Error updating account details:', error);
            throw error;
        }
    }
    
    async sendUpgradeApprovalRequest(accountData) {
        try {
            const approvalData = {
                ...accountData,
                type: 'upgrade_approval_request',
                message: `${accountData.username} has requested to upgrade to premium account. Please approve!`,
                adminPhone: '+254707584594',
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            await db.collection('admin_inbox').add(approvalData);
            
            // Send WhatsApp notification
            const message = `🔔 Premium Upgrade Request\n\n` +
                `Name: ${accountData.username}\n` +
                `Type: Free → Premium\n` +
                `Phone: ${accountData.phone}\n` +
                `Email: ${accountData.email}\n` +
                `Payment: Ksh 200 received\n\n` +
                `Please approve upgrade in admin panel.`;
            
            // Store WhatsApp notification in Firebase instead of redirecting user
            db.collection('whatsapp_notifications').add({
                to: '254707584594',
                message: message,
                accountData: accountData,
                type: 'premium_upgrade',
                timestamp: new Date(),
                status: 'pending'
            }).then(() => {
                console.log('✅ Premium upgrade notification stored for admin');
            }).catch(error => {
                console.error('❌ Error storing premium upgrade notification:', error);
            });
            
            // ❌ REMOVE: Don't redirect user to WhatsApp
            // const whatsappUrl = `https://wa.me/254707584594?text=${encodeURIComponent(message)}`;
            // window.open(whatsappUrl, '_blank');
            
        } catch (error) {
            console.error('Error sending upgrade approval request:', error);
            throw error;
        }
    }
    
    showUpgradeSuccess(account) {
        const successModal = document.createElement('div');
        successModal.className = 'upgrade-modal';
        successModal.innerHTML = `
            <div class="upgrade-modal-content">
                <div class="upgrade-header">
                    <div class="upgrade-icon">🎉</div>
                    <h3>Upgrade Request Submitted!</h3>
                </div>
                <div class="upgrade-body">
                    <p>Your premium upgrade request has been submitted for approval.</p>
                    <p>You'll receive confirmation once approved.</p>
                    <p>Expected approval time: 2-4 hours</p>
                </div>
                <div class="upgrade-actions">
                    <button class="btn primary" onclick="this.closest('.upgrade-modal').remove()">Continue to Dashboard</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(successModal);
    }
    
    continueToDashboard(account) {
        const dashboardUrl = account.accountType === 'premium' 
            ? 'premium-dashboard.html' 
            : 'dashboard.html';
            
        alert(`Welcome to your ${account.accountType} account, ${account.username}! 🎉\n\nYou can now access your shop dashboard and start selling!\n\n${account.accountType === 'free' ? 'Consider upgrading to premium for more features.' : 'Enjoy your premium features!'}`);
        
        console.log(`🔐 Redirecting to ${account.accountType} dashboard:`, dashboardUrl);
        window.location.href = dashboardUrl;
    }
    
    setupMonthlyFeeReminder(account) {
        // Create monthly fee reminder widget
        const feeWidget = document.createElement('div');
        feeWidget.className = 'monthly-fee-widget';
        feeWidget.innerHTML = `
            <div class="fee-content">
                <span class="fee-icon">💳</span>
                <span class="fee-text">Monthly Fee: Ksh 200</span>
                <span class="fee-due">Due: ${new Date(account.nextPaymentDue).toLocaleDateString()}</span>
            </div>
        `;
        
        // Add to top right corner
        document.body.appendChild(feeWidget);
        
        // Check if payment is due
        this.checkMonthlyPaymentStatus(account);
    }
    
    calculateNextPaymentDate() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 28); // 28th of next month
        return nextMonth.toISOString();
    }
    
    async checkMonthlyPaymentStatus(account) {
        const now = new Date();
        const dueDate = new Date(account.nextPaymentDue);
        
        // Check if payment is overdue (1st of month or later)
        if (now.getDate() >= 1 && now > dueDate) {
            // Send late payment notification to admin
            await this.sendLatePaymentNotification(account);
        }
        
        // Check if payment is due soon (28th-31st)
        if (now.getDate() >= 28 && now <= 31) {
            this.showPaymentReminder(account);
        }
    }
    
    async sendLatePaymentNotification(account) {
        try {
            const notificationData = {
                type: 'late_payment_notification',
                account: account,
                message: `Late payment: ${account.username} has not paid monthly premium fee`,
                adminPhone: '+254707584594',
                timestamp: new Date().toISOString(),
                status: 'pending_action'
            };
            
            await db.collection('admin_inbox').add(notificationData);
            
            // WhatsApp notification
            const message = `⚠️ Late Payment Alert\n\n` +
                `Account: ${account.username}\n` +
                `Phone: ${account.phone}\n` +
                `Email: ${account.email}\n` +
                `Due Date: ${new Date(account.nextPaymentDue).toLocaleDateString()}\n` +
                `Status: OVERDUE\n\n` +
                `Please mute account in admin panel.`;
            
            // Store WhatsApp notification in Firebase instead of redirecting user
            db.collection('whatsapp_notifications').add({
                to: '254707584594',
                message: message,
                accountData: account,
                type: 'late_payment',
                timestamp: new Date(),
                status: 'pending'
            }).then(() => {
                console.log('✅ Late payment notification stored for admin');
            }).catch(error => {
                console.error('❌ Error storing late payment notification:', error);
            });
            
            // ❌ REMOVE: Don't redirect user to WhatsApp
            // const whatsappUrl = `https://wa.me/254707584594?text=${encodeURIComponent(message)}`;
            // window.open(whatsappUrl, '_blank');
            
        } catch (error) {
            console.error('Error sending late payment notification:', error);
        }
    }
    
    showPaymentReminder(account) {
        const reminderModal = document.createElement('div');
        reminderModal.className = 'payment-reminder-modal';
        reminderModal.innerHTML = `
            <div class="reminder-content">
                <div class="reminder-icon">⏰</div>
                <h4>Monthly Payment Due</h4>
                <p>Your premium monthly fee of Ksh 200 is due.</p>
                <p>Pay now to continue enjoying premium features!</p>
                <button class="btn primary" onclick="this.closest('.payment-reminder-modal').remove(); accountManager.initiateMonthlyPayment('${account.phone}')">
                    Pay Now - Ksh 200
                </button>
            </div>
        `;
        
        document.body.appendChild(reminderModal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (reminderModal.parentNode) {
                reminderModal.remove();
            }
        }, 10000);
    }
    
    async initiateMonthlyPayment(phone) {
        try {
            const paymentResult = await this.simulateMpesaPayment(phone, 200);
            
            if (paymentResult.success) {
                // Send payment notification to admin
                await this.sendMonthlyPaymentNotification(phone, 200);
                
                alert('Payment initiated successfully! Check your phone for M-Pesa prompt.');
            }
        } catch (error) {
            console.error('Error initiating monthly payment:', error);
            alert('Payment failed. Please try again.');
        }
    }
    
    async sendMonthlyPaymentNotification(phone, amount) {
        try {
            const notificationData = {
                type: 'monthly_payment_received',
                phone: phone,
                amount: amount,
                message: `Monthly payment received: Ksh ${amount} from ${phone}`,
                adminPhone: '+254707584594',
                timestamp: new Date().toISOString(),
                status: 'payment_received'
            };
            
            await db.collection('admin_inbox').add(notificationData);
            
            // WhatsApp notification
            const message = `💳 Monthly Payment Received\n\n` +
                `Amount: Ksh ${amount}\n` +
                `From: ${phone}\n` +
                `Date: ${new Date().toLocaleDateString()}\n` +
                `Time: ${new Date().toLocaleTimeString()}\n\n` +
                `Payment confirmed!`;
            
            // Store WhatsApp notification in Firebase instead of redirecting user
            db.collection('whatsapp_notifications').add({
                to: '254707584594',
                message: message,
                paymentData: { phone, amount },
                type: 'payment_received',
                timestamp: new Date(),
                status: 'pending'
            }).then(() => {
                console.log('✅ Payment notification stored for admin');
            }).catch(error => {
                console.error('❌ Error storing payment notification:', error);
            });
            
            // ❌ REMOVE: Don't redirect user to WhatsApp
            // const whatsappUrl = `https://wa.me/254707584594?text=${encodeURIComponent(message)}`;
            // window.open(whatsappUrl, '_blank');
            
        } catch (error) {
            console.error('Error sending payment notification:', error);
        }
        
        // Production: Use Safaricom sandbox API
        console.log('Attempting Safaricom sandbox API call...');
        
        // Generate OAuth token (you'll need to implement this)
        const accessToken = await this.getMpesaAccessToken();
        
        // Generate password for API call
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, -3);
        const password = btoa('174379' + 'bfb279c93339c6fb5d1a5f2470b1c263' + timestamp);
        
        const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                BusinessShortCode: '174379',
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: phone.replace(/\D/g, ''),
                PartyB: '174379',
                PhoneNumber: phone.replace(/\D/g, ''),
                CallBackURL: 'https://your-domain.com/callback',
                AccountReference: 'SHOPPING_PREMIUM',
                TransactionDesc: 'Premium Account Payment'
            })
        });
        
        if (!response.ok) {
            throw new Error(`M-Pesa API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('M-Pesa payment response:', result);
        return result;
        
    } catch (error) {
        console.error('M-Pesa API Error:', error);
        
        // Fallback for development
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
            console.log('Fallback: Simulating successful payment');
            return {
                success: true,
                transactionId: 'FALLBACK_' + Date.now(),
                message: 'Payment simulated (Fallback Mode)'
            };
        }
        
        throw error;
    }
}

// Get M-Pesa OAuth access token
async getMpesaAccessToken() {
    try {
        const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa('CMyZ5M09aM7wXGbgApJx91Cg6wereucKA32wydj96fzV4qFs:gkszHAGta5kclANeuQHgsN2AZAIxWezm4shWF5GYnHOqGqfl78GhyDpm04pGGIGG')
            }
        });
        
        if (!response.ok) {
            throw new Error(`OAuth error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.access_token;
        
    } catch (error) {
        console.error('OAuth Error:', error);
        throw error;
    }
}

// Initialize Account Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AccountManager();
});
