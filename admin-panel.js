class AdminPanel {
    constructor() {
        this.isAuthenticated = false;
        this.users = [];
        this.messages = [];
        this.currentSortField = null;
        this.currentSortDirection = 'asc';
        this.currentCategory = 'approvals'; // Set default category
        
        // Initialize payment tracking
        this.payments = [];
        this.marketData = [];
        this.currentTimeRange = 'month';
        this.currentChartType = 'candlestick';
        this.charts = {};
        this.paymentListeners = [];
        
        this.initFirebase();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    initFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyBIYPCpbiSMhO07kBlmuJg_g_sM6ol5G14",
            authDomain: "shopping-online-6ba36.firebaseapp.com",
            projectId: "shopping-online-6ba36",
            storageBucket: "shopping-online-6ba36.appspot.com",
            messagingSenderId: "404079444441",
            appId: "1:404079444441:web:bca6b897877295f92519c8"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        window.db = firebase.firestore();
        console.log('Firebase initialized successfully');
    }

    setupEventListeners() {
        // Admin login form
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Tab switching
        const tabButtons = document.querySelectorAll('.nav-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    checkAuthStatus() {
        localStorage.removeItem('adminAuth');
        const authStatus = localStorage.getItem('adminAuth');
        
        if (authStatus === 'authenticated') {
            this.showAdminPanel();
        } else {
            this.showLoginScreen();
        }
    }

    handleLogin() {
        const adminCode = document.getElementById('admin-code').value;
        const loginError = document.getElementById('login-error');
        
        if (adminCode === '#4997G9749@j#' || adminCode === '4997G9749@j#') {
            this.isAuthenticated = true;
            localStorage.setItem('adminAuth', 'authenticated');
            this.showAdminPanel();
            this.showNotification('Admin access granted!', 'success');
        } else {
            loginError.textContent = 'Invalid admin access code';
            loginError.style.display = 'block';
            setTimeout(() => {
                loginError.style.display = 'none';
            }, 5000);
        }
    }

    showLoginScreen() {
        document.getElementById('admin-login').style.display = 'flex';
        document.getElementById('admin-panel').style.display = 'none';
    }

    showAdminPanel() {
        if (window.db) {
            document.getElementById('admin-login').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            
            this.loadAllData();
            this.showNotification('Admin panel loaded successfully', 'success');
        } else {
            this.showNotification('Firebase connection error', 'error');
        }
    }

    async loadAllData() {
        console.log('🔄 Loading all admin data...');
        await this.loadUsers();
        await this.loadMessages();
        this.updateStats();
        this.renderUsers();
        this.renderControl();
        this.renderMessages();
        await this.initMarketMonitoring();
        console.log('✅ All admin data loaded successfully');
    }

    async loadUsers() {
        try {
            console.log('📥 Loading users from Firestore...');
            const snapshot = await db.collection('users').get();
            this.users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`📊 Loaded ${this.users.length} users from Firestore`);
            console.log('👥 Users data:', this.users.map(u => ({
                id: u.id,
                username: u.username,
                accountType: u.accountType,
                status: u.status,
                muted: u.muted
            })));
        } catch (error) {
            console.error('❌ Error loading users:', error);
            // Create sample data for testing
            this.users = [
                {
                    id: 'test1',
                    userId: 'user1',
                    username: 'Test User 1',
                    email: 'test1@example.com',
                    phone: '+254123456789',
                    accountType: 'free',
                    status: 'approved',
                    timestamp: new Date(),
                    muted: false
                },
                {
                    id: 'test2',
                    userId: 'user2',
                    username: 'Test User 2',
                    email: 'test2@example.com',
                    phone: '+254987654321',
                    accountType: 'premium',
                    status: 'approved',
                    timestamp: new Date(),
                    muted: false
                }
            ];
            console.log('🎭 Created sample users data for testing');
        }
    }

    async loadMessages() {
        try {
            console.log('📥 Loading messages from Firestore...');
            const inboxSnapshot = await db.collection('admin_inbox').get();
            const premiumSnapshot = await db.collection('premiumRequests').get();
            
            this.messages = [];
            
            // Load from admin_inbox collection
            inboxSnapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log('📧 Inbox message:', data);
                this.messages.push({
                    id: doc.id,
                    type: data.type || 'message',
                    shopName: data.shopName || 'Unknown',
                    username: data.username || data.shopName || 'Unknown',
                    userId: data.userId || doc.id,
                    email: data.email || 'No email',
                    accountType: data.accountType || 'free',
                    status: data.status || 'pending',
                    timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date(),
                    read: false
                });
            });
            
            // Load from premiumRequests collection
            premiumSnapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log('👑 Premium request:', data);
                if (data.status === 'pending') {
                    this.messages.push({
                        id: doc.id,
                        type: 'premium_request',
                        shopName: data.fullName || data.shopName || 'Unknown',
                        username: data.fullName || data.shopName || 'Unknown',
                        userId: data.userId || doc.id,
                        email: data.email || 'No email',
                        accountType: 'premium',
                        status: 'pending',
                        timestamp: data.requestedAt ? (data.requestedAt.toDate ? data.requestedAt.toDate() : new Date(data.requestedAt)) : new Date(),
                        read: false
                    });
                }
            });
            
            // IMPORTANT: Also load ALL users from users collection and filter for pending
            const allUsersSnapshot = await db.collection('users').get();
            console.log('👥 All users in database:', allUsersSnapshot.docs.length);
            
            allUsersSnapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`👤 User ${doc.id}:`, {
                    username: data.username,
                    status: data.status,
                    accountType: data.accountType,
                    userId: data.userId
                });
                
                // Only add users with 'pending' or 'pending_approval' status
                if (data.status === 'pending' || data.status === 'pending_approval') {
                    console.log('✅ Found pending user:', data.username, 'status:', data.status);
                    this.messages.push({
                        id: doc.id,
                        type: 'user_registration',
                        shopName: data.shopName || data.username || 'Unknown',
                        username: data.username || data.shopName || 'Unknown',
                        userId: data.userId || doc.id,
                        email: data.email || 'No email',
                        accountType: data.accountType || 'free',
                        status: 'pending',
                        timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date(),
                        read: false
                    });
                } else {
                    console.log(`❌ User ${data.username} status is: ${data.status} (not pending)`);
                }
            });
            
            console.log(`📊 Loaded ${this.messages.length} total messages:`, this.messages);
            const pendingMessages = this.messages.filter(m => m.status === 'pending');
            console.log(`📊 Pending messages: ${pendingMessages.length}`, pendingMessages);
            
            this.renderMessages();
        } catch (error) {
            console.error('❌ Error loading messages:', error);
        }
    }

    updateStats() {
        console.log('📊 Updating statistics...');
        
        const totalUsers = this.users.length;
        const premiumUsers = this.users.filter(u => u.accountType === 'premium').length;
        const freeUsers = this.users.filter(u => u.accountType === 'free').length;
        const approvedUsers = this.users.filter(u => u.status === 'approved').length;
        const pendingUsers = this.users.filter(u => u.status === 'pending').length;
        const rejectedUsers = this.users.filter(u => u.status === 'rejected').length;
        const mutedUsers = this.users.filter(u => u.muted === true).length;
        const pendingApprovals = this.messages.filter(m => m.status === 'pending').length;
        
        console.log(`📈 Stats: Total: ${totalUsers}, Premium: ${premiumUsers}, Free: ${freeUsers}, Approved: ${approvedUsers}, Pending: ${pendingUsers}, Rejected: ${rejectedUsers}, Muted: ${mutedUsers}`);
        
        // Update header stats
        this.updateElement('total-users', totalUsers);
        this.updateElement('premium-users', premiumUsers);
        this.updateElement('pending-approvals', pendingApprovals);
        
        // Update hero stats
        this.updateElement('hero-total-users', totalUsers);
        this.updateElement('hero-premium-users', premiumUsers);
        this.updateElement('hero-pending-approvals', pendingApprovals);
        
        // Update navigation badges
        this.updateElement('users-badge', totalUsers);
        this.updateElement('inbox-badge', pendingApprovals);
        this.updateElement('control-badge', approvedUsers);
        this.updateElement('monitor-badge', '7'); // Payment records count
        
        // Update additional stats if elements exist
        this.updateElement('free-users', freeUsers);
        this.updateElement('approved-users', approvedUsers);
        this.updateElement('pending-users', pendingUsers);
        this.updateElement('muted-users', mutedUsers);
        
        // Update revenue (placeholder for now)
        const monthlyRevenue = this.calculateMonthlyRevenue();
        this.updateElement('monthly-revenue', `Ksh ${monthlyRevenue.toLocaleString()}`);
        this.updateElement('hero-monthly-revenue', `Ksh ${monthlyRevenue.toLocaleString()}`);
        
        console.log('✅ All statistics updated successfully');
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            console.log(`✅ Updated ${elementId}: ${value}`);
        } else {
            console.error(`❌ Element ${elementId} not found`);
        }
    }

    calculateMonthlyRevenue() {
        // Calculate from premium upgrades (200 Ksh each)
        const premiumUpgrades = this.users.filter(u => u.accountType === 'premium').length;
        return premiumUpgrades * 200;
    }

    renderUsers() {
        console.log('🎨 Rendering users table...');
        const tbody = document.getElementById('users-tbody');
        if (!tbody) {
            console.error('❌ Users table tbody not found!');
            return;
        }
        
        console.log(`📊 Rendering ${this.users.length} users`);
        
        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        No users found
                    </td>
                </tr>
            `;
            console.log('📭 No users to display');
            return;
        }
        
        tbody.innerHTML = this.users.map(user => {
            console.log(`👤 Rendering user: ${user.username} (${user.accountType})`);
            return `
            <tr>
                <td>${user.username || user.shopName || 'N/A'}</td>
                <td>${user.userId || user.id || 'N/A'}</td>
                <td>${user.contact || user.phone || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td style="background-color: ${user.accountType === 'premium' ? '#ffc107' : '#007bff'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                    ${user.accountType || 'free'}
                </td>
                <td>${user.timestamp ? (user.timestamp.toDate ? user.timestamp.toDate().toLocaleDateString() : new Date(user.timestamp).toLocaleDateString()) : 'N/A'}</td>
                <td style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; 
                    background-color: ${user.status === 'approved' ? '#28a745' : user.status === 'pending' ? '#ffc107' : '#6c757d'}; color: white;">
                    ${user.status || 'pending'}
                </td>
                <td>
                    ${user.status === 'pending' ? `
                        <button class="btn small" onclick="window.adminPanel.approveUser('${user.id || user.userId}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                    ` : '<span style="color: #28a745; font-weight: bold;">✓ Approved</span>'}
                </td>
            </tr>
        `;
        }).join('');
        
        console.log('✅ Users table rendered successfully');
        
        // Update table headers with sorting indicators
        this.updateTableHeaders('users');
    }

    updateTableHeaders(tableName) {
        const headers = document.querySelectorAll(`#${tableName}-tab th.sortable`);
        headers.forEach(header => {
            const field = header.getAttribute('data-field');
            if (field === this.currentSortField) {
                header.innerHTML = header.textContent.replace(/↕|↑|↓/g, '') + 
                    (this.currentSortDirection === 'asc' ? ' ↑' : ' ↓');
            } else {
                header.innerHTML = header.textContent.replace(/↕|↑|↓/g, '') + ' ↕';
            }
        });
    }

    renderMessages() {
        console.log('🎨 Rendering messages...');
        console.log('🔍 Debug - Current category:', this.currentCategory);
        
        // Update category counts
        this.updateCategoryCounts();
        
        // Get messages for current category
        const categoryMessages = {
            approvals: this.messages.filter(m => m.status === 'pending'),
            approved: this.messages.filter(m => m.status === 'approved'),
            payments: this.messages.filter(m => m.type === 'premium_request' || m.paymentStatus === true),
            transactions: this.messages.filter(m => m.type === 'transaction')
        };
        
        console.log('🔍 Debug - Category messages:', {
            approvals: categoryMessages.approvals.length,
            approved: categoryMessages.approved.length,
            payments: categoryMessages.payments.length,
            transactions: categoryMessages.transactions.length
        });
        
        const currentMessages = categoryMessages[this.currentCategory] || [];
        
        // Render approvals list
        const approvalsList = document.getElementById('approvals-list');
        console.log('🔍 Debug - Approvals list element:', approvalsList);
        
        if (approvalsList) {
            if (this.currentCategory === 'approvals') {
                const pendingMessages = categoryMessages.approvals;
                
                console.log('🔍 Debug - Pending messages:', pendingMessages);
                console.log('🔍 Debug - Pending messages count:', pendingMessages.length);
                
                if (pendingMessages.length === 0) {
                    approvalsList.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #28a745;"></i>
                            <h3>No Pending Approvals</h3>
                            <p>All user requests have been processed.</p>
                        </div>
                    `;
                } else {
                    approvalsList.innerHTML = pendingMessages.map(message => `
                        <div class="message-item" style="border: 2px solid var(--border-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; background: var(--light-bg);">
                            <div class="message-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h4 style="margin: 0; color: var(--text-color); font-size: 1.1rem;">
                                    <i class="fas fa-${message.type === 'premium_request' ? 'crown' : 'user-circle'}" style="color: ${message.type === 'premium_request' ? '#ffc107' : 'var(--primary-color)'}; margin-right: 0.5rem;"></i>
                                    ${message.username}
                                    ${message.type === 'premium_request' ? '<span style="background: #ffc107; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 0.5rem;">PREMIUM REQUEST</span>' : ''}
                                </h4>
                                <span class="message-status ${message.status}" style="
                                    ${message.status === 'pending' ? 'background: #ffc107; color: #856404;' : ''}
                                    ${message.status === 'approved' ? 'background: #28a745; color: white;' : ''}
                                    ${message.status === 'rejected' ? 'background: #dc3545; color: white;' : ''}
                                ">
                                    ${message.status === 'pending' ? '⏳ Pending' : ''}
                                    ${message.status === 'approved' ? '✅ Approved' : ''}
                                    ${message.status === 'rejected' ? '❌ Rejected' : ''}
                                </span>
                            </div>
                            <div class="message-content">
                                <p style="margin: 0; color: var(--text-color); line-height: 1.5;">
                                    ${message.message}
                                </p>
                                ${message.type === 'premium_request' ? `
                                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 193, 7, 0.1); border-radius: 8px;">
                                        <h4 style="color: #ffc107; margin-bottom: 0.5rem;">Premium Request Details</h4>
                                        <p><strong>Amount:</strong> Ksh ${message.amount || 'N/A'}</p>
                                        <p><strong>Payment Method:</strong> ${message.paymentMethod || 'N/A'}</p>
                                        <p><strong>Billing Cycle:</strong> ${message.billingCycle || 'N/A'}</p>
                                        ${message.cardNumber ? `<p><strong>Card Number:</strong> ****-****-****-${message.cardNumber.slice(-4)}</p>` : ''}
                                        ${message.mpesaNumber ? `<p><strong>M-Pesa Number:</strong> ${message.mpesaNumber}</p>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="message-actions">
                                ${message.status === 'pending' ? `
                                    <button class="btn primary approve-btn" onclick="adminPanel.approveUser('${message.userId}')">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button class="btn danger deny-btn" onclick="adminPanel.denyUser('${message.userId}')">
                                        <i class="fas fa-times"></i> Deny
                                    </button>
                                ` : ''}
                                ${message.status === 'approved' ? `
                                    <span style="color: #28a745; font-weight: 600;">
                                        <i class="fas fa-check-circle"></i> Approved on ${new Date(message.processedAt?.toDate?.() || message.processedAt).toLocaleDateString()}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                approvalsList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #28a745;"></i>
                        <h3>No Pending Approvals</h3>
                        <p>All user requests have been processed.</p>
                    </div>
                `;
            }
        }
        
        // Render approved list
        const approvedList = document.getElementById('approved-list');
        if (approvedList) {
            const approvedMessages = this.messages.filter(m => m.status === 'approved');
            
            if (approvedMessages.length === 0) {
                approvedList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #6c757d;"></i>
                        <h3>No Approved Requests</h3>
                        <p>No requests have been approved yet.</p>
                    </div>
                `;
            } else {
                approvedList.innerHTML = approvedMessages.map(message => `
                    <div class="message-item" style="border: 2px solid #28a745; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; background: #d4edda;">
                        <div class="message-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0; color: #155724; font-size: 1.1rem;">
                                <i class="fas fa-check-circle" style="color: #28a745; margin-right: 0.5rem;"></i>
                                ${message.username}
                            </h4>
                            <span class="message-status" style="
                                padding: 0.3rem 0.8rem; 
                                border-radius: 20px; 
                                font-size: 0.8rem; 
                                font-weight: 600; 
                                background-color: #28a745;
                                color: white;
                            ">Approved</span>
                        </div>
                        <div class="message-content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <div>
                                <strong style="color: #155724; font-size: 0.9rem;">Email:</strong>
                                <p style="margin: 0.2rem 0; color: #155724;">${message.email}</p>
                            </div>
                            <div>
                                <strong style="color: #155724; font-size: 0.9rem;">Account Type:</strong>
                                <p style="margin: 0.2rem 0; color: #155724;">
                                    <span style="
                                        background-color: ${message.accountType === 'premium' ? '#ffc107' : '#007bff'}; 
                                        color: white; 
                                        padding: 2px 8px; 
                                        border-radius: 4px; 
                                        font-size: 0.8rem;
                                        font-weight: bold;
                                    ">${message.accountType}</span>
                                </p>
                            </div>
                            <div>
                                <strong style="color: #155724; font-size: 0.9rem;">Approved Date:</strong>
                                <p style="margin: 0.2rem 0; color: #155724;">${message.timestamp.toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Render payments list
        const paymentsList = document.getElementById('payments-list');
        if (paymentsList) {
            const premiumRequests = this.messages.filter(m => m.type === 'premium_request');
            
            if (premiumRequests.length === 0) {
                paymentsList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-credit-card" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #6c757d;"></i>
                        <h3>No Payment Notifications</h3>
                        <p>No premium upgrade requests received.</p>
                    </div>
                `;
            } else {
                paymentsList.innerHTML = premiumRequests.map(message => `
                    <div class="message-item" style="border: 2px solid #ffc107; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; background: #fff3cd;">
                        <div class="message-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0; color: #856404; font-size: 1.1rem;">
                                <i class="fas fa-crown" style="color: #ffc107; margin-right: 0.5rem;"></i>
                                Premium Upgrade Request
                            </h4>
                            <span class="message-status" style="
                                padding: 0.3rem 0.8rem; 
                                border-radius: 20px; 
                                font-size: 0.8rem; 
                                font-weight: 600; 
                                background-color: #ffc107;
                                color: #856404;
                            ">${message.status}</span>
                        </div>
                        <div class="message-content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <div>
                                <strong style="color: #856404; font-size: 0.9rem;">Customer:</strong>
                                <p style="margin: 0.2rem 0; color: #856404;">${message.username}</p>
                            </div>
                            <div>
                                <strong style="color: #856404; font-size: 0.9rem;">Email:</strong>
                                <p style="margin: 0.2rem 0; color: #856404;">${message.email}</p>
                            </div>
                            <div>
                                <strong style="color: #856404; font-size: 0.9rem;">Request Date:</strong>
                                <p style="margin: 0.2rem 0; color: #856404;">${message.timestamp.toLocaleDateString()}</p>
                            </div>
                            <div>
                                <strong style="color: #856404; font-size: 0.9rem;">Amount:</strong>
                                <p style="margin: 0.2rem 0; color: #856404; font-weight: bold;">Ksh 200</p>
                            </div>
                        </div>
                        <div class="message-actions" style="display: flex; gap: 1rem; justify-content: flex-end;">
                            <button class="btn success small" onclick="window.adminPanel.approveUser('${message.userId}')" style="
                                padding: 0.5rem 1rem;
                                border: none;
                                border-radius: 6px;
                                background: #28a745;
                                color: white;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            ">
                                <i class="fas fa-check"></i> Process Payment
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Render transactions list
        const transactionsList = document.getElementById('transactions-list');
        if (transactionsList) {
            this.renderTransactionsList(transactionsList);
        }

        console.log('✅ Messages rendered successfully');
    }

    async renderTransactionsList(container) {
        try {
            const transactionsSnapshot = await db.collection('transactions')
                .where('type', '==', 'potential_order')
                .get();

            const transactions = transactionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort locally instead of using orderBy
            transactions.sort((a, b) => {
                const aTime = a.timestamp ? a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp) : new Date(0);
                const bTime = b.timestamp ? b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp) : new Date(0);
                return bTime - aTime;
            });

            if (transactions.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #6c757d;"></i>
                        <h3>No Customer Transactions</h3>
                        <p>Customer purchase history will appear here.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = transactions.map(transaction => `
                <div class="message-item" style="border: 2px solid #28a745; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; background: #d4edda;">
                    <div class="message-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: #155724; font-size: 1.1rem;">
                            <i class="fas fa-shopping-cart" style="color: #28a745; margin-right: 0.5rem;"></i>
                            Potential Order - ${transaction.shopName}
                        </h4>
                        <span class="message-status" style="
                            padding: 0.3rem 0.8rem; 
                            border-radius: 20px; 
                            font-size: 0.8rem; 
                            font-weight: 600; 
                            background-color: #28a745;
                            color: white;
                        ">New Order</span>
                    </div>
                    <div class="message-content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div>
                            <strong style="color: #155724; font-size: 0.9rem;">Product:</strong>
                            <p style="margin: 0.2rem 0; color: #155724;">${transaction.productName}</p>
                        </div>
                        <div>
                            <strong style="color: #155724; font-size: 0.9rem;">Price:</strong>
                            <p style="margin: 0.2rem 0; color: #155724; font-weight: bold;">Ksh ${transaction.productPrice}</p>
                        </div>
                        <div>
                            <strong style="color: #155724; font-size: 0.9rem;">Customer Source:</strong>
                            <p style="margin: 0.2rem 0; color: #155724;">
                                ${transaction.customerFromFacebook ? 
                                    '<i class="fab fa-facebook" style="color: #1877f2;"></i> Facebook' : 
                                    '<i class="fas fa-globe"></i> Direct'}
                            </p>
                        </div>
                        <div>
                            <strong style="color: #155724; font-size: 0.9rem;">Time:</strong>
                            <p style="margin: 0.2rem 0; color: #155724;">
                                ${transaction.timestamp ? new Date(transaction.timestamp.toDate ? transaction.timestamp.toDate() : transaction.timestamp).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div class="message-actions" style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                        <button class="btn primary small" onclick="window.adminPanel.viewTransactionDetails('${transaction.id}')" style="
                            padding: 0.5rem 1rem;
                            border: none;
                            border-radius: 6px;
                            background: #007bff;
                            color: white;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="btn success small" onclick="window.adminPanel.markTransactionCompleted('${transaction.id}')" style="
                            padding: 0.5rem 1rem;
                            border: none;
                            border-radius: 6px;
                            background: #28a745;
                            color: white;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <i class="fas fa-check"></i> Mark Completed
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error rendering transactions:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #dc3545;"></i>
                    <h3>Error Loading Transactions</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }

    viewTransactionDetails(transactionId) {
        // Implementation for viewing transaction details
        this.showNotification('Transaction details feature coming soon', 'info');
    }

    async markTransactionCompleted(transactionId) {
        try {
            await db.collection('transactions').doc(transactionId).update({
                status: 'completed',
                completedAt: new Date()
            });

            this.showNotification('Transaction marked as completed', 'success');
            this.renderMessages(); // Refresh the transactions list
            this.updateCategoryCounts(); // Update the count
        } catch (error) {
            console.error('Error marking transaction as completed:', error);
            this.showNotification('Error updating transaction', 'error');
        }
    }

    updateCategoryCounts() {
        const pendingCount = this.messages.filter(m => m.status === 'pending').length;
        const approvedCount = this.messages.filter(m => m.status === 'approved').length;
        const paymentsCount = this.messages.filter(m => m.type === 'premium_request').length;
        
        this.updateElement('approvals-count', pendingCount);
        this.updateElement('approved-count', approvedCount);
        this.updateElement('payments-count', paymentsCount);
        
        // Load transactions count separately
        this.loadTransactionsCount();
        
        console.log(`📊 Category counts: Pending: ${pendingCount}, Approved: ${approvedCount}, Payments: ${paymentsCount}`);
    }

    async loadTransactionsCount() {
        try {
            const transactionsSnapshot = await db.collection('transactions')
                .where('type', '==', 'potential_order')
                .get();
            
            const transactionsCount = transactionsSnapshot.size;
            this.updateElement('transactions-count', transactionsCount);
            
            console.log(`📊 Transactions count: ${transactionsCount}`);
        } catch (error) {
            console.error('Error loading transactions count:', error);
        }
    }

    renderControl() {
        console.log('🎨 Rendering control table...');
        const tbody = document.getElementById('control-tbody');
        if (!tbody) {
            console.error('❌ Control table tbody not found!');
            return;
        }
        
        const approvedUsers = this.users.filter(u => u.status === 'approved');
        console.log(`📊 Rendering ${approvedUsers.length} approved users out of ${this.users.length} total users`);
        
        if (approvedUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-user-cog" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        No approved users found
                    </td>
                </tr>
            `;
            console.log('📭 No approved users to display');
            return;
        }
        
        tbody.innerHTML = approvedUsers.map(user => {
            console.log(`🎛️ Rendering control user: ${user.username} (${user.accountType}) - muted: ${user.muted}`);
            return `
            <tr>
                <td>${user.username || user.shopName || 'N/A'}</td>
                <td>${user.contact || user.phone || 'N/A'}</td>
                <td style="background-color: ${user.accountType === 'premium' ? '#ffc107' : '#007bff'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                    ${user.accountType || 'free'}
                </td>
                <td style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; 
                    background-color: ${user.status === 'approved' ? '#28a745' : user.status === 'pending' ? '#ffc107' : '#6c757d'}; color: white;">
                    ${user.status || 'pending'} ${user.muted ? '<i class="fas fa-volume-mute" style="color: #dc3545; margin-left: 5px;" title="Muted"></i>' : ''}
                </td>
                <td>
                    ${user.muted ? 
                        `<button class="btn success small" onclick="window.adminPanel.unmuteUser('${user.id || user.userId}')">
                            <i class="fas fa-volume-up"></i> Unmute
                        </button>` :
                        `<button class="btn warning small" onclick="window.adminPanel.muteUser('${user.id || user.userId}')">
                            <i class="fas fa-volume-mute"></i> Mute
                        </button>`
                    }
                </td>
            </tr>
        `;
        }).join('');
        
        console.log('✅ Control table rendered successfully');
        
        // Update table headers with sorting indicators
        this.updateTableHeaders('control');
    }

    async deleteUser(userId) {
        try {
            if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
                return;
            }
            
            console.log(`🗑️ Deleting user with userId: ${userId}`);
            
            // Find all users with this userId (check both userId and id fields)
            const usersSnapshot = await db.collection('users').where('userId', '==', userId).get();
            const usersByIdSnapshot = await db.collection('users').where('id', '==', userId).get();
            
            // Combine results from both searches
            const allUsers = [...usersSnapshot.docs, ...usersByIdSnapshot.docs];
            
            console.log(`🔍 Debug - Looking for users with userId: ${userId}`);
            console.log(`🔍 Debug - Users by userId snapshot size: ${usersSnapshot.size}`);
            console.log(`🔍 Debug - Users by id snapshot size: ${usersByIdSnapshot.size}`);
            console.log(`🔍 Debug - Total users found: ${allUsers.length}`);
            console.log(`🔍 Debug - Users found:`, allUsers.map(doc => ({id: doc.id, userId: doc.data().userId, ...doc.data()})));
            
            if (allUsers.length > 0) {
                // Delete all user accounts with this userId
                const deletePromises = allUsers.map(doc => 
                    doc.ref.delete()
                );
                await Promise.all(deletePromises);
                console.log(`✅ Deleted ${allUsers.length} user accounts with userId: ${userId}`);
                
                // Also delete related messages and premium requests
                const inboxSnapshot = await db.collection('admin_inbox').where('userId', '==', userId).get();
                if (!inboxSnapshot.empty) {
                    const inboxDeletePromises = inboxSnapshot.docs.map(doc => doc.ref.delete());
                    await Promise.all(inboxDeletePromises);
                    console.log(`✅ Deleted ${inboxSnapshot.docs.length} inbox messages`);
                }
                
                const premiumSnapshot = await db.collection('premiumRequests').where('userId', '==', userId).get();
                if (!premiumSnapshot.empty) {
                    const premiumDeletePromises = premiumSnapshot.docs.map(doc => doc.ref.delete());
                    await Promise.all(premiumDeletePromises);
                    console.log(`✅ Deleted ${premiumSnapshot.docs.length} premium requests`);
                }
                
                this.showNotification('User account deleted successfully', 'success');
                
                // Refresh data
                await this.loadUsers();
                await this.loadMessages();
                this.updateStats();
                this.renderUsers();
                this.renderControl();
                this.renderMessages();
            } else {
                this.showNotification('User not found', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showNotification('Error deleting user', 'error');
        }
    }

    async approveUser(userId) {
        try {
            console.log(`🔧 Approving user with userId: ${userId}`);
            
            // Check if this is a premium upgrade request
            const premiumSnapshot = await db.collection('premiumRequests').where('userId', '==', userId).where('status', '==', 'pending').get();
            const isPremiumUpgrade = !premiumSnapshot.empty;
            
            if (isPremiumUpgrade) {
                console.log('👑 This is a premium upgrade request');
                
                // Get premium request details
                const premiumRequest = premiumSnapshot.docs[0].data();
                
                // Check if user already exists in users collection
                const existingUserSnapshot = await db.collection('users').where('userId', '==', userId).get();
                
                // ALWAYS create a new premium user account for upgrades
                console.log('🆕 Creating new premium user account');
                const newUserDoc = {
                    username: premiumRequest.username || premiumRequest.fullName || `Premium User ${Date.now()}`,
                    email: premiumRequest.email,
                    phone: premiumRequest.phone || premiumRequest.mpesaNumber,
                    userId: userId,
                    accountType: 'premium',
                    status: 'approved',
                    approvedAt: new Date(),
                    timestamp: new Date(),
                    paymentStatus: true,
                    premiumRequestId: premiumSnapshot.docs[0].id,
                    upgradedFrom: 'premium_request',
                    amount: premiumRequest.amount,
                    paymentMethod: premiumRequest.paymentMethod,
                    billingCycle: premiumRequest.billingCycle || 'monthly'
                };
                
                // Add new premium user to users collection
                await db.collection('users').add(newUserDoc);
                console.log('✅ New premium user account created successfully');
                
                // Update premium request status
                const updatePromises = premiumSnapshot.docs.map(doc => 
                    doc.ref.update({
                        status: 'approved',
                        processedAt: new Date()
                    })
                );
                await Promise.all(updatePromises);
                console.log(`✅ Updated ${premiumSnapshot.docs.length} premium requests to approved status`);
                
                // Update admin_inbox messages
                const inboxSnapshot = await db.collection('admin_inbox').where('userId', '==', userId).get();
                if (!inboxSnapshot.empty) {
                    const updatePromises = inboxSnapshot.docs.map(doc => 
                        doc.ref.update({
                            status: 'approved',
                            processedAt: new Date()
                        })
                    );
                    await Promise.all(updatePromises);
                    console.log(`✅ Updated ${inboxSnapshot.docs.length} inbox documents to approved status`);
                }
                
                this.showNotification('Premium account approved successfully!', 'success');
                
            } else {
                // Regular user approval (not premium upgrade)
                console.log('👤 Regular user approval');
                
                // Find the user document by userId field, but look for pending ones first
                const usersSnapshot = await db.collection('users').where('userId', '==', userId).get();
                
                if (usersSnapshot.empty) {
                    console.error(`❌ No user found with userId: ${userId}`);
                    this.showNotification('User not found', 'error');
                    return;
                }
                
                // Look for pending user first, if multiple users exist
                let userDoc = null;
                let pendingUser = null;
                
                if (usersSnapshot.size > 1) {
                    console.log(`🔍 Found ${usersSnapshot.size} users with userId: ${userId}, looking for pending one`);
                    for (const doc of usersSnapshot.docs) {
                        const userData = doc.data();
                        console.log(`🔍 Checking user: ${userData.username} (${userData.accountType}) - status: ${userData.status}`);
                        if (userData.status === 'pending_approval' || userData.status === 'pending') {
                            pendingUser = doc;
                            console.log(`✅ Found pending user: ${userData.username} (${userData.accountType})`);
                            break;
                        }
                    }
                    userDoc = pendingUser || usersSnapshot.docs[0];
                } else {
                    userDoc = usersSnapshot.docs[0];
                }
                
                const docId = userDoc.id;
                const userData = userDoc.data();
                console.log(`🔧 Selected user document: ${docId} - ${userData.username} (${userData.accountType})`);
                
                // Update the found document
                await db.collection('users').doc(docId).update({
                    status: 'approved',
                    approvedAt: new Date()
                });
                
                // Also update admin_inbox if there are any messages for this user
                const inboxSnapshot = await db.collection('admin_inbox').where('userId', '==', userId).get();
                if (!inboxSnapshot.empty) {
                    const updatePromises = inboxSnapshot.docs.map(doc => 
                        doc.ref.update({
                            status: 'approved',
                            processedAt: new Date()
                        })
                    );
                    await Promise.all(updatePromises);
                    console.log(`✅ Updated ${inboxSnapshot.docs.length} inbox documents to approved status`);
                }
                
                this.showNotification('User approved successfully', 'success');
            }
            
            // Refresh data and UI
            await this.loadUsers();
            await this.loadMessages();
            this.updateStats();
            this.renderUsers();
            this.renderControl();
            this.renderMessages();
            
            this.showNotification('User approved successfully', 'success');
            console.log(`✅ User ${userId} approved successfully`);
        } catch (error) {
            console.error('❌ Error approving user:', error);
            this.showNotification('Error approving user', 'error');
        }
    }

    async denyUser(userId) {
        try {
            await db.collection('users').doc(userId).update({
                status: 'rejected',
                rejectedAt: new Date()
            });
            
            this.showNotification('User request denied', 'info');
            this.loadUsers();
            this.loadMessages();
        } catch (error) {
            this.showNotification('Error denying user', 'error');
        }
    }

    async muteUser(userId) {
        try {
            console.log(`🔇 Muting user: ${userId}`);
            await db.collection('users').doc(userId).update({
                muted: true,
                mutedAt: new Date()
            });
            
            // Hide user's products
            const productsSnapshot = await db.collection('products').where('userId', '==', userId).get();
            const updatePromises = productsSnapshot.docs.map(doc => 
                doc.ref.update({ visible: false })
            );
            await Promise.all(updatePromises);
            
            // Refresh data and UI
            await this.loadUsers();
            this.updateStats();
            this.renderUsers();
            this.renderControl();
            
            this.showNotification('User muted successfully', 'success');
            console.log(`✅ User ${userId} muted successfully`);
        } catch (error) {
            console.error('❌ Error muting user:', error);
            this.showNotification('Error muting user', 'error');
        }
    }

    async unmuteUser(userId) {
        try {
            console.log(`🔊 Unmuting user: ${userId}`);
            await db.collection('users').doc(userId).update({
                muted: false,
                unmutedAt: new Date()
            });
            
            // Show user's products
            const productsSnapshot = await db.collection('products').where('userId', '==', userId).get();
            const updatePromises = productsSnapshot.docs.map(doc => 
                doc.ref.update({ visible: true })
            );
            await Promise.all(updatePromises);
            
            // Refresh data and UI
            await this.loadUsers();
            this.updateStats();
            this.renderUsers();
            this.renderControl();
            
            this.showNotification('User unmuted successfully', 'success');
            console.log(`✅ User ${userId} unmuted successfully`);
        } catch (error) {
            console.error('❌ Error unmuting user:', error);
            this.showNotification('Error unmuting user', 'error');
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
    }

    switchCategory(category) {
        console.log('🔄 Switching to category:', category);
        
        // Set current category
        this.currentCategory = category;
        
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`)?.classList.add('active');
        
        document.querySelectorAll('.category-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${category}-content`)?.classList.add('active');
        
        // Re-render messages for the new category
        this.renderMessages();
    }

    showLoginScreen() {
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('admin-login').style.display = 'flex';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // MARKET ANALYTICS AND PAYMENT MONITORING
    async initMarketMonitoring() {
        console.log('📊 Initializing Market Analytics & Payment Monitor...');
        
        await this.loadPaymentData();
        await this.loadMarketStats();
        this.initCharts();
      // Render other message lists (approved, payments)
        this.renderApprovedMessages();
        this.renderPaymentMessages();
        
        console.log('✅ Messages rendered successfully');
    }

    renderApprovedMessages() {
        const approvedList = document.getElementById('approved-list');
        if (approvedList) {
            const approvedMessages = this.messages.filter(m => m.status === 'approved');
            
            if (approvedMessages.length === 0) {
                approvedList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #28a745;"></i>
                        <h3>No Approved Requests</h3>
                        <p>No approved requests in this category.</p>
                    </div>
                `;
            } else {
                approvedList.innerHTML = approvedMessages.map(message => `
                    <div class="message-item" style="border: 2px solid #28a745; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; background: #d4edda;">
                        <div class="message-header">
                            <h4 style="color: #28a745;">
                                <i class="fas fa-check-circle"></i> ${message.username}
                            </h4>
                            <span class="message-status approved" style="background: #28a745; color: white;">
                                ✅ Approved
                            </span>
                        </div>
                        <div class="message-content">
                            <p style="margin: 0; color: var(--text-color); line-height: 1.5;">
                                ${message.message}
                            </p>
                            <div style="color: #28a745; font-size: 0.9rem; margin-top: 0.5rem;">
                                <i class="fas fa-calendar"></i> 
                                Approved on ${new Date(message.processedAt?.toDate?.() || message.processedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    renderPaymentMessages() {
        const paymentsList = document.getElementById('payments-list');
        if (paymentsList) {
            const paymentMessages = this.messages.filter(m => m.type === 'premium_request' || m.paymentStatus === true);
            
            if (paymentMessages.length === 0) {
                paymentsList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-credit-card" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #6c757d;"></i>
                        <h3>No Payment Notifications</h3>
                        <p>No payment notifications in this category.</p>
                    </div>
                `;
            } else {
                paymentsList.innerHTML = paymentMessages.map(message => `
                    <div class="message-item" style="border: 2px solid #6c757d; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; background: #d4edda;">
                        <div class="message-header">
                            <h4 style="color: #6c757d;">
                                <i class="fas fa-credit-card"></i> ${message.username}
                            </h4>
                            <span class="message-status approved" style="background: #6c757d; color: white;">
                                💳 Payment Received
                            </span>
                        </div>
                        <div class="message-content">
                            <p style="margin: 0; color: var(--text-color); line-height: 1.5;">
                                ${message.message}
                            </p>
                            <div style="color: #6c757d; font-size: 0.9rem; margin-top: 0.5rem;">
                                <i class="fas fa-money-bill-wave"></i> 
                                Amount: Ksh ${message.amount || 'N/A'}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    async loadPaymentData() {
        try {
            this.payments = [];
            
            // Load premium upgrade payments
            const premiumSnapshot = await db.collection('premiumRequests').get();
            premiumSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.status === 'approved' && data.amount) {
                    this.payments.push({
                        id: doc.id,
                        userId: data.userId,
                        username: data.username || data.fullName,
                        email: data.email,
                        amount: data.amount,
                        type: 'premium_upgrade',
                        method: data.paymentMethod || 'mpesa',
                        status: 'completed',
                        timestamp: data.processedAt?.toDate() || new Date(),
                        currency: data.currency || 'Ksh'
                    });
                }
            });
            
            this.payments.sort((a, b) => b.timestamp - a.timestamp);
            console.log(`📊 Loaded ${this.payments.length} payment records`);
            
        } catch (error) {
            console.error('❌ Error loading payment data:', error);
            this.createSamplePaymentData();
        }
    }

    createSamplePaymentData() {
        this.payments = [
            {
                id: 'pay_001',
                userId: 'user_001',
                username: 'John Shop',
                email: 'john@example.com',
                amount: 200,
                type: 'premium_upgrade',
                method: 'mpesa',
                status: 'completed',
                timestamp: new Date(Date.now() - 86400000),
                currency: 'Ksh'
            },
            {
                id: 'pay_002',
                userId: 'user_002',
                username: 'Mary Store',
                email: 'mary@example.com',
                amount: 200,
                type: 'premium_upgrade',
                method: 'card',
                status: 'completed',
                timestamp: new Date(Date.now() - 172800000),
                currency: 'Ksh'
            }
        ];
    }

    async loadMarketStats() {
        try {
            const usersSnapshot = await db.collection('users').get();
            const totalUsers = usersSnapshot.size;
            const premiumUsers = usersSnapshot.docs.filter(doc => doc.data().accountType === 'premium').length;
            const activeUsers = usersSnapshot.docs.filter(doc => doc.data().status === 'approved').length;
            
            const completedPayments = this.payments.filter(p => p.status === 'completed');
            const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const avgOrderValue = completedPayments.length > 0 ? totalRevenue / completedPayments.length : 0;
            
            this.marketStats = {
                totalRevenue,
                totalTransactions: completedPayments.length,
                totalUsers,
                premiumUsers,
                activeUsers,
                avgOrderValue
            };
            
        } catch (error) {
            this.marketStats = {
                totalRevenue: 400,
                totalTransactions: 2,
                totalUsers: 5,
                premiumUsers: 2,
                activeUsers: 3,
                avgOrderValue: 200
            };
        }
    }

    initCharts() {
        // Initialize charts if Chart.js is available
        if (typeof Chart !== 'undefined') {
            this.initMarketChart();
            this.initRevenuePieChart();
            this.initPaymentMethodsChart();
        }
    }

    initMarketChart() {
        const ctx = document.getElementById('market-chart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        const candlestickData = this.generateCandlestickData();
        
        this.charts.market = new Chart(ctx, {
            type: 'line',
            data: {
                labels: candlestickData.labels,
                datasets: [{
                    label: 'Revenue Trend',
                    data: candlestickData.data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Ksh ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    generateCandlestickData() {
        const days = 30;
        const labels = [];
        const data = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            
            const baseRevenue = 200;
            const variation = Math.random() * 100 - 50;
            data.push(Math.max(0, baseRevenue + variation));
        }
        
        return { labels, data };
    }

    initRevenuePieChart() {
        const ctx = document.getElementById('revenue-pie-chart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        const revenueData = this.calculateRevenueDistribution();
        
        this.charts.revenuePie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Premium Upgrades', 'Product Sales', 'Service Fees'],
                datasets: [{
                    data: [revenueData.premium, revenueData.products, revenueData.services],
                    backgroundColor: ['#28a745', '#007bff', '#ffc107'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    initPaymentMethodsChart() {
        const ctx = document.getElementById('payment-methods-chart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        const paymentData = this.calculatePaymentMethods();
        
        this.charts.paymentMethods = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(paymentData),
                datasets: [{
                    data: Object.values(paymentData),
                    backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    calculateRevenueDistribution() {
        const premiumRevenue = this.payments
            .filter(p => p.type === 'premium_upgrade' && p.status === 'completed')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        return {
            premium: premiumRevenue,
            products: Math.floor(premiumRevenue * 0.3),
            services: Math.floor(premiumRevenue * 0.1)
        };
    }

    calculatePaymentMethods() {
        const methods = {};
        this.payments.forEach(payment => {
            const method = payment.method || 'other';
            methods[method] = (methods[method] || 0) + 1;
        });
        return methods;
    }

    updateMarketOverview() {
        if (!this.marketStats) return;
        
        const revenueEl = document.getElementById('total-revenue');
        const transactionsEl = document.getElementById('total-transactions');
        const usersEl = document.getElementById('active-users-count');
        const avgOrderEl = document.getElementById('avg-order-value');
        
        if (revenueEl) revenueEl.textContent = `Ksh ${this.marketStats.totalRevenue.toLocaleString()}`;
        if (transactionsEl) transactionsEl.textContent = this.marketStats.totalTransactions.toLocaleString();
        if (usersEl) usersEl.textContent = this.marketStats.activeUsers.toLocaleString();
        if (avgOrderEl) avgOrderEl.textContent = `Ksh ${Math.round(this.marketStats.avgOrderValue).toLocaleString()}`;
        
        this.updateChangeIndicators();
    }

    updateChangeIndicators() {
        const changes = {
            revenue: '+15%',
            transactions: '+8%',
            users: '+12%',
            avgOrder: '-3%'
        };
        
        this.updateChangeDisplay('revenue-change', changes.revenue, true);
        this.updateChangeDisplay('transactions-change', changes.transactions, true);
        this.updateChangeDisplay('users-change', changes.users, true);
        this.updateChangeDisplay('avg-change', changes.avgOrder, false);
    }

    updateChangeDisplay(elementId, change, isPositive) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        element.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${change}
        `;
    }

    renderPaymentHistory() {
        const tbody = document.getElementById('payments-tbody');
        if (!tbody) return;
        
        const filteredPayments = this.getFilteredPayments();
        
        if (filteredPayments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        No payments found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredPayments.map(payment => `
            <tr>
                <td>${payment.timestamp.toLocaleDateString()}</td>
                <td>${payment.username || 'N/A'}</td>
                <td>${this.formatPaymentType(payment.type)}</td>
                <td>${payment.currency || 'Ksh'} ${payment.amount.toLocaleString()}</td>
                <td>${payment.method || 'N/A'}</td>
                <td><span class="payment-status ${payment.status}">${payment.status}</span></td>
                <td>
                    <button class="btn small" onclick="window.adminPanel.viewPaymentDetails('${payment.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    formatPaymentType(type) {
        const types = {
            'premium_upgrade': 'Premium Upgrade',
            'product_sale': 'Product Sale',
            'service_fee': 'Service Fee'
        };
        return types[type] || type;
    }

    getFilteredPayments() {
        let filtered = [...this.payments];
        
        // Apply time range filter
        filtered = this.filterByTimeRange(filtered);
        
        // Apply status filter
        const statusFilter = document.getElementById('payment-filter')?.value;
        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }
        
        // Apply search filter
        const searchTerm = document.getElementById('payment-search')?.value?.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(p => 
                (p.username && p.username.toLowerCase().includes(searchTerm)) ||
                (p.email && p.email.toLowerCase().includes(searchTerm))
            );
        }
        
        return filtered;
    }

    filterByTimeRange(payments) {
        const now = new Date();
        const ranges = {
            'today': new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            'week': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            'month': new Date(now.getFullYear(), now.getMonth(), 1),
            'year': new Date(now.getFullYear(), 0, 1),
            'all': new Date(0)
        };
        
        const cutoff = ranges[this.currentTimeRange] || ranges.month;
        return payments.filter(p => p.timestamp >= cutoff);
    }

    startActivityFeed() {
        const feedContainer = document.getElementById('activity-feed');
        if (!feedContainer) return;
        
        this.addActivityItem('system', 'Market Monitor Started', 'Real-time payment and market analytics monitoring is now active');
        
        const recentPayments = this.payments.slice(0, 5);
        recentPayments.forEach(payment => {
            const action = payment.status === 'completed' ? 'completed' : 'initiated';
            this.addActivityItem('payment', 
                `Payment ${action}`, 
                `${payment.username} - ${payment.currency || 'Ksh'} ${payment.amount.toLocaleString()}`,
                payment.timestamp
            );
        });
    }

    addActivityItem(type, title, description, timestamp = new Date()) {
        const feedContainer = document.getElementById('activity-feed');
        if (!feedContainer) return;
        
        const activityHtml = `
            <div class="activity-item">
                <div class="activity-icon ${type}">
                    <i class="fas fa-${this.getActivityIcon(type)}"></i>
                </div>
                <div class="activity-content">
                    <h4>${title}</h4>
                    <p>${description}</p>
                    <small>${timestamp.toLocaleString()}</small>
                </div>
            </div>
        `;
        
        feedContainer.insertAdjacentHTML('afterbegin', activityHtml);
        
        const activities = feedContainer.querySelectorAll('.activity-item');
        if (activities.length > 20) {
            activities[activities.length - 1].remove();
        }
    }

    getActivityIcon(type) {
        const icons = {
            'payment': 'credit-card',
            'user': 'user',
            'system': 'cog'
        };
        return icons[type] || 'info-circle';
    }

    startRealTimeMonitoring() {
        // Listen for premium request updates
        if (window.db) {
            db.collection('premiumRequests').onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        const data = change.doc.data();
                        if (data.status === 'approved' && data.amount) {
                            const payment = {
                                id: change.doc.id,
                                userId: data.userId,
                                username: data.username || data.fullName,
                                email: data.email,
                                amount: data.amount,
                                type: 'premium_upgrade',
                                method: data.paymentMethod || 'mpesa',
                                status: 'completed',
                                timestamp: data.processedAt?.toDate() || new Date(),
                                currency: data.currency || 'Ksh'
                            };
                            this.payments.unshift(payment);
                            this.handleNewPayment(payment);
                        }
                    }
                });
            });
        }
    }

    handleNewPayment(payment) {
        console.log('💳 New payment detected:', payment);
        
        this.updateMarketOverview();
        this.renderPaymentHistory();
        
        const action = payment.status === 'completed' ? 'received' : 'initiated';
        this.addActivityItem('payment', 
            `Payment ${action}`, 
            `${payment.username} - ${payment.currency || 'Ksh'} ${payment.amount.toLocaleString()}`
        );
        
        this.updateCharts();
        this.showNotification(`New payment ${action}: ${payment.currency || 'Ksh'} ${payment.amount.toLocaleString()}`, 'success');
    }

    updateCharts() {
        if (this.charts.market) {
            const candlestickData = this.generateCandlestickData();
            this.charts.market.data.labels = candlestickData.labels;
            this.charts.market.data.datasets[0].data = candlestickData.data;
            this.charts.market.update();
        }
        
        if (this.charts.revenuePie) {
            const revenueData = this.calculateRevenueDistribution();
            this.charts.revenuePie.data.datasets[0].data = [
                revenueData.premium, 
                revenueData.products, 
                revenueData.services
            ];
            this.charts.revenuePie.update();
        }
        
        if (this.charts.paymentMethods) {
            const paymentData = this.calculatePaymentMethods();
            this.charts.paymentMethods.data.datasets[0].data = Object.values(paymentData);
            this.charts.paymentMethods.update();
        }
    }

    // Additional monitor methods
    updateTimeRange() {
        const timeRange = document.getElementById('time-range')?.value;
        if (timeRange) {
            this.currentTimeRange = timeRange;
            this.renderPaymentHistory();
            this.updateMarketOverview();
        }
    }

    switchChart(chartType) {
        this.currentChartType = chartType;
        
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-chart="${chartType}"]`)?.classList.add('active');
        
        if (this.charts.market) {
            this.charts.market.config.type = chartType === 'candlestick' ? 'line' : chartType;
            this.charts.market.update();
        }
    }

    searchPayments() {
        this.renderPaymentHistory();
    }

    filterPayments() {
        this.renderPaymentHistory();
    }

    sortPayments(field) {
        this.payments.sort((a, b) => {
            if (field === 'date') {
                return b.timestamp - a.timestamp;
            } else if (field === 'amount') {
                return (b.amount || 0) - (a.amount || 0);
            } else if (field === 'user') {
                return (a.username || '').localeCompare(b.username || '');
            }
            return 0;
        });
        this.renderPaymentHistory();
    }

    refreshMonitor() {
        this.loadPaymentData();
        this.loadMarketStats();
        this.updateMarketOverview();
        this.renderPaymentHistory();
        this.updateCharts();
        this.showNotification('Monitor data refreshed', 'success');
    }

    viewPaymentDetails(paymentId) {
        const payment = this.payments.find(p => p.id === paymentId);
        if (payment) {
            this.showNotification(`Payment details for ${payment.username}: ${payment.currency || 'Ksh'} ${payment.amount.toLocaleString()}`, 'info');
        }
    }

    filterUsersByAccountType(filter) {
        console.log(`🔍 Filtering users by account type: ${filter}`);
        
        let filteredUsers = this.users;
        
        if (filter !== 'all') {
            filteredUsers = this.users.filter(user => user.accountType === filter);
        }
        
        console.log(`📊 Filtered ${this.users.length} users to ${filteredUsers.length} users with type: ${filter}`);
        
        // Update the users table with filtered results
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        
        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        No ${filter === 'premium' ? 'premium' : 'free'} users found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>${user.username || user.shopName || 'N/A'}</td>
                <td>${user.userId || user.id || 'N/A'}</td>
                <td>${user.contact || user.phone || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td style="background-color: ${user.accountType === 'premium' ? '#ffc107' : '#007bff'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                    ${user.accountType || 'free'}
                </td>
                <td>${user.timestamp ? (user.timestamp.toDate ? user.timestamp.toDate().toLocaleDateString() : new Date(user.timestamp).toLocaleDateString()) : 'N/A'}</td>
                <td style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; 
                    background-color: ${user.status === 'approved' ? '#28a745' : user.status === 'pending' ? '#ffc107' : '#6c757d'}; color: white;">
                    ${user.status || 'pending'}
                </td>
                <td>
                    ${user.status === 'pending' ? `
                        <button class="btn small" onclick="window.adminPanel.approveUser('${user.id || user.userId}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                    ` : '<span style="color: #28a745; font-weight: bold;">✓ Approved</span>'}
                </td>
            </tr>
        `).join('');
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
        
        console.log(`✅ Users table filtered by ${filter}`);
    }

    // Search functionality
    searchUsers() {
        const searchInput = document.getElementById('user-search');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        
        const rows = tbody.getElementsByTagName('tr');
        
        for (let row of rows) {
            const cells = row.getElementsByTagName('td');
            let found = false;
            
            for (let cell of cells) {
                if (cell.textContent.toLowerCase().includes(searchTerm)) {
                    found = true;
                    break;
                }
            }
            
            row.style.display = found ? '' : 'none';
        }
    }

    sortUsers(field) {
        this.currentSortField = field;
        this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        
        this.users.sort((a, b) => {
            let aVal, bVal;
            
            switch(field) {
                case 'username':
                    aVal = (a.username || a.shopName || '').toLowerCase();
                    bVal = (b.username || b.shopName || '').toLowerCase();
                    break;
                case 'userId':
                    aVal = a.userId || a.id || '';
                    bVal = b.userId || b.id || '';
                    break;
                case 'contact':
                    aVal = a.contact || a.phone || '';
                    bVal = b.contact || b.phone || '';
                    break;
                case 'email':
                    aVal = a.email || '';
                    bVal = b.email || '';
                    break;
                case 'accountType':
                    aVal = a.accountType || 'free';
                    bVal = b.accountType || 'free';
                    break;
                case 'timestamp':
                    aVal = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
                    bVal = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
                    break;
                case 'status':
                    aVal = a.status || 'pending';
                    bVal = b.status || 'pending';
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return this.currentSortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.renderUsers();
    }

    searchControl() {
        const searchInput = document.getElementById('control-search');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        const tbody = document.getElementById('control-tbody');
        if (!tbody) return;
        
        const rows = tbody.getElementsByTagName('tr');
        
        for (let row of rows) {
            const cells = row.getElementsByTagName('td');
            let found = false;
            
            for (let cell of cells) {
                if (cell.textContent.toLowerCase().includes(searchTerm)) {
                    found = true;
                    break;
                }
            }
            
            row.style.display = found ? '' : 'none';
        }
    }

    // Filter functionality
    filterUsers(filterType) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filterType}"]`)?.classList.add('active');
        
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        
        const rows = tbody.getElementsByTagName('tr');
        
        for (let row of rows) {
            const cells = row.getElementsByTagName('td');
            let shouldShow = false;
            
            if (filterType === 'all') {
                shouldShow = true;
            } else {
                const accountTypeCell = cells[4]; // Account type column
                if (accountTypeCell) {
                    const accountType = accountTypeCell.textContent.toLowerCase().trim();
                    shouldShow = accountType === filterType;
                }
            }
            
            row.style.display = shouldShow ? '' : 'none';
        }
    }

    filterControl(filterType) {
        document.querySelectorAll('#control-tab .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#control-tab [data-filter="${filterType}"]`)?.classList.add('active');
        
        const tbody = document.getElementById('control-tbody');
        if (!tbody) return;
        
        const rows = tbody.getElementsByTagName('tr');
        
        for (let row of rows) {
            const cells = row.getElementsByTagName('td');
            let shouldShow = false;
            
            if (filterType === 'all') {
                shouldShow = true;
            } else {
                const accountTypeCell = cells[2]; // Account type column in control table
                if (accountTypeCell) {
                    const accountType = accountTypeCell.textContent.toLowerCase().trim();
                    shouldShow = accountType === filterType;
                }
            }
            
            row.style.display = shouldShow ? '' : 'none';
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminPanel = new AdminPanel();
});

// Global functions for HTML onclick handlers
function switchTab(tabName) {
    if (window.adminPanel) {
        window.adminPanel.switchTab(tabName);
    }
}

function sortUsers(field) {
    if (window.adminPanel) {
        window.adminPanel.sortUsers(field);
    }
}

function toggleTheme() {
    if (window.adminPanel) {
        document.body.classList.toggle('dark-theme');
        const icon = document.querySelector('.fa-moon, .fa-sun');
        if (icon) {
            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
        }
    }
}

function refreshData() {
    if (window.adminPanel) {
        window.adminPanel.loadAllData();
        window.adminPanel.showNotification('Data refreshed successfully', 'success');
    }
}

function exportData() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Export functionality coming soon', 'info');
    }
}

function adminLogout() {
    if (window.adminPanel) {
        localStorage.removeItem('adminAuth');
        window.adminPanel.showNotification('Logged out successfully', 'success');
        window.adminPanel.showLoginScreen();
    }
}

function goToHome() {
    if (window.adminPanel) {
        // Navigate to the main website homepage in the same tab
        window.location.href = '../index.html';
        window.adminPanel.showNotification('Navigating to homepage...', 'info');
    }
}

function markAllRead() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('All messages marked as read', 'success');
    }
}

function exportInbox() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Export functionality coming soon', 'info');
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('admin-code');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}

function searchControl() {
    if (window.adminPanel) {
        window.adminPanel.searchUsers();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function sendMessageToUser() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Message sent successfully', 'success');
        closeModal('message-modal');
    }
}

function sendMessage() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Send message functionality coming soon', 'info');
    }
}

function muteUser() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Please select a user from the control table', 'info');
    }
}

function bulkApprove() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Bulk approve functionality coming soon', 'info');
    }
}

function filterUsers(filter) {
    if (window.adminPanel) {
        window.adminPanel.filterUsersByAccountType(filter);
    }
}

function switchCategory(category) {
    if (window.adminPanel) {
        window.adminPanel.switchCategory(category);
    }
}

function searchUsers() {
    if (window.adminPanel) {
        window.adminPanel.searchUsers();
    }
}

function searchControl() {
    if (window.adminPanel) {
        window.adminPanel.searchControl();
    }
}

function filterUsers(filterType) {
    if (window.adminPanel) {
        window.adminPanel.filterUsers(filterType);
    }
}

function filterControl(filterType) {
    if (window.adminPanel) {
        window.adminPanel.filterControl(filterType);
    }
}

function updateTimeRange() {
    if (window.adminPanel) {
        window.adminPanel.updateTimeRange();
    }
}

function switchChart(chartType) {
    if (window.adminPanel) {
        window.adminPanel.switchChart(chartType);
    }
}

function searchPayments() {
    if (window.adminPanel) {
        window.adminPanel.searchPayments();
    }
}

function filterPayments() {
    if (window.adminPanel) {
        window.adminPanel.filterPayments();
    }
}

function sortPayments(field) {
    if (window.adminPanel) {
        window.adminPanel.sortPayments(field);
    }
}

function refreshMonitor() {
    if (window.adminPanel) {
        window.adminPanel.refreshMonitor();
    }
}

function bulkApprove() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Bulk approve functionality coming soon', 'info');
    }
}

function bulkMute() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Bulk mute functionality coming soon', 'info');
    }
}

function bulkUnmute() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Bulk unmute functionality coming soon', 'info');
    }
}

function exportUsers() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Export functionality coming soon', 'info');
    }
}

function exportMonitor() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Export monitor functionality coming soon', 'info');
    }
}

function markAllRead() {
    if (window.adminPanel) {
        window.adminPanel.showNotification('Mark all read functionality coming soon', 'info');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('admin-code');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}
