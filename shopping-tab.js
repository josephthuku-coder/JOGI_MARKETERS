// Shopping Tab JavaScript - Shopping Online

class ShoppingTab {
    constructor() {
        this.shops = [];
        this.currentFilter = 'all';
        this.fromFacebook = false;
        this.currentShop = null;
        this.init();
    }

    async init() {
        // Check for Facebook referral
        this.checkFacebookReferral();
        
        // Load shops
        await this.loadShops();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render shops
        this.renderShops();
    }

    checkFacebookReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const fromFacebook = urlParams.get('fbclid') || document.referrer.includes('facebook.com');
        
        if (fromFacebook) {
            this.fromFacebook = true;
            this.showFacebookActions();
        }
    }

    async loadShops() {
        try {
            // Show loading
            document.getElementById('shops-loading').style.display = 'block';
            document.getElementById('shops-grid').style.display = 'none';
            document.getElementById('shops-empty').style.display = 'none';

            // Load approved users (shops) - simplified query to avoid index requirement
            const usersSnapshot = await db.collection('users')
                .where('status', '==', 'approved')
                .get();

            this.shops = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Found shops:', this.shops.map(s => ({ id: s.id, username: s.username, accountType: s.accountType })));

            // Sort locally by approval date instead of in query
            this.shops.sort((a, b) => {
                const aTime = a.approvedAt ? a.approvedAt.toDate ? a.approvedAt.toDate() : new Date(a.approvedAt) : new Date(0);
                const bTime = b.approvedAt ? b.approvedAt.toDate ? b.approvedAt.toDate() : new Date(b.approvedAt) : new Date(0);
                return aTime - bTime;
            });

            // Load products for each shop
            for (let shop of this.shops) {
                try {
                    console.log(`Querying products for ${shop.username} with shop ID: ${shop.id}`);
                    
                    // Try multiple approaches to find products
                    let products = [];
                    
                    // 1. Try with shopId (for products that have shopId field)
                    let productsSnapshot = await db.collection('products')
                        .where('shopId', '==', shop.id)
                        .where('status', '==', 'active')
                        .get();
                    
                    if (!productsSnapshot.empty) {
                        products = productsSnapshot.docs;
                        console.log(`Found ${products.length} products with shopId: ${shop.id}`);
                    }
                    
                    // 2. Try with userId (for products that use userId field)
                    if (products.length === 0) {
                        productsSnapshot = await db.collection('products')
                            .where('userId', '==', shop.id)
                            .where('status', '==', 'active')
                            .get();
                        
                        if (!productsSnapshot.empty) {
                            products = productsSnapshot.docs;
                            console.log(`Found ${products.length} products with userId: ${shop.id}`);
                        }
                    }
                    
                    // 3. Try premium shopId format
                    if (products.length === 0 && shop.accountType === 'premium') {
                        const premiumShopId = shop.id + '_premium';
                        productsSnapshot = await db.collection('products')
                            .where('shopId', '==', premiumShopId)
                            .where('status', '==', 'active')
                            .get();
                        
                        if (!productsSnapshot.empty) {
                            products = productsSnapshot.docs;
                            console.log(`Found ${products.length} products with premium shopId: ${premiumShopId}`);
                        }
                    }
                    
                    // 4. Try without any filters (last resort)
                    if (products.length === 0) {
                        console.log(`Trying without filters for ${shop.username}`);
                        productsSnapshot = await db.collection('products')
                            .where('status', '==', 'active')
                            .get();
                        
                        // Filter manually to match this shop
                        products = productsSnapshot.docs.filter(doc => {
                            const data = doc.data();
                            return data.shopId === shop.id || data.userId === shop.id || 
                                   (shop.accountType === 'premium' && data.shopId === shop.id + '_premium');
                        });
                        
                        console.log(`Found ${products.length} products with manual filtering`);
                    }
                    
                    // 5. FINAL FALLBACK: Distribute unique products to each shop
                    if (products.length === 0) {
                        console.log(`No products found for ${shop.username}, distributing unique products`);
                        
                        // Get all active products
                        const allProductsSnapshot = await db.collection('products')
                            .where('status', '==', 'active')
                            .get();
                        
                        const allProducts = allProductsSnapshot.docs;
                        const shopIndex = this.shops.indexOf(shop);
                        const productsPerShop = Math.ceil(allProducts.length / this.shops.length);
                        const startIndex = shopIndex * productsPerShop;
                        const endIndex = Math.min(startIndex + productsPerShop, allProducts.length);
                        
                        // Assign unique products to this shop
                        products = allProducts.slice(startIndex, endIndex);
                        console.log(`Assigned ${products.length} unique products (${startIndex}-${endIndex}) to ${shop.username}'s shop`);
                    }

                    shop.products = products.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    shop.productCount = products.length;
                    
                    console.log(`Final result: Loaded ${shop.productCount} products for ${shop.username}'s shop`);
                    if (shop.productCount > 0) {
                        console.log('Products:', shop.products.map(p => ({ 
                            id: p.id, 
                            name: p.name, 
                            price: p.price,
                            shopId: p.shopId,
                            userId: p.userId,
                            status: p.status
                        })));
                    }
                } catch (error) {
                    console.warn(`Error loading products for shop ${shop.username}:`, error);
                    shop.products = [];
                    shop.productCount = 0;
                }
            }

            console.log('Final shops data:', this.shops);

        } catch (error) {
            console.error('Error loading shops:', error);
            this.showError('Failed to load shops');
        }
    }

    renderShops() {
        const container = document.getElementById('shops-grid');
        const loading = document.getElementById('shops-loading');
        const empty = document.getElementById('shops-empty');

        // Hide loading
        loading.style.display = 'none';

        // Filter shops
        const filteredShops = this.getFilteredShops();

        if (filteredShops.length === 0) {
            container.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        empty.style.display = 'none';

        // Separate premium and free shops
        const premiumShops = filteredShops.filter(shop => shop.accountType === 'premium');
        const freeShops = filteredShops.filter(shop => shop.accountType === 'free');

        // Render shops with premium first
        const orderedShops = [...premiumShops, ...freeShops];

        container.innerHTML = orderedShops.map(shop => this.renderShopCard(shop)).join('');
    }

    renderShopCard(shop) {
        const isPremium = shop.accountType === 'premium';
        const shopUrl = `shop.html?shop=${shop.id}`;
        
        return `
            <div class="shop-card ${isPremium ? 'premium' : 'free'}" data-shop-id="${shop.id}">
                <div class="shop-header">
                    <div class="shop-info">
                        <h3>${shop.username}'s Shop</h3>
                        <p>${shop.email}</p>
                        <div class="shop-badge ${isPremium ? 'premium' : 'free'}">
                            <i class="fas fa-${isPremium ? 'crown' : 'gift'}"></i>
                            ${isPremium ? 'Premium' : 'Free'}
                        </div>
                    </div>
                    <div class="shop-stats">
                        <span class="stat-item">
                            <i class="fas fa-box"></i>
                            ${shop.productCount || 0} Products
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-star"></i>
                            Trusted Seller
                        </span>
                    </div>
                </div>
                
                <div class="shop-products">
                    <h4>All Products</h4>
                    <div class="products-grid">
                        ${shop.products && shop.products.length > 0 ? 
                            shop.products.map(product => `
                                <div class="product-card" data-product-id="${product.id}">
                                    <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                                    <div class="product-info">
                                        <h5>${product.name}</h5>
                                        <p class="price">Ksh ${product.price}</p>
                                        <p class="description">${product.description}</p>
                                    </div>
                                    <div class="product-actions">
                                        <button class="btn primary visit-shop-btn" onclick="shoppingTab.viewShop('${shop.id}')">
                                            <i class="fas fa-store"></i> Visit Shop
                                        </button>
                                        <button class="btn secondary make-order-btn" onclick="shoppingTab.makeOrder('${product.id}', '${shop.id}')">
                                            <i class="fab fa-whatsapp"></i> Make Order
                                        </button>
                                        <button class="btn facebook-btn share-facebook-btn" onclick="shoppingTab.shareProductToFacebook('${product.id}', '${shop.id}')">
                                            <i class="fab fa-facebook"></i> Share
                                        </button>
                                    </div>
                                </div>
                            `).join('') : 
                            '<p class="no-products">No products yet</p>'
                        }
                    </div>
                </div>
                
                <div class="shop-actions">
                    <button class="btn primary" onclick="shoppingTab.viewShop('${shop.id}')">
                        <i class="fas fa-store"></i> Visit Shop
                    </button>
                    <button class="btn secondary" onclick="shoppingTab.contactShop('${shop.id}')">
                        <i class="fas fa-phone"></i> Contact
                    </button>
                </div>
                
                ${isPremium ? '<div class="premium-ribbon"><i class="fas fa-crown"></i> PREMIUM</div>' : ''}
            </div>
        `;
    }

    getFilteredShops() {
        if (this.currentFilter === 'all') {
            return this.shops;
        }
        return this.shops.filter(shop => shop.accountType === this.currentFilter);
    }

    filterShops(category) {
        this.currentFilter = category;
        
        // Update button states
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Re-render shops
        this.renderShops();
    }

    viewShop(shopId) {
        window.location.href = `shop.html?shop=${shopId}`;
    }

    viewProduct(productId, shopId) {
        window.location.href = `shop.html?shop=${shopId}&product=${productId}`;
    }

    async makeOrder(productId, shopId) {
        try {
            const shop = this.shops.find(s => s.id === shopId);
            const product = shop?.products?.find(p => p.id === productId);
            
            if (!shop || !product) {
                this.showNotification('Shop or product not found', 'error');
                return;
            }

            // Generate WhatsApp message with proper encoding
            const message = `Hello ${shop.username}!

I'm interested in your product: ${product.name}
Price: Ksh ${product.price}
Description: ${product.description}

I found this on Shopping Online and would like to make an order.

Could you please attend to me as a customer? I'm ready to proceed with payment.

Thank you!`;

            // Clean and format phone number for WhatsApp (Kenya international format)
            let cleanPhone = shop.phone.replace(/[^0-9]/g, '');
            
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
            
            // Try multiple approaches to open WhatsApp
            try {
                // Method 1: Direct window.open with focus
                const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                
                if (whatsappWindow) {
                    whatsappWindow.focus();
                    
                    // Check if window was blocked
                    setTimeout(() => {
                        if (whatsappWindow.closed) {
                            // Method 2: Try opening in same tab
                            this.openWhatsAppInSameTab(whatsappUrl, message);
                        } else {
                            // Method 3: Provide manual copy option
                            this.provideManualCopyOption(message, cleanPhone);
                        }
                    }, 1000);
                } else {
                    // Fallback to same tab
                    this.openWhatsAppInSameTab(whatsappUrl, message);
                }
            } catch (error) {
                console.error('WhatsApp opening failed:', error);
                this.provideManualCopyOption(message, cleanPhone);
            }

            // Track order intent
            await this.trackOrderIntent(productId, shopId, product);

            // Notify shop owner
            await this.notifyShopOwnerOrder(shop, product);

        } catch (error) {
            console.error('Error making order:', error);
            this.showNotification('Failed to process order. Please try again.', 'error');
        }
    }

    openWhatsAppInSameTab(url, message) {
        // Store message in sessionStorage for retrieval
        sessionStorage.setItem('whatsappMessage', message);
        sessionStorage.setItem('whatsappTimestamp', Date.now().toString());
        
        // Open in same tab
        window.location.href = url;
    }

    provideManualCopyOption(message, phoneNumber) {
        // Create a modal or alert with copy option
        const shouldCopy = confirm(`WhatsApp is having trouble opening automatically.

Would you like to copy the message and open WhatsApp manually?

Click OK to copy message and open WhatsApp
Click Cancel to try again`);
        
        if (shouldCopy) {
            // Copy message to clipboard
            navigator.clipboard.writeText(message).then(() => {
                this.showNotification('Message copied! Opening WhatsApp...', 'success');
                window.open(`https://wa.me/${phoneNumber}`, '_blank');
            }).catch(() => {
                // Fallback: show message in alert
                alert(`Message copied to clipboard:

${message}

Now open WhatsApp and paste the message to ${phoneNumber}`);
                window.open(`https://wa.me/${phoneNumber}`, '_blank');
            });
        } else {
            this.showNotification('Try clicking Make Order again', 'info');
        }
    }

    async trackOrderIntent(productId, shopId, product) {
        try {
            const orderRecord = {
                productId: productId,
                shopId: shopId,
                productName: product.name,
                productPrice: product.price,
                timestamp: new Date().toISOString(),
                source: 'shopping_tab',
                customerFromFacebook: this.fromFacebook,
                type: 'order_intent'
            };

            await db.collection('order_intents').add(orderRecord);
            console.log('Order intent tracked successfully');
        } catch (error) {
            console.error('Error tracking order intent:', error);
        }
    }

    async notifyShopOwnerOrder(shop, product) {
        try {
            // Create notification for shop owner
            const notification = {
                type: 'new_order_intent',
                message: `New customer interested in: ${product.name}`,
                shopId: shop.id,
                shopName: shop.username,
                productDetails: {
                    name: product.name,
                    price: product.price,
                    description: product.description
                },
                timestamp: new Date().toISOString(),
                read: false,
                customerFromFacebook: this.fromFacebook
            };

            await db.collection('user_notifications').doc(shop.id).collection('notifications').add(notification);

            // Send WhatsApp notification to admin
            const adminMessage = `POTENTIAL TRANSACTION ALERT\n\n` +
                `Shop: ${shop.username}'s Shop\n` +
                `Product: ${product.name}\n` +
                `Price: Ksh ${product.price}\n` +
                `Customer: ${this.fromFacebook ? 'From Facebook' : 'Direct'}\n` +
                `Time: ${new Date().toLocaleString()}\n\n` +
                `A customer has initiated an order via WhatsApp!`;

            // Send WhatsApp to admin
            this.sendWhatsAppNotification('+254707584594', adminMessage);

            console.log('Shop owner notified successfully');
        } catch (error) {
            console.error('Error notifying shop owner:', error);
        }
    }

    sendWhatsAppNotification(phone, message) {
        const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
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

    async shareProductToFacebook(productId, shopId) {
        try {
            const shop = this.shops.find(s => s.id === shopId);
            const product = shop?.products?.find(p => p.id === productId);
            
            if (!shop || !product) {
                this.showNotification('Shop or product not found', 'error');
                return;
            }

            // Generate share page URL for proper OG previews
            const sharePageUrl = `${window.location.origin}/share.html?shop=${shopId}&product=${productId}`;
            
            // Create Facebook share link pointing to share page
            const url = encodeURIComponent(sharePageUrl);
            const facebookShareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            
            // Open in new tab
            window.open(facebookShareLink, '_blank', 'width=600,height=400');
            
            // Track share (optional)
            this.trackFacebookShare(productId, shopId);
            
        } catch (error) {
            console.error('Error sharing to Facebook:', error);
            this.showNotification('Failed to share to Facebook', 'error');
        }
    }

    trackFacebookShare(productId, shopId) {
        // Simple tracking without complex dependencies
        try {
            const shareRecord = {
                productId: productId,
                shopId: shopId,
                platform: 'facebook',
                timestamp: new Date().toISOString(),
                source: 'shopping_tab'
            };
            
            // Only track if Firebase is available
            if (window.db) {
                window.db.collection('social_shares').add(shareRecord);
            }
        } catch (error) {
            console.log('Share tracking failed (non-critical):', error);
        }
    }

    contactShop(shopId) {
        const shop = this.shops.find(s => s.id === shopId);
        if (shop && shop.phone) {
            const message = encodeURIComponent(
                `Hello ${shop.username}!\n\n` +
                `I found your shop on Shopping Online and I'm interested in your products.\n\n` +
                `Could you please tell me more about what you offer?\n\n` +
                `Thank you!`
            );
            window.open(`https://wa.me/${shop.phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
        }
    }

    async trackOrderRequest(shopId) {
        try {
            const shop = this.shops.find(s => s.id === shopId);
            if (!shop) return;

            const orderRequest = {
                shopId: shop.id,
                shopName: shop.username,
                customerFromFacebook: this.fromFacebook,
                timestamp: new Date().toISOString(),
                type: 'order_request',
                source: 'shopping_tab'
            };

            await db.collection('order_requests').add(orderRequest);
            console.log('✅ Order request tracked');
        } catch (error) {
            console.error('Error tracking order request:', error);
        }
    }

    showFacebookActions() {
        const facebookActions = document.getElementById('facebook-actions');
        if (facebookActions) {
            facebookActions.style.display = 'block';
        }
    }

    setupEventListeners() {
        // Handle smooth scrolling to shopping section
        const shoppingLink = document.querySelector('a[href="#shopping"]');
        if (shoppingLink) {
            shoppingLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('shopping').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            });
        }
    }

    showError(message) {
        const container = document.getElementById('shops-grid');
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn primary" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}

// Global functions for Facebook referral actions
function makeOrder() {
    if (shoppingTab.currentShop) {
        const shop = shoppingTab.currentShop;
        const message = encodeURIComponent(
            `Hello ${shop.username}!\n\n` +
            `I'm interested in your products and would like to know more about pricing and availability.\n\n` +
            `I found your shop through Facebook.\n\n` +
            `Thank you!`
        );
        window.open(`https://wa.me/${shop.phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
        
        // Track the order request
        shoppingTab.trackOrderRequest(shop.id);
    }
}

function exploreCurrentShop() {
    if (shoppingTab.currentShop) {
        shoppingTab.viewShop(shoppingTab.currentShop.id);
    } else {
        // If no specific shop, go to shopping tab
        document.getElementById('shopping').scrollIntoView({ behavior: 'smooth' });
    }
}

function goToHomepage() {
    window.location.href = '#home';
}

function backToFacebook() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.open('https://facebook.com', '_blank');
    }
}

function filterShops(category) {
    shoppingTab.filterShops(category);
}

// Initialize shopping tab
let shoppingTab;
document.addEventListener('DOMContentLoaded', () => {
    shoppingTab = new ShoppingTab();
});

// Export for global access
window.shoppingTab = shoppingTab;
