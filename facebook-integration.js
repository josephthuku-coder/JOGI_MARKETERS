// Facebook Integration - Shopping Online
class FacebookIntegration {
    constructor() {
        this.appId = 'YOUR_FACEBOOK_APP_ID'; // Replace with actual Facebook App ID
        this.accessToken = null;
        this.userProfile = null;
        this.businessPages = [];
        this.isPremium = false;
        this.init();
    }

    async init() {
        console.log('Initializing Facebook Integration...');
        
        // Check if user is logged in and get account type
        await this.checkUserAccount();
        
        // Initialize Facebook SDK
        await this.initializeFacebookSDK();
        
        // Setup Facebook login
        this.setupFacebookLogin();
        
        console.log('Facebook Integration initialized');
    }

    async checkUserAccount() {
        try {
            // Check if user is logged in
            if (window.auth && window.auth.currentUser) {
                const userDoc = await window.db.collection('users')
                    .doc(window.auth.currentUser.uid)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    this.isPremium = userData.accountType === 'premium';
                    console.log(`User account type: ${this.isPremium ? 'Premium' : 'Free'}`);
                }
            }
        } catch (error) {
            console.error('Error checking user account:', error);
        }
    }

    async initializeFacebookSDK() {
        return new Promise((resolve) => {
            // Load Facebook SDK
            (function(d, s, id) {
                let js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = 'https://connect.facebook.net/en_US/sdk.js';
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));

            // Initialize SDK when loaded
            window.fbAsyncInit = () => {
                FB.init({
                    appId: this.appId,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
                resolve();
            };
        });
    }

    setupFacebookLogin() {
        // Add Facebook login button to UI
        this.addFacebookLoginButton();
    }

    addFacebookLoginButton() {
        const existingButton = document.getElementById('facebook-login-btn');
        if (existingButton) return;

        const loginButton = document.createElement('button');
        loginButton.id = 'facebook-login-btn';
        loginButton.className = 'btn facebook-btn';
        loginButton.innerHTML = '<i class="fab fa-facebook"></i> Connect Facebook';
        loginButton.onclick = () => this.loginWithFacebook();

        // Add to appropriate location based on current page
        if (document.querySelector('.social-platforms')) {
            document.querySelector('.social-platforms').appendChild(loginButton);
        }
    }

    async loginWithFacebook() {
        return new Promise((resolve, reject) => {
            FB.login((response) => {
                if (response.authResponse) {
                    this.accessToken = response.authResponse.accessToken;
                    console.log('Facebook login successful');
                    this.loadFacebookProfile();
                    this.updateLoginButton();
                    resolve(response);
                } else {
                    console.error('Facebook login failed');
                    reject(new Error('Facebook login failed'));
                }
            }, { scope: this.getRequiredPermissions() });
        });
    }

    getRequiredPermissions() {
        let permissions = 'email,public_profile';
        
        if (this.isPremium) {
            permissions += ',pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish';
        } else {
            permissions += ',user_posts';
        }
        
        return permissions;
    }

    async loadFacebookProfile() {
        try {
            const response = await FB.api('/me', { fields: 'name,email,id' });
            this.userProfile = response;
            console.log('Facebook profile loaded:', response);

            if (this.isPremium) {
                await this.loadBusinessPages();
            }

            this.showNotification('Facebook connected successfully!', 'success');
        } catch (error) {
            console.error('Error loading Facebook profile:', error);
        }
    }

    async loadBusinessPages() {
        try {
            const response = await FB.api('/me/accounts', { fields: 'name,id,access_token' });
            this.businessPages = response.data;
            console.log('Business pages loaded:', this.businessPages);
        } catch (error) {
            console.error('Error loading business pages:', error);
        }
    }

    updateLoginButton() {
        const button = document.getElementById('facebook-login-btn');
        if (button && this.userProfile) {
            button.innerHTML = `<i class="fab fa-facebook"></i> Connected as ${this.userProfile.name}`;
            button.disabled = true;
            button.className += ' connected';
        }
    }

    // FREE ACCOUNT METHODS
    async shareProductToPersonalFacebook(product) {
        if (!this.accessToken) {
            await this.loginWithFacebook();
        }

        try {
            const shareData = {
                method: 'share',
                href: `${window.location.origin}/shop.html?shop=${product.shopId}&product=${product.id}`,
                quote: `Check out this amazing product: ${product.name}\nPrice: Ksh ${product.price}\n\nAvailable on Shopping Online!`
            };

            const response = await new Promise((resolve) => {
                FB.ui(shareData, resolve);
            });

            if (response && !response.error_code) {
                this.showNotification('Product shared to Facebook!', 'success');
                this.trackShare('facebook', 'personal', product.id);
                return true;
            } else {
                throw new Error('Share cancelled or failed');
            }
        } catch (error) {
            console.error('Error sharing to Facebook:', error);
            this.showNotification('Failed to share to Facebook', 'error');
            return false;
        }
    }

    async shareShopToPersonalFacebook(shop) {
        if (!this.accessToken) {
            await this.loginWithFacebook();
        }

        try {
            const shareData = {
                method: 'share',
                href: `${window.location.origin}/shop.html?shop=${shop.id}`,
                quote: `Check out ${shop.username}'s shop on Shopping Online!\n\nAmazing products at great prices!`
            };

            const response = await new Promise((resolve) => {
                FB.ui(shareData, resolve);
            });

            if (response && !response.error_code) {
                this.showNotification('Shop shared to Facebook!', 'success');
                this.trackShare('facebook', 'shop', shop.id);
                return true;
            }
        } catch (error) {
            console.error('Error sharing shop to Facebook:', error);
            this.showNotification('Failed to share shop to Facebook', 'error');
        }
    }

    // PREMIUM ACCOUNT METHODS
    async shareProductToBusinessPage(product, pageId = null) {
        if (!this.isPremium) {
            this.showNotification('Business page sharing requires premium account', 'warning');
            return false;
        }

        if (!pageId && this.businessPages.length > 0) {
            // Show page selection modal
            pageId = await this.selectBusinessPage();
        }

        if (!pageId) {
            return false;
        }

        try {
            const page = this.businessPages.find(p => p.id === pageId);
            const pageAccessToken = page.access_token;

            const postData = {
                message: `NEW PRODUCT ALERT! ${product.name}\n\nPrice: Ksh ${product.price}\n${product.description}\n\nOrder now: ${window.location.origin}/shop.html?shop=${product.shopId}&product=${product.id}\n\n#ShoppingOnline #Kenya #ShopOnline`,
                link: `${window.location.origin}/shop.html?shop=${product.shopId}&product=${product.id}`,
                picture: product.imageUrl
            };

            const response = await FB.api(`/${pageId}/feed`, 'POST', {
                ...postData,
                access_token: pageAccessToken
            });

            if (response.id) {
                this.showNotification('Product posted to business page!', 'success');
                this.trackShare('facebook', 'business_page', product.id);
                return true;
            }
        } catch (error) {
            console.error('Error posting to business page:', error);
            this.showNotification('Failed to post to business page', 'error');
        }
    }

    async selectBusinessPage() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Select Business Page</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Choose which Facebook page to post to:</p>
                        <div class="page-selection">
                            ${this.businessPages.map(page => `
                                <div class="page-option" data-page-id="${page.id}">
                                    <img src="https://graph.facebook.com/${page.id}/picture?type=square" alt="${page.name}">
                                    <span>${page.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add click handlers
            modal.querySelectorAll('.page-option').forEach(option => {
                option.addEventListener('click', () => {
                    const pageId = option.dataset.pageId;
                    modal.remove();
                    resolve(pageId);
                });
            });

            // Close modal if clicked outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            });
        });
    }

    async createFacebookShop(products) {
        if (!this.isPremium) {
            this.showNotification('Facebook Shop requires premium account', 'warning');
            return false;
        }

        try {
            // This would require Facebook Commerce Manager API integration
            // For now, we'll create a simplified version
            const shopData = {
                name: 'Shopping Online Shop',
                description: 'Quality products at great prices',
                products: products.map(p => ({
                    name: p.name,
                    price: p.price,
                    description: p.description,
                    image_url: p.imageUrl,
                    retailer_id: p.id
                }))
            };

            console.log('Facebook Shop data prepared:', shopData);
            this.showNotification('Facebook Shop setup initiated!', 'info');
            
            // In a real implementation, this would call Facebook Commerce Manager API
            return true;
        } catch (error) {
            console.error('Error creating Facebook Shop:', error);
            this.showNotification('Failed to create Facebook Shop', 'error');
        }
    }

    // UTILITY METHODS
    async trackShare(platform, type, contentId) {
        try {
            const shareRecord = {
                platform,
                type,
                contentId,
                timestamp: new Date().toISOString(),
                userId: window.auth?.currentUser?.uid,
                accountType: this.isPremium ? 'premium' : 'free'
            };

            await window.db.collection('social_shares').add(shareRecord);
            console.log('Share tracked:', shareRecord);
        } catch (error) {
            console.error('Error tracking share:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Use existing notification system or create one
        if (window.premiumDashboard) {
            window.premiumDashboard.showNotification(message, type);
        } else if (window.shopManager) {
            window.shopManager.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // PUBLIC API
    async shareProduct(product, options = {}) {
        if (this.isPremium && options.businessPage) {
            return await this.shareProductToBusinessPage(product, options.pageId);
        } else {
            return await this.shareProductToPersonalFacebook(product);
        }
    }

    async shareShop(shop, options = {}) {
        return await this.shareShopToPersonalFacebook(shop);
    }

    isConnected() {
        return !!this.accessToken;
    }

    getUserInfo() {
        return {
            profile: this.userProfile,
            isPremium: this.isPremium,
            businessPages: this.businessPages
        };
    }
}

// Global instance
window.facebookIntegration = new FacebookIntegration();

// Global functions for easy access
window.shareProductToFacebook = async (product, options = {}) => {
    return await window.facebookIntegration.shareProduct(product, options);
};

window.shareShopToFacebook = async (shop, options = {}) => {
    return await window.facebookIntegration.shareShop(shop, options);
};
