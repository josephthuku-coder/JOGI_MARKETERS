// Shop Page JavaScript - Shopping Online
class ShopManager {
    constructor() {
        this.currentShop = null;
        this.products = [];
        this.currentProduct = null;
        this.viewMode = 'grid';
        this.currentZoom = 1;
        this.imageDragSetup = false;
        this.selectedProducts = new Set(); // For multi-select sharing
        this.shopId = null;
        this.productId = null;
        this.db = null;
        this.auth = null;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Shop Manager...');
            
            // Show loading state
            this.showLoadingState();
            
            // Initialize Firebase
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            // Get URL parameters
            this.getUrlParameters();
            
            if (!this.shopId) {
                throw new Error('Shop ID is required');
            }
            
            // Load shop data
            await this.loadShopData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // If product ID is provided, load specific product
            if (this.productId) {
                await this.loadSpecificProduct();
            } else {
                // Load all products
                await this.loadProducts();
            }
            
            // Update SEO tags
            this.updateMetaTags();
            
            // Handle Facebook referral
            this.handleFacebookReferral();
            
            // Track analytics
            await this.trackAnalytics();
            
            // Hide loading state
            this.hideLoadingState();
            
            console.log('Shop Manager initialized successfully');
            
        } catch (error) {
            console.error('Shop Manager initialization failed:', error);
            this.showErrorState(error.message);
        }
    }

    getUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.shopId = urlParams.get('shop');
        this.productId = urlParams.get('product');
    }

    showLoadingState() {
        const loadingState = document.getElementById('loading-state');
        const productsSection = document.querySelector('.products-section');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (productsSection) productsSection.style.display = 'none';
    }

    hideLoadingState() {
        const loadingState = document.getElementById('loading-state');
        const productsSection = document.querySelector('.products-section');
        
        if (loadingState) loadingState.style.display = 'none';
        if (productsSection) productsSection.style.display = 'block';
    }

    showErrorState(message) {
        const errorState = document.getElementById('error-state');
        const errorMessage = document.getElementById('error-message');
        const loadingState = document.getElementById('loading-state');
        const productsSection = document.querySelector('.products-section');
        
        if (errorMessage) errorMessage.textContent = message;
        if (errorState) errorState.style.display = 'flex';
        if (loadingState) loadingState.style.display = 'none';
        if (productsSection) productsSection.style.display = 'none';
    }

    updateMetaTags() {
        try {
            const baseUrl = window.location.origin;
            const currentUrl = window.location.href;
            
            if (this.productId && this.currentProduct) {
                // Product-specific meta tags
                const title = `${this.currentProduct.name} - Ksh ${this.currentProduct.price} | Shopping Online`;
                const description = `${this.currentProduct.name} for Ksh ${this.currentProduct.price}. ${this.currentProduct.description}`;
                const imageUrl = this.currentProduct.imageUrl || '';
                
                this.setMetaTag('og:title', title);
                this.setMetaTag('og:description', description);
                this.setMetaTag('og:image', imageUrl);
                this.setMetaTag('og:url', currentUrl);
                this.setMetaTag('og:type', 'product');
                this.setMetaTag('twitter:title', title);
                this.setMetaTag('twitter:description', description);
                this.setMetaTag('twitter:image', imageUrl);
                this.setMetaTag('description', description);
                
                // Update page title
                document.title = title;
                
            } else if (this.currentShop) {
                // Shop-specific meta tags
                const title = `${this.currentShop.username}'s Shop | Shopping Online`;
                const description = `Check out amazing products from ${this.currentShop.username}'s shop on Shopping Online - Kenya's trusted marketplace`;
                const imageUrl = this.currentShop.bannerUrl || '';
                
                this.setMetaTag('og:title', title);
                this.setMetaTag('og:description', description);
                this.setMetaTag('og:image', imageUrl);
                this.setMetaTag('og:url', currentUrl);
                this.setMetaTag('og:type', 'website');
                this.setMetaTag('twitter:title', title);
                this.setMetaTag('twitter:description', description);
                this.setMetaTag('twitter:image', imageUrl);
                this.setMetaTag('description', description);
                
                // Update page title
                document.title = title;
            }
        } catch (error) {
            console.error('Error updating meta tags:', error);
        }
    }

    setMetaTag(property, content) {
        try {
            // Handle both og: and twitter: properties
            let tag;
            if (property.startsWith('og:')) {
                tag = document.querySelector(`meta[property="${property}"]`);
            } else if (property.startsWith('twitter:')) {
                tag = document.querySelector(`meta[name="${property}"]`);
            } else {
                tag = document.querySelector(`meta[name="${property}"]`);
            }
            
            if (!tag) {
                tag = document.createElement('meta');
                if (property.startsWith('og:')) {
                    tag.setAttribute('property', property);
                } else {
                    tag.setAttribute('name', property);
                }
                document.head.appendChild(tag);
            }
            
            tag.setAttribute('content', content);
        } catch (error) {
            console.error(`Error setting meta tag ${property}:`, error);
        }
    }

    async trackAnalytics() {
        try {
            if (!this.db) return;
            
            const analyticsRef = this.db.collection('analytics');
            
            if (this.productId) {
                // Track product view
                const productRef = analyticsRef.doc(this.productId);
                await productRef.set({
                    views: firebase.firestore.FieldValue.increment(1),
                    lastViewed: new Date().toISOString()
                }, { merge: true });
                
                console.log('Product view tracked:', this.productId);
            } else {
                // Track shop view
                const shopRef = analyticsRef.doc(`shop_${this.shopId}`);
                await shopRef.set({
                    views: firebase.firestore.FieldValue.increment(1),
                    lastViewed: new Date().toISOString()
                }, { merge: true });
                
                console.log('Shop view tracked:', this.shopId);
            }
        } catch (error) {
            console.error('Analytics tracking failed:', error);
        }
    }

    async loadProducts() {
        try {
            console.log('Loading products for shop:', this.shopId);
            
            if (!this.db) {
                throw new Error('Firebase not initialized');
            }
            
            // Load all products for the shop (debug mode - show all products first)
            const productsSnapshot = await this.db.collection('products')
                .where('shopId', '==', this.shopId)
                .get();
            
            console.log('Raw products found:', productsSnapshot.docs.length);
            
            // Show all products first for debugging
            this.products = productsSnapshot.docs.map(doc => {
                const product = { ...doc.data(), id: doc.id };
                console.log('Product found:', {
                    id: product.id,
                    name: product.name,
                    shopId: product.shopId,
                    status: product.status,
                    visible: product.visible
                });
                return product;
            });
            
            // Temporarily remove filters to see all products
            // .filter(product => product.status === 'active' && product.visible === true)
            // .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Client-side sorting
            
            console.log('Products loaded:', this.products.length);
            
            // Render products
            this.renderProducts();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showErrorState('Failed to load products: ' + error.message);
        }
    }

    async loadSpecificProduct() {
        try {
            console.log('Loading specific product:', this.productId);
            
            if (!this.db) {
                throw new Error('Firebase not initialized');
            }
            
            // Load specific product
            const productSnapshot = await this.db.collection('products')
                .where('shopId', '==', this.shopId)
                .where('id', '==', this.productId)
                .limit(1)
                .get();
            
            if (productSnapshot.empty) {
                throw new Error('Product not found');
            }
            
            this.currentProduct = {
                ...productSnapshot.docs[0].data(),
                id: productSnapshot.docs[0].id
            };
            
            console.log('Specific product loaded:', this.currentProduct);
            
            // Show product detail
            this.showProductDetail(this.currentProduct);
            
        } catch (error) {
            console.error('Error loading specific product:', error);
            this.showErrorState('Product not found: ' + error.message);
        }
    }

    async loadShopData() {
        try {
            // Show loading
            document.getElementById('loading-overlay').style.display = 'block';

            if (this.shopId) {
                // Load specific shop
                await this.loadSpecificShop();
            } else {
                // Load all shops or show error
                this.showError('No shop specified');
                return;
            }

            // Hide loading
            document.getElementById('loading-overlay').style.display = 'none';

        } catch (error) {
            console.error('Error loading shop:', error);
            this.showError('Failed to load shop');
            document.getElementById('loading-overlay').style.display = 'none';
        }
    }

    async loadSpecificShop() {
        console.log('🔍 Loading shop with ID:', this.shopId);
        
        // Determine owner ID (remove _premium suffix if present)
        let ownerId = this.shopId;
        if (this.shopId.endsWith('_premium')) {
            ownerId = this.shopId.replace('_premium', '');
        }
        
        // Get shop owner info
        const userDoc = await db.collection('users').doc(ownerId).get();
        if (!userDoc.exists) {
            console.error('❌ Shop not found for ID:', ownerId);
            this.showError('Shop not found');
            return;
        }

        this.currentShop = userDoc.data();
        console.log('📊 Shop data loaded:', this.currentShop);

        // Load shop products by shopId (comprehensive debugging)
        console.log('Loading products for shopId:', this.shopId);
        
        // First, let's see what products exist in the database
        const allProductsSnapshot = await db.collection('products').limit(10).get();
        console.log('All products in database (first 10):');
        console.log('Looking for shopId:', this.shopId);
        console.log('Type of shopId we are looking for:', typeof this.shopId);
        
        allProductsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            console.log('Product:', {
                id: doc.id,
                name: product.name,
                shopId: product.shopId,
                shopIdType: typeof product.shopId,
                shopIdMatch: product.shopId === this.shopId,
                status: product.status,
                visible: product.visible
            });
            
            // Explicit logging for shopId comparison
            console.log(`Product "${product.name}" shopId:`, product.shopId);
            console.log(`Does it match "${this.shopId}"?`, product.shopId === this.shopId);
        });
        
        // Now try to find products for this specific shopId
        // Show all products (permanent fix for development mode)
        const productsSnapshot = await db.collection('products').limit(50).get();
        console.log('Showing all products (development mode):');
        
        console.log('Raw products found:', productsSnapshot.docs.length);
        
        // Process products and ensure correct shopIds
        this.products = productsSnapshot.docs.map(doc => {
            const product = { ...doc.data(), id: doc.id };
            
            // Get current user's shopId
            const currentUserShopId = this.shopId;
            
            // Update products with wrong shopId to match current user
            if (product.shopId !== currentUserShopId) {
                console.log(`🔄 Updating product "${product.name}" shopId: ${product.shopId} → ${currentUserShopId}`);
                
                // Update the product with correct shopId
                db.collection('products').doc(doc.id).update({
                    shopId: currentUserShopId
                }).then(() => {
                    console.log(`✅ Updated product shopId to: ${currentUserShopId}`);
                }).catch(error => {
                    console.error(`❌ Failed to update product shopId:`, error);
                });
            }
            
            console.log('Product found for this shop:', {
                id: product.id,
                name: product.name,
                shopId: product.shopId,
                shopIdMatch: product.shopId === this.shopId,
                status: product.status,
                visible: product.visible
            });
            
            return product;
        });

        console.log('Products loaded:', this.products.length);
        console.log('Product details:', this.products);
        // .filter(product => product.status === 'active' && product.visible === true)
        // .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Client-side sorting

        console.log('📦 Products loaded:', this.products.length);
        console.log('📦 Product details:', this.products);

        // Update UI
        this.updateShopUI();
        this.renderProducts();

        // If specific product requested, show it
        if (this.productId) {
            const product = this.products.find(p => p.id === this.productId);
            if (product) {
                this.showProductDetail(product);
            }
        }
    }

    updateShopUI() {
        // Update shop name and info
        document.getElementById('shop-name').textContent = `${this.currentShop.username}'s Shop`;
        document.getElementById('banner-shop-name').textContent = `Welcome to ${this.currentShop.username}'s Shop`;
        document.getElementById('banner-description').textContent = `Check out amazing products from ${this.currentShop.username}!`;
        document.getElementById('product-count').textContent = this.products.length;

        // Update page title
        document.getElementById('shop-title').textContent = `${this.currentShop.username}'s Shop - Shopping Online`;
        
        // Show/hide admin controls based on ownership
        this.updateControlsVisibility();
    }

    updateControlsVisibility() {
        const userSession = sessionStorage.getItem('userSession');
        if (!userSession) return;
        
        let userData;
        try {
            userData = JSON.parse(userSession);
        } catch(e) { return; }
        if (!userData) return;
        const isOwner = (userData.accountType === 'premium' && this.shopId === userData.userId + '_premium') || // Checks if it's a premium owner
                        (userData.accountType === 'free' && this.shopId === userData.userId); // Checks if it's a free owner
        
        const adminControls = document.getElementById('admin-controls');
        const visitorControls = document.getElementById('visitor-controls');
        
        if (isOwner) {
            const isPremium = userData.accountType === 'premium'; // Reuse existing userData
            
            adminControls.style.display = 'block';
            visitorControls.style.display = 'none';
            
            // Show/hide video upload button based on account type
            const videoUploadBtn = document.querySelector('.video-upload-btn');
            if (videoUploadBtn) {
                if (isPremium) {
                    videoUploadBtn.style.display = 'inline-flex';
                    videoUploadBtn.title = 'Upload product video (Premium Feature)';
                } else {
                    videoUploadBtn.style.display = 'none';
                }
            }
            
            // Show/hide video preview section for free accounts
            const videoPreview = document.getElementById('video-preview');
            if (videoPreview && !isPremium) {
                videoPreview.style.display = 'none';
                // Clear any existing video URL
                const videoUrlInput = document.getElementById('product-video-url');
                if (videoUrlInput) {
                    videoUrlInput.value = '';
                }
            }
        } else {
            adminControls.style.display = 'none';
            visitorControls.style.display = 'block';
        }
    }

    renderProducts() {
        const container = document.getElementById('products-container');
        const emptyState = document.getElementById('empty-products');

        if (this.products.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = this.viewMode === 'grid' ? 'grid' : 'block';
        emptyState.style.display = 'none';

        // Check if user owns this shop for edit/delete buttons
        const userSession = sessionStorage.getItem('userSession');
        const userData = userSession ? JSON.parse(userSession) : null;
        // Apply same strict ownership check to product action buttons
        const isOwner = userData && ((userData.accountType === 'premium' && this.shopId === userData.userId + '_premium') ||
                                     (userData.accountType === 'free' && this.shopId === userData.userId));

        if (this.viewMode === 'grid') {
            this.renderGridView(container, isOwner);
        } else {
            this.renderListView(container, isOwner);
        }
    }

    renderGridView(container, isOwner) {
        container.innerHTML = this.products.map(product => `
            <div class="product-card ${this.selectedProducts.has(product.id) ? 'selected' : ''}" data-product-id="${product.id}">
                ${isOwner ? `
                    <div class="selection-checkbox">
                        <input type="checkbox" ${this.selectedProducts.has(product.id) ? 'checked' : ''} 
                               onchange="shopManager.toggleProductSelection('${product.id}')">
                    </div>
                ` : ''}
                <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onclick="shopManager.showProductDetail('${product.id}')">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">Ksh ${product.price.toFixed(2)}</div>
                    <div class="product-description">${product.description}</div>
                    <div class="product-actions">
                        ${isOwner ? this.renderOwnerActions(product.id) : ''}
                        ${isOwner ? `
                            <button class="btn secondary select-product-btn" onclick="shopManager.toggleProductSelection('${product.id}')">
                                <i class="fas fa-${this.selectedProducts.has(product.id) ? 'check' : 'plus'}"></i> 
                                ${this.selectedProducts.has(product.id) ? 'Selected' : 'Select'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderListView(container, isOwner) {
        container.innerHTML = this.products.map(product => `
            <div class="product-card list-view" data-product-id="${product.id}">
                <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onclick="shopManager.showProductDetail('${product.id}')">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">Ksh ${product.price.toFixed(2)}</div>
                    <div class="product-description">${product.description}</div>
                    ${isOwner ? this.renderOwnerActions(product.id) : ''}
                </div>
            </div>
        `).join('');
    }

    renderOwnerActions(productId) {
        return `
            <div class="owner-actions">
                <button class="action-btn edit-btn" onclick="shopManager.editProduct('${productId}')" title="Edit Product">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="shopManager.deleteProduct('${productId}')" title="Delete Product">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    showProductDetail(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.currentProduct = product;

        // Update modal content
        document.getElementById('detail-product-name').textContent = product.name;
        document.getElementById('detail-product-image').src = product.imageUrl;
        document.getElementById('detail-product-price').textContent = product.price.toFixed(2);
        document.getElementById('detail-product-description').textContent = product.description;
        document.getElementById('detail-shop-name').textContent = this.currentShop.username;
        document.getElementById('detail-shop-phone').textContent = this.currentShop.phone;

        // Update meta tags for sharing
        this.updateProductMetaTags(product);

        // Show modal
        document.getElementById('product-detail-modal').style.display = 'block';

        // Track product view
        this.trackProductView(productId);
    }

    async uploadProductToMyShop() {
        if (!this.currentProduct) {
            this.showNotification('No product selected', 'error');
            return;
        }

        try {
            // Check if user is logged in
            const userSession = sessionStorage.getItem('userSession');
            if (!userSession) {
                this.showNotification('Please login to upload products', 'error');
                return;
            }

            const currentUser = JSON.parse(userSession);

            // Check if user has premium account for video upload
            const isPremium = currentUser.accountType === 'premium';

            // Create new product in user's shop
            const newProduct = {
                name: this.currentProduct.name,
                price: this.currentProduct.price,
                description: this.currentProduct.description,
                imageUrl: this.currentProduct.imageUrl,
                userId: currentUser.userId,
                shopId: isPremium ? currentUser.userId + '_premium' : currentUser.userId,
                accountType: isPremium ? 'premium' : 'free',
                originalProductId: this.currentProduct.id,
                originalShopId: this.currentProduct.userId,
                uploadedAt: new Date().toISOString(),
                status: 'active',
                timestamp: new Date().toISOString()
            };

            // Save to Firestore
            const db = firebase.firestore();
            await db.collection('products').add(newProduct);

            this.showNotification('Product uploaded to your shop successfully!', 'success');
            
            // Close modal
            this.closeProductModal();
            
            // Redirect to user's dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);

        } catch (error) {
            console.error('Error uploading product:', error);
            this.showNotification('Failed to upload product: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateMetaTags() {
        if (!this.currentShop) return;

        const shopUrl = `${window.location.origin}/shop.html?shop=${this.shopId}`;
        
        document.getElementById('og-title').content = `${this.currentShop.username}'s Shop - Shopping Online`;
        document.getElementById('og-description').content = `Check out amazing products from ${this.currentShop.username}'s shop!`;
        document.getElementById('og-url').content = shopUrl;

        if (this.products.length > 0) {
            document.getElementById('og-image').content = this.products[0].imageUrl;
        }
    }

    updateProductMetaTags(product) {
        const productUrl = `${window.location.origin}/shop.html?shop=${this.shopId}&product=${product.id}`;
        
        document.getElementById('og-title').content = `${product.name} - ${this.currentShop.username}'s Shop`;
        document.getElementById('og-description').content = `${product.description} - Only Ksh ${product.price}`;
        document.getElementById('og-url').content = productUrl;
        document.getElementById('og-image').content = product.imageUrl;
    }

    setupEventListeners() {
        // Modal close on background click
        document.getElementById('product-detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-detail-modal') {
                document.getElementById('product-detail-modal').style.display = 'none';
                this.currentProduct = null;
                
                // Reset meta tags to shop level
                this.updateMetaTags();
            }
        });
    }

    setViewMode(mode) {
        this.viewMode = mode;
        
        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            // Update active state based on the 'mode' parameter instead of relying on an event object
            const isCorrectBtn = btn.getAttribute('onclick')?.includes(`'${mode}'`);
            btn.classList.toggle('active', isCorrectBtn);
        });

        // Re-render products
        this.renderProducts();
    }

    closeProductModal() {
        document.getElementById('product-detail-modal').style.display = 'none';
        this.currentProduct = null;
        
        // Reset meta tags to shop level
        this.updateMetaTags();
    }

    async shareProduct() {
        if (!this.currentProduct) return;

        try {
            // Generate share page URL for proper OG previews
            const sharePageUrl = `${window.location.origin}/share.html?shop=${this.shopId}&product=${this.currentProduct.id}`;
            
            // Create Facebook share link pointing to share page
            const url = encodeURIComponent(sharePageUrl);
            const facebookShareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            
            // Open in new tab
            window.open(facebookShareLink, '_blank', 'width=600,height=400');
            
            // Track share
            await this.trackShare(this.currentProduct.id, 'facebook');
            
        } catch (error) {
            console.error('Error sharing to Facebook:', error);
        }
    }

    async trackShare(productId, platform) {
        try {
            if (!this.db) return;
            
            const analyticsRef = this.db.collection('analytics').doc(productId);
            await analyticsRef.set({
                shares: firebase.firestore.FieldValue.increment(1),
                lastShared: new Date().toISOString()
            }, { merge: true });
            
            // Track specific platform
            const platformRef = this.db.collection('analytics').doc(`${productId}_${platform}`);
            await platformRef.set({
                count: firebase.firestore.FieldValue.increment(1),
                lastUsed: new Date().toISOString()
            }, { merge: true });
            
            console.log(`${platform} share tracked for product:`, productId);
            
        } catch (error) {
            console.error('Share tracking failed:', error);
        }
    }

    async trackWhatsAppClick(productId) {
        try {
            if (!this.db) return;
            
            const analyticsRef = this.db.collection('analytics').doc(productId);
            await analyticsRef.set({
                whatsappClicks: firebase.firestore.FieldValue.increment(1),
                lastWhatsAppClick: new Date().toISOString()
            }, { merge: true });
            
            console.log('WhatsApp click tracked for product:', productId);
        } catch (error) {
            console.error('WhatsApp tracking failed:', error);
        }
    }

    async trackShare(productId, platform) {
        const shareRecord = {
            productId: productId,
            platform: platform,
            timestamp: new Date().toISOString(),
            shopId: this.shopId,
            source: 'shop_page'
        };

        await db.collection('shares').add(shareRecord);

        // Notify shop owner
        await this.notifyShopOwnerShare(productId, platform);
    }

    async notifyShopOwnerShare(productId, platform) {
        const notification = {
            type: 'product_share',
            message: `Your product was shared on ${platform}`,
            productId: productId,
            platform: platform,
            timestamp: new Date().toISOString(),
            read: false
        };

        await db.collection('user_notifications').doc(this.shopId).collection('notifications').add(notification);
    }

    orderProduct() {
        if (!this.currentProduct) return;

        try {
            // Track WhatsApp click before opening
            this.trackWhatsAppClick(this.currentProduct.id);
            
            // Generate enhanced WhatsApp message with proper encoding
            const message = `Hello ${this.currentShop.username}!

I'm interested in your product: ${this.currentProduct.name}
Price: Ksh ${this.currentProduct.price}
Description: ${this.currentProduct.description}

I found this on Shopping Online and would like to make an order.

Could you please attend to me as a customer? I'm ready to proceed with payment.

Thank you!`;

            // Clean and format phone number for WhatsApp (Kenya international format)
            let cleanPhone = this.currentShop.phone.replace(/[^0-9]/g, '');
            
            // Ensure proper Kenya international format
            if (cleanPhone.startsWith('0')) {
                // Remove leading 0 and add 254
                cleanPhone = '254' + cleanPhone.substring(1);
            } else if (!cleanPhone.startsWith('254')) {
                // If no country code, add Kenya code
                cleanPhone = '254' + cleanPhone;
            }
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
            
            // Show loading notification
            this.showNotification('Opening WhatsApp...', 'info');
            
            // Add small delay to ensure WhatsApp loads properly
            setTimeout(() => {
                // Open WhatsApp in new window
                const whatsappWindow = window.open(whatsappUrl, '_blank', 'width=800,height=600');
                
                // Fallback: if WhatsApp doesn't load properly, try alternative method
                setTimeout(() => {
                    if (whatsappWindow && whatsappWindow.closed) {
                        // Try opening in same tab
                        window.location.href = whatsappUrl;
                    } else {
                        // Show success message
                        this.showNotification('WhatsApp opened! Message is ready to send - just click Send button.', 'success');
                    }
                }, 2000);
            }, 500);

            // Track order intent
            this.trackOrderIntent(this.currentProduct.id);
            
            // Notify shop owner
            this.notifyShopOwnerOrder(this.currentProduct);

        } catch (error) {
            console.error('Error opening WhatsApp:', error);
            this.showNotification('Failed to open WhatsApp', 'error');
        }
    }

    async trackOrderIntent(productId) {
        const orderRecord = {
            productId: productId,
            timestamp: new Date().toISOString(),
            shopId: this.shopId,
            source: 'shop_page',
            customerFromFacebook: document.referrer.includes('facebook.com')
        };

        await db.collection('order_intents').add(orderRecord);
    }

    async notifyShopOwnerOrder(product) {
        const notification = {
            type: 'new_order_intent',
            message: `Potential customer interested in: ${product.name}`,
            productDetails: product,
            timestamp: new Date().toISOString(),
            read: false,
            customerFromFacebook: document.referrer.includes('facebook.com')
        };

        await db.collection('user_notifications').doc(this.shopId).collection('notifications').add(notification);

        // WhatsApp notification to admin
        const adminMessage = `💹 POTENTIAL TRANSACTION\n\n` +
            `Shop: ${this.currentShop.username}'s Shop\n` +
            `Product: ${product.name}\n` +
            `Price: Ksh ${product.price}\n` +
            `Customer: ${document.referrer.includes('facebook.com') ? 'From Facebook' : 'Direct'}\n` +
            `Time: ${new Date().toLocaleString()}`;

        this.sendWhatsAppNotification('+254707584594', adminMessage);
    }

    sendWhatsAppNotification(phone, message) {
        const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    seeMoreProducts() {
        // Close modal and show all products
        this.closeProductModal();
        
        // Scroll to products section
        document.querySelector('.products-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    exploreOtherShops() {
        window.location.href = 'index.html';
    }

    backToFacebook() {
        window.history.back();
    }

    goToHomepage() {
        window.location.href = 'index.html';
    }

    goToDashboard() {
        // Check if user is logged in and owns this shop
        const userSession = sessionStorage.getItem('userSession');
        if (userSession) {
            const user = JSON.parse(userSession);
            const isOwner = (user.accountType === 'premium' && this.shopId === user.userId + '_premium') ||
                            (user.accountType === 'free' && this.shopId === user.userId);
            
            if (isOwner) {
                // Redirect to the dashboard matching the specific entity the user is logged into
                const dashboardUrl = user.accountType === 'premium' 
                    ? 'premium-dashboard.html' 
                    : 'dashboard.html';
                window.location.href = dashboardUrl;
                return;
            }
        }
        
        // If not owner, go to login
        window.location.href = 'index.html#login';
    }

    trackProductView(productId) {
        // Track product views for analytics
        const viewRecord = {
            productId: productId,
            shopId: this.shopId,
            timestamp: new Date().toISOString(),
            source: 'shop_page'
        };

        db.collection('product_views').add(viewRecord);
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }

        try {
            // Delete from Firestore
            await db.collection('products').doc(productId).delete();

            // Delete image from Storage
            const product = this.products.find(p => p.id === productId);
            if (product && product.imageUrl) {
                const imageRef = storage.refFromURL(product.imageUrl);
                await imageRef.delete();
            }

            // Remove from local array
            this.products = this.products.filter(p => p.id !== productId);

            // Update UI
            this.renderProducts();
            this.updateShopUI();

            // Show success message
            this.showNotification('Product deleted successfully!', 'success');

            // Track deletion
            await this.trackProductDeletion(productId);

            // Notify admin
            await this.notifyAdminProductDeletion(productId);

        } catch (error) {
            console.error('Error deleting product:', error);
            this.showNotification('Failed to delete product. Please try again.', 'error');
        }
    }

    async editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Create edit modal
        const editModal = document.createElement('div');
        editModal.className = 'modal';
        editModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Product</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Product Name</label>
                        <input type="text" id="edit-name" value="${product.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Price (Ksh)</label>
                        <input type="number" id="edit-price" value="${product.price}" min="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="edit-description" rows="3" required>${product.description}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                        <button type="button" class="btn primary" onclick="shopManager.saveProductEdit('${productId}')">Save Changes</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(editModal);
        editModal.style.display = 'block';
    }

    async saveProductEdit(productId) {
        const name = document.getElementById('edit-name').value;
        const price = parseFloat(document.getElementById('edit-price').value);
        const description = document.getElementById('edit-description').value;

        if (!name || !price || !description) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        try {
            // Update in Firestore
            await db.collection('products').doc(productId).update({
                name: name,
                price: price,
                description: description,
                lastUpdated: new Date().toISOString()
            });

            // Update local array
            const productIndex = this.products.findIndex(p => p.id === productId);
            if (productIndex !== -1) {
                this.products[productIndex] = {
                    ...this.products[productIndex],
                    name,
                    price,
                    description
                };
            }

            // Close modal
            document.querySelector('.modal').remove();

            // Refresh display
            this.renderProducts();
            this.showNotification('Product updated successfully!', 'success');

            // Track edit
            await this.trackProductEdit(productId);

        } catch (error) {
            console.error('Error updating product:', error);
            this.showNotification('Failed to update product. Please try again.', 'error');
        }
    }

    async trackProductDeletion(productId) {
        const trackRecord = {
            productId: productId,
            shopId: this.shopId,
            action: 'delete',
            timestamp: new Date().toISOString()
        };

        await db.collection('product_actions').add(trackRecord);
    }

    async trackProductEdit(productId) {
        const trackRecord = {
            productId: productId,
            shopId: this.shopId,
            action: 'edit',
            timestamp: new Date().toISOString()
        };

        await db.collection('product_actions').add(trackRecord);
    }

    async notifyAdminProductDeletion(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const notification = {
            type: 'product_deletion',
            message: `Product deleted by ${this.currentShop.username}`,
            productDetails: product,
            timestamp: new Date().toISOString(),
            read: false
        };

        await db.collection('admin_notifications').add(notification);

        // WhatsApp notification to admin
        const whatsappMessage = `🗑️ PRODUCT DELETED\n\n` +
            `Shop: ${this.currentShop.username}'s Shop\n` +
            `Product: ${product.name}\n` +
            `Price: Ksh ${product.price}\n` +
            `Time: ${new Date().toLocaleString()}`;

        // Send WhatsApp notification
        await this.sendWhatsAppNotification('+254707584594', whatsappMessage);
    }

    // Add Product Function
    addProduct() {
        const addModal = document.createElement('div');
        addModal.className = 'modal';
        addModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Product</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Upload Buttons -->
                    <div class="upload-buttons-container">
                        <h3>📸 Add Product Media</h3>
                        <div class="upload-options">
                            <button class="btn primary camera-btn" title="Take photo with camera">
                                <i class="fas fa-camera"></i>
                                <span>Take Photo</span>
                            </button>
                            <button class="btn success desktop-upload-btn" title="Upload from desktop">
                                <i class="fas fa-desktop"></i>
                                <span>Desktop Upload</span>
                            </button>
                            <button class="btn info phone-storage-btn" title="Upload from phone storage">
                                <i class="fas fa-mobile-alt"></i>
                                <span>Phone Storage</span>
                            </button>
                            <button class="btn secondary video-upload-btn" title="Upload product video">
                                <i class="fas fa-video"></i>
                                <span>Add Video</span>
                            </button>
                        </div>
                        <div id="image-preview" class="image-preview-container"></div>
                        <div id="video-preview" class="video-preview-container" style="display: none;">
                            <video controls style="max-width: 200px; max-height: 150px; border-radius: 8px;">
                                <source src="" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                            <button type="button" class="btn danger remove-video-btn" onclick="shopManager.removeVideo()" style="margin-top: 10px; display: none;">
                                <i class="fas fa-trash"></i> Remove Video
                            </button>
                        </div>
                        <input type="hidden" id="product-image-url" name="productImageUrl">
                        <input type="hidden" id="product-video-url" name="productVideoUrl">
                    </div>
                    
                    <!-- Product Details -->
                    <div class="form-group">
                        <label>Product Name</label>
                        <input type="text" id="add-name" placeholder="Enter product name" required>
                    </div>
                    <div class="form-group">
                        <label>Price (Ksh)</label>
                        <input type="number" id="add-price" placeholder="Enter price" min="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="add-description" rows="3" placeholder="Enter product description" required></textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    <button type="button" class="btn primary" onclick="shopManager.saveNewProduct()">Add Product</button>
                </div>
            </div>
        `;

        document.body.appendChild(addModal);
        addModal.style.display = 'block';
        
        // Initialize upload handler for this modal
        this.initializeUploadHandler();
    }

    async saveNewProduct() {
        const name = document.getElementById('add-name').value;
        const price = parseFloat(document.getElementById('add-price').value);
        const description = document.getElementById('add-description').value;
        const imageUrl = document.getElementById('product-image-url').value;
        const videoUrl = document.getElementById('product-video-url').value;

        if (!name || !price || !description) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        if (!imageUrl && !videoUrl) {
            this.showNotification('Please add at least an image or video', 'error');
            return;
        }

        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                this.showNotification('Please login first', 'error');
                return;
            }

            // Check if user has premium account for video upload
            const userSession = sessionStorage.getItem('userSession');
            if (!userSession) {
                this.showNotification('Session expired. Please login again.', 'error');
                return;
            }
            const userData = JSON.parse(userSession);
            if (!userData) return;
            const isPremium = userData.accountType === 'premium';

            // Validate video upload for premium accounts only
            if (videoUrl && !isPremium) {
                this.showNotification('Video uploads are only available for premium accounts', 'error');
                return;
            }

            const newProduct = {
                name: name,
                price: price,
                description: description,
                imageUrl: imageUrl || 'placeholder.jpg',
                videoUrl: isPremium ? (videoUrl || null) : null, // Only save video for premium accounts
                userId: currentUser.uid,
                shopId: isPremium ? currentUser.uid + '_premium' : currentUser.uid,
                timestamp: new Date().toISOString(),
                status: 'active',
                accountType: isPremium ? 'premium' : 'free',
                views: 0,
                shares: 0,
                orders: 0
            };

            // Save to Firestore
            await db.collection('products').add(newProduct);

            this.showNotification('Product added successfully!', 'success');
            
            // Close modal
            document.querySelector('.modal').remove();
            
            // Refresh products
            await this.loadShopData();

        } catch (error) {
            console.error('Error adding product:', error);
            this.showNotification('Failed to add product', 'error');
        }
    }

    removeVideo() {
        document.getElementById('video-preview').style.display = 'none';
        document.getElementById('product-video-url').value = '';
        document.querySelector('.remove-video-btn').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        const errorHtml = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h3>${message}</h3>
                <p>Please check the shop URL and try again.</p>
                <button class="btn primary" onclick="window.location.href='index.html'">
                    <i class="fas fa-home"></i> Go to Homepage
                </button>
            </div>
        `;

        document.getElementById('loading-overlay').innerHTML = errorHtml;
        document.getElementById('loading-overlay').style.display = 'block';
    }

    // Upload functionality
    initializeUploadHandler() {
        // Setup upload button listeners
        document.querySelector('.camera-btn')?.addEventListener('click', () => this.openCamera());
        document.querySelector('.desktop-upload-btn')?.addEventListener('click', () => this.openDesktopUpload());
        document.querySelector('.phone-storage-btn')?.addEventListener('click', () => this.openPhoneStorage());
        document.querySelector('.browse-products-btn')?.addEventListener('click', () => this.browseProducts());
        document.querySelector('.video-upload-btn')?.addEventListener('click', () => this.openVideoUpload());
    }

    // Camera access for taking photos
    async openCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            // Create camera modal
            const cameraModal = this.createCameraModal(stream);
            document.body.appendChild(cameraModal);
            cameraModal.style.display = 'block';
            
        } catch (error) {
            console.error('Camera access error:', error);
            this.showNotification('Camera access denied or not available', 'error');
            // Fallback to file input
            this.openFileInput('image/*');
        }
    }

    createCameraModal(stream) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Take Photo</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <video id="camera-video" autoplay playsinline style="width: 100%; max-height: 400px;"></video>
                    <canvas id="camera-canvas" style="display: none;"></canvas>
                </div>
                <div class="modal-actions">
                    <button class="btn primary capture-btn">📸 Capture</button>
                    <button class="btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                </div>
            </div>
        `;

        // Setup video stream
        const video = modal.querySelector('#camera-video');
        video.srcObject = stream;

        // Setup capture button
        modal.querySelector('.capture-btn').addEventListener('click', () => {
            this.capturePhoto(stream, modal);
        });

        return modal;
    }

    capturePhoto(stream, modal) {
        const video = modal.querySelector('#camera-video');
        const canvas = modal.querySelector('#camera-canvas');
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        // Stop camera stream
        stream.getTracks().forEach(track => track.stop());

        // Convert to blob
        canvas.toBlob((blob) => {
            this.handleImageCapture(blob);
            modal.remove();
        }, 'image/jpeg', 0.8);
    }

    // Desktop file upload
    async openDesktopUpload() {
        this.openFileInput('image/*,video/*');
    }

    // Phone storage access
    openPhoneStorage() {
        this.openFileInput('image/*,video/*');
    }

    // Browse existing products
    browseProducts() {
        this.openFileInput('image/*,video/*');
    }

    // Video upload specifically
    async openVideoUpload() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.capture = 'environment';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Check file size (max 50MB for videos)
                    if (file.size > 50 * 1024 * 1024) {
                        this.showNotification('Video file is too large. Maximum size is 50MB', 'error');
                        return;
                    }
                    
                    const currentUser = firebase.auth().currentUser;
                    if (!currentUser) {
                        this.showNotification('Please login first', 'error');
                        return;
                    }

                    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
                    const storageRef = firebase.storage().ref();
                    const videoRef = storageRef.child(`users/${currentUser.uid}/videos/${safeFileName}`);
                    const uploadTask = videoRef.put(file);
                    
                    // Show progress
                    this.showUploadProgress('Uploading video...');
                    
                    uploadTask.on('state_changed', (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        this.updateUploadProgress(progress);
                    });
                    
                    uploadTask.then(async (snapshot) => {
                        const videoUrl = await snapshot.ref.getDownloadURL();
                        
                        // Update video preview
                        const videoPreview = document.getElementById('video-preview');
                        const videoElement = videoPreview.querySelector('video');
                        videoElement.src = videoUrl;
                        
                        // Update hidden input
                        document.getElementById('product-video-url').value = videoUrl;
                        
                        // Show remove button
                        document.querySelector('.remove-video-btn').style.display = 'inline-block';
                        
                        // Show video preview
                        videoPreview.style.display = 'block';
                        
                        this.hideUploadProgress();
                        this.showNotification('Video uploaded successfully!', 'success');
                    }).catch(error => {
                        console.error('Video upload error:', error);
                        this.showNotification('Failed to upload video', 'error');
                        this.hideUploadProgress();
                    });
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Video upload error:', error);
            this.showNotification('Video upload failed', 'error');
        }
    }

    openFileInput(accept) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = false;
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelect(file);
            }
        });
        
        input.click();
    }

    handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        this.handleImageCapture(file);
    }

    handleImageCapture(blob) {
        // Create preview
        const previewContainer = document.getElementById('image-preview');
        if (previewContainer) {
            const imageUrl = URL.createObjectURL(blob);
            previewContainer.innerHTML = `
                <div class="image-preview-container">
                    <img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                    <div class="preview-actions">
                        <button class="btn danger remove-image-btn">🗑️ Remove</button>
                        <button class="btn primary use-image-btn">✓ Use This Image</button>
                    </div>
                </div>
            `;
            
            // Setup preview buttons
            previewContainer.querySelector('.remove-image-btn').addEventListener('click', () => {
                this.removeImage();
            });
            
            previewContainer.querySelector('.use-image-btn').addEventListener('click', () => {
                this.uploadImage(blob);
            });
        }
        
        this.showNotification('Image selected successfully!', 'success');
    }

    removeImage() {
        const previewContainer = document.getElementById('image-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        // Clear hidden input
        const hiddenInput = document.getElementById('product-image-url');
        if (hiddenInput) {
            hiddenInput.value = '';
        }
        
        this.showNotification('Image removed', 'info');
    }

    async uploadImage(blob) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const extension = blob.name ? blob.name.split('.').pop() : 'jpg';
            const fileName = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
            
            const storageRef = firebase.storage().ref();
            const imageRef = storageRef.child(`users/${currentUser.uid}/images/${fileName}`);
            
            const snapshot = await imageRef.put(blob);
            const downloadUrl = await snapshot.ref.getDownloadURL();
            
            const hiddenInput = document.getElementById('product-image-url');
            if (hiddenInput) {
                hiddenInput.value = downloadUrl;
            }
            
            this.showNotification('Image uploaded successfully!', 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed: ' + error.message, 'error');
        }
    }

    // Browse products functionality
    browseProducts() {
        // Open product browser modal
        const browserModal = this.createProductBrowserModal();
        document.body.appendChild(browserModal);
        browserModal.style.display = 'block';
        
        // Load products
        this.loadBrowseableProducts();
    }

    createProductBrowserModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3>Browse Products</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="search-bar">
                        <input type="text" id="product-search" placeholder="Search products...">
                        <button class="btn primary search-btn">🔍 Search</button>
                    </div>
                    <div id="browse-products-grid" class="products-grid">
                        <!-- Products will be loaded here -->
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                </div>
            </div>
        `;

        // Setup search
        modal.querySelector('.search-btn').addEventListener('click', () => {
            this.searchProducts(modal.querySelector('#product-search').value);
        });

        return modal;
    }

    async loadBrowseableProducts() {
        try {
            const productsSnapshot = await db.collection('products')
                .where('status', '==', 'active')
                .where('visible', '==', true)
                .limit(50)
                .get();

            const products = productsSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            this.renderBrowseableProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Failed to load products', 'error');
        }
    }

    renderBrowseableProducts(products) {
        const grid = document.getElementById('browse-products-grid');
        if (!grid) return;

        grid.innerHTML = products.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <img src="${product.imageUrl || 'placeholder.jpg'}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="price">Ksh ${product.price}</p>
                    <p class="description">${product.description}</p>
                </div>
                <div class="product-actions">
                    <button class="btn primary upload-product-btn" data-product='${JSON.stringify(product)}'>
                        📤 Upload to My Shop
                    </button>
                </div>
            </div>
        `).join('');

        // Setup upload buttons
        grid.querySelectorAll('.upload-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const product = JSON.parse(e.target.dataset.product);
                this.uploadProductToMyShop(product);
            });
        });
    }

    async uploadProductToMyShop(product) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                this.showNotification('Please login first', 'error');
                return;
            }

            // Create new product in user's shop
            const newProduct = {
                ...product,
                userId: currentUser.uid,
                shopId: this.shopId,
                originalProductId: product.id,
                uploadedAt: new Date().toISOString(),
                status: 'active'
            };

            // Remove original product ID
            delete newProduct.id;

            // Save to Firestore
            await db.collection('products').add(newProduct);

            this.showNotification('Product uploaded to your shop!', 'success');
            
            // Close modal
            document.querySelector('.modal').remove();
            
            // Refresh products
            await this.loadShopData();

        } catch (error) {
            console.error('Error uploading product:', error);
            this.showNotification('Failed to upload product', 'error');
        }
    }

    searchProducts(query) {
        // Implementation for product search
        console.log('Searching for:', query);
        // This would implement search functionality
    }

    // Image Viewer Methods
    showFullImage(imageSrc) {
        const modal = document.getElementById('image-viewer-modal');
        const viewerImage = document.getElementById('viewer-image');
        
        if (modal && viewerImage) {
            viewerImage.src = imageSrc;
            modal.style.display = 'block';
            
            // Reset zoom
            this.currentZoom = 1;
            this.updateImageZoom();
            
            // Setup drag to pan functionality
            this.setupImageDrag();
        }
    }

    zoomIn() {
        this.currentZoom = Math.min(this.currentZoom + 0.25, 5);
        this.updateImageZoom();
    }

    zoomOut() {
        this.currentZoom = Math.max(this.currentZoom - 0.25, 0.5);
        this.updateImageZoom();
    }

    resetZoom() {
        this.currentZoom = 1;
        this.updateImageZoom();
    }

    updateImageZoom() {
        const viewerImage = document.getElementById('viewer-image');
        if (viewerImage) {
            viewerImage.style.transform = `scale(${this.currentZoom})`;
        }
    }

    toggleFullscreen() {
        const modal = document.getElementById('image-viewer-modal');
        const modalContent = modal.querySelector('.modal-content');
        
        if (!document.fullscreenElement) {
            modalContent.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    setupImageDrag() {
        const viewport = document.getElementById('image-viewport');
        const viewerImage = document.getElementById('viewer-image');
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        // Reset drag state
        if (this.imageDragSetup) {
            return;
        }
        this.imageDragSetup = true;

        viewport.addEventListener('mousedown', (e) => {
            if (this.currentZoom <= 1) return;
            
            isDragging = true;
            startX = e.pageX - viewport.offsetLeft;
            startY = e.pageY - viewport.offsetTop;
            scrollLeft = viewport.scrollLeft;
            scrollTop = viewport.scrollTop;
            viewport.style.cursor = 'grabbing';
        });

        viewport.addEventListener('mouseleave', () => {
            isDragging = false;
            viewport.style.cursor = 'grab';
        });

        viewport.addEventListener('mouseup', () => {
            isDragging = false;
            viewport.style.cursor = 'grab';
        });

        viewport.addEventListener('mousemove', (e) => {
            if (!isDragging || this.currentZoom <= 1) return;
            e.preventDefault();
            
            const x = e.pageX - viewport.offsetLeft;
            const y = e.pageY - viewport.offsetTop;
            const walkX = (x - startX) * 2;
            const walkY = (y - startY) * 2;
            
            viewport.scrollLeft = scrollLeft - walkX;
            viewport.scrollTop = scrollTop - walkY;
        });

        // Mouse wheel zoom
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        });

        // Touch events for mobile
        let touchStartDistance = 0;
        let touchStartZoom = 1;

        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                touchStartDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                touchStartZoom = this.currentZoom;
            }
        });

        viewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                
                const scale = currentDistance / touchStartDistance;
                this.currentZoom = Math.max(0.5, Math.min(5, touchStartZoom * scale));
                this.updateImageZoom();
            }
        });
    }
}

// Global functions for HTML onclick handlers
function setViewMode(mode) {
    shopManager.setViewMode(mode);
}

function closeProductModal() {
    shopManager.closeProductModal();
}

function shareProduct() {
    shopManager.shareProduct();
}

function orderProduct() {
    shopManager.orderProduct();
}

function seeMoreProducts() {
    shopManager.seeMoreProducts();
}

function exploreOtherShops() {
    shopManager.exploreOtherShops();
}

function backToFacebook() {
    shopManager.backToFacebook();
}

function goToHomepage() {
    shopManager.goToHomepage();
}

function goToDashboard() {
    shopManager.goToDashboard();
}

// New functions for edit/delete
function editProduct(productId) {
    shopManager.editProduct(productId);
}

function deleteProduct(productId) {
    shopManager.deleteProduct(productId);
}

// Add error styles
const errorStyles = `
    .error-container {
        text-align: center;
        padding: 60px 40px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        max-width: 500px;
        margin: 100px auto;
    }
    
    .error-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }
    
    .error-container h3 {
        color: #dc3545;
        margin-bottom: 15px;
        font-size: 24px;
    }
    
    .error-container p {
        color: #666;
        margin-bottom: 25px;
        font-size: 16px;
    }
`;

const imageViewerStyles = `
    .full-image-modal {
        max-width: 95vw;
        max-height: 95vh;
        width: 90vw;
        height: 90vh;
        margin: 2.5vh auto;
        background: #1a1a1a;
        border-radius: 12px;
        overflow: hidden;
    }
    
    .full-image-modal .modal-header {
        background: #2a2a2a;
        color: white;
        padding: 15px 20px;
        border-bottom: 1px solid #3a3a3a;
    }
    
    .full-image-modal .modal-body {
        padding: 0;
        height: calc(100% - 60px);
        overflow: hidden;
    }
    
    .image-viewer-container {
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    
    .zoom-controls {
        background: #2a2a2a;
        padding: 10px;
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
        border-bottom: 1px solid #3a3a3a;
    }
    
    .zoom-btn {
        background: #3a3a3a;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.3s;
    }
    
    .zoom-btn:hover {
        background: #4a4a4a;
    }
    
    .image-viewport {
        flex: 1;
        overflow: auto;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
        cursor: grab;
    }
    
    .image-viewport:active {
        cursor: grabbing;
    }
    
    #viewer-image {
        max-width: none;
        max-height: none;
        width: auto;
        height: auto;
        transform-origin: center;
        transition: transform 0.2s ease;
        user-select: none;
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
    }
    
    .product-gallery img {
        cursor: pointer;
        transition: transform 0.2s;
    }
    
    .product-gallery img:hover {
        transform: scale(1.02);
    }
    
    @media (max-width: 768px) {
        .full-image-modal {
            width: 100vw;
            height: 100vh;
            max-width: 100vw;
            max-height: 100vh;
            margin: 0;
            border-radius: 0;
        }
        
        .zoom-controls {
            padding: 8px;
            gap: 5px;
        }
        
        .zoom-btn {
            padding: 6px 10px;
            font-size: 11px;
        }
    }
`;

// Create and append styles
const errorStyleSheet = document.createElement('style');
errorStyleSheet.textContent = errorStyles;
document.head.appendChild(errorStyleSheet);

const imageViewerStyleSheet = document.createElement('style');
imageViewerStyleSheet.textContent = imageViewerStyles;
document.head.appendChild(imageViewerStyleSheet);

// Facebook Sharing Methods
ShopManager.prototype.shareToFacebook = function() {
    if (this.selectedProducts.size === 0) {
        this.showNotification('Please select at least one product to share', 'warning');
        return;
    }

    // Check if user has premium account for video sharing
    const userSession = sessionStorage.getItem('userSession');
    const userData = JSON.parse(userSession);
    const isPremium = userData.accountType === 'premium';

    const selectedProductsArray = Array.from(this.selectedProducts);
    const productsData = selectedProductsArray.map(productId => {
        const product = this.products.find(p => p.id === productId);
        return {
            ...product,
            hasVideo: product.videoUrl && product.videoUrl.trim() !== '' && isPremium // Only include videos for premium accounts
        };
    });

    // Check if any selected products have videos (only for premium accounts)
    const hasVideos = productsData.some(p => p.hasVideo);
    
    if (hasVideos && isPremium) {
        // Ask permission to include videos
        const includeVideos = confirm(
            'Some selected products have videos. Would you like to include the videos in your Facebook post?\n\n' +
            'Videos will be posted along with product images and will be playable on Facebook.'
        );
        
        if (!includeVideos) {
            // Filter out products with videos
            const productsWithoutVideos = productsData.filter(p => !p.hasVideo);
            this.openFacebookSharePage(productsWithoutVideos);
            return;
        }
    }

    // Open Facebook share page with selected products
    this.openFacebookSharePage(productsData);
}

ShopManager.prototype.openFacebookSharePage = function(productsData) {
    const shopId = encodeURIComponent(this.shopId);
    const shopName = encodeURIComponent(this.currentShop.username);
    const productsJson = encodeURIComponent(JSON.stringify(productsData));
    
    const shareUrl = `facebook-share.html?shop=${shopId}&shopName=${shopName}&products=${productsJson}`;
    
    console.log('📱 Opening Facebook share page:', shareUrl);
    window.open(shareUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
};

ShopManager.prototype.toggleProductSelection = function(productId) {
    if (this.selectedProducts.has(productId)) {
        this.selectedProducts.delete(productId);
    } else {
        this.selectedProducts.add(productId);
    }
    
    // Update UI to reflect selection
    this.updateProductSelectionUI();
};

ShopManager.prototype.updateProductSelectionUI = function() {
    // Update product cards to show selection state
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const productId = card.dataset.productId;
        const selectBtn = card.querySelector('.select-product-btn');
        
        if (this.selectedProducts.has(productId)) {
            card.classList.add('selected');
            if (selectBtn) {
                selectBtn.innerHTML = '<i class="fas fa-check"></i> Selected';
                selectBtn.classList.add('selected');
            }
        } else {
            card.classList.remove('selected');
            if (selectBtn) {
                selectBtn.innerHTML = '<i class="fas fa-plus"></i> Select';
                selectBtn.classList.remove('selected');
            }
        }
    });
    
    // Update share button state
    this.updateShareButtonState();
};

ShopManager.prototype.updateShareButtonState = function() {
    const shareBtn = document.querySelector('.share-facebook-btn');
    if (shareBtn) {
        const count = this.selectedProducts.size;
        shareBtn.innerHTML = `<i class="fab fa-facebook"></i> Share to Facebook (${count})`;
        shareBtn.disabled = count === 0;
    }
};

ShopManager.prototype.clearSelection = function() {
    this.selectedProducts.clear();
    this.updateProductSelectionUI();
    this.showNotification('Selection cleared', 'info');
};

ShopManager.prototype.selectAllProducts = function() {
    this.products.forEach(product => {
        this.selectedProducts.add(product.id);
    });
    this.updateProductSelectionUI();
    this.showNotification(`Selected all ${this.products.length} products`, 'success');
};

// Handle Facebook referral clicks
ShopManager.prototype.handleFacebookReferral = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromFacebook = urlParams.get('fbclid') || document.referrer.includes('facebook.com');
    
    if (fromFacebook) {
        // Add Facebook-specific UI elements
        this.addFacebookReferralUI();
        
        // Track Facebook referral
        this.trackFacebookReferral();
    }
};

ShopManager.prototype.addFacebookReferralUI = function() {
    // Add Facebook-specific buttons to product detail
    const productDetail = document.querySelector('.product-detail');
    if (productDetail) {
        const facebookActions = document.createElement('div');
        facebookActions.className = 'facebook-actions';
        facebookActions.innerHTML = `
            <div class="facebook-referral-banner">
                <i class="fab fa-facebook"></i> Welcome from Facebook!
            </div>
            <div class="action-buttons">
                <button class="btn primary make-order-btn" onclick="shopManager.makeOrder()">
                    <i class="fab fa-whatsapp"></i> Make Order
                </button>
                <button class="btn secondary explore-btn" onclick="shopManager.exploreShop()">
                    <i class="fas fa-store"></i> Explore Shop
                </button>
                <button class="btn info home-btn" onclick="shopManager.goToHomepage()">
                    <i class="fas fa-home"></i> Home
                </button>
                <button class="btn secondary back-to-fb-btn" onclick="shopManager.backToFacebook()">
                    <i class="fab fa-facebook"></i> Back to Facebook
                </button>
            </div>
        `;
        
        productDetail.appendChild(facebookActions);
    }
};

ShopManager.prototype.makeOrder = function() {
    if (!this.currentProduct) {
        this.showNotification('No product selected', 'error');
        return;
    }

    const product = this.currentProduct;
    const shopName = this.currentShop.username || this.currentShop.shopName;
    const phoneNumber = this.currentShop.phone || this.currentShop.contact;
    
    const whatsappMessage = encodeURIComponent(
        `Hello ${shopName}!\n\n` +
        `I'm interested in your product: ${product.name}\n` +
        `Price: Ksh ${product.price}\n\n` +
        `I'd like to know more about this product and confirm the honest price.\n\n` +
        `Thank you!`
    );

    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Track potential transaction
    this.trackPotentialTransaction();
};

ShopManager.prototype.exploreShop = function() {
    // Scroll to products section
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
};

ShopManager.prototype.backToFacebook = function() {
    // Try to go back to Facebook
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Fallback: open Facebook
        window.open('https://facebook.com', '_blank');
    }
};

ShopManager.prototype.trackPotentialTransaction = async function() {
    try {
        const transaction = {
            shopId: this.shopId,
            shopName: this.currentShop.username || this.currentShop.shopName,
            productId: this.currentProduct.id,
            productName: this.currentProduct.name,
            productPrice: this.currentProduct.price,
            customerFromFacebook: document.referrer.includes('facebook.com'),
            timestamp: new Date().toISOString(),
            type: 'potential_order'
        };

        // Add to transactions collection for admin tracking
        await db.collection('transactions').add(transaction);
        
        // Add to admin inbox
        const adminMessage = {
            type: 'potential_transaction',
            shopName: this.currentShop.username || this.currentShop.shopName,
            productName: this.currentProduct.name,
            productPrice: this.currentProduct.price,
            customerFromFacebook: document.referrer.includes('facebook.com'),
            timestamp: new Date(),
            status: 'pending',
            userId: this.shopId
        };

        await db.collection('admin_inbox').add(adminMessage);
        
        console.log('✅ Potential transaction tracked for admin');
        
    } catch (error) {
        console.error('Error tracking transaction:', error);
    }
};

ShopManager.prototype.trackFacebookReferral = async function() {
    try {
        const referral = {
            shopId: this.shopId,
            timestamp: new Date().toISOString(),
            source: 'facebook',
            userAgent: navigator.userAgent,
            referrer: document.referrer
        };

        await db.collection('social_referrals').add(referral);
        
    } catch (error) {
        console.error('Error tracking referral:', error);
    }
};
