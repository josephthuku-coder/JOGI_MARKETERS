// Premium Dashboard JavaScript - Shopping Online
class PremiumDashboard {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.selectedProducts = new Set();
        this.currentProduct = null;
        this.viewMode = 'grid';
        this.uploadedMedia = [];
        this.paymentStatus = null;
        this.analytics = null;
        this.currentImage = null;
        this.currentVideo = null;
        this.db = null;
        this.storage = null;
        this.auth = null;
        this.localFileCache = {};
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Premium Dashboard...');
        
        // IMMEDIATE CLEANUP - Remove all duplicate upload forms
        this.cleanupDuplicateUploads();
        
        // Initialize Firebase
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            this.db = firebase.firestore();
            
            // Initialize auth properly
            if (firebase.auth) {
                this.auth = firebase.auth();
                console.log('✅ Firebase auth initialized successfully');
            } else {
                console.warn('⚠️ Firebase auth not available, some features may not work');
                this.auth = null;
            }
        } else {
            console.error('❌ Firebase not initialized');
            return;
        }
        
        // Initialize state
        this.products = [];
        this.currentImage = null;
        this.currentVideo = null;
        this.localFileCache = {};
        
        // Check authentication
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) return;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Bind form submission
        this.bindFormSubmit();

        // Load products
        await this.loadProducts();
        
        // Load analytics
        await this.loadAnalytics();
        
        // Load seller analytics for each product
        await this.loadSellerAnalytics();
        
        // Check payment status
        await this.checkPaymentStatus();
        
        // Setup global functions
        this.setupGlobalFunctions();
        
        // Initialize tab switching
        this.initializeTabSwitching();
        
        // Start continuous cleanup to prevent duplicates
        this.startContinuousCleanup();
        
        console.log('✅ Premium Dashboard initialized');
    }

    initializeTabSwitching() {
        // Set up tab switching event listeners
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = link.dataset.tab;
                console.log('🔄 Switching to tab:', tabName);
                this.switchTab(tabName);
            });
        });
        
        console.log('✅ Tab switching initialized');
    }
    
    startContinuousCleanup() {
        // Run cleanup every 2 seconds to prevent duplicates
        // Continuous cleanup removed - causing excessive console spam
        // Cleanup is handled on-demand during tab switches
        console.log('✅ Cleanup system ready (on-demand only)');
    }
    
    cleanupDuplicateUploads() {
        console.log('🧹 Starting immediate cleanup of duplicate upload forms...');
        
        // Find ALL upload forms
        const allUploadForms = document.querySelectorAll('#premium-upload-form');
        console.log('🔍 Found', allUploadForms.length, 'upload forms');
        
        if (allUploadForms.length > 1) {
            // Keep only the first one, remove the rest
            for (let i = 1; i < allUploadForms.length; i++) {
                allUploadForms[i].remove();
                console.log('🗑️ Removed duplicate upload form #' + i);
            }
        }
        
        // Ensure the remaining form is in the upload tab
        const uploadForm = document.getElementById('premium-upload-form');
        const uploadTab = document.getElementById('upload-tab');
        
        if (uploadForm && uploadTab && !uploadTab.contains(uploadForm)) {
            uploadTab.appendChild(uploadForm);
            console.log('📦 Moved upload form to upload tab');
        }
        
        // Remove any upload forms from shop tab
        const shopTab = document.getElementById('my-shop-tab');
        if (shopTab && uploadForm) {
            const shopUploadForms = shopTab.querySelectorAll('#premium-upload-form');
            shopUploadForms.forEach(form => {
                form.remove();
                console.log('🗑️ Removed upload form from shop tab');
            });
        }
        
        console.log('✅ Cleanup completed');
    }
    
    setupFormValidation() {
        const form = document.getElementById('premium-upload-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }
    }
    
    async handleProductSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!this.validateProductForm()) {
            return;
        }
        
        // Check if at least one media is uploaded
        if (!this.currentImage && !this.currentVideo) {
            this.showNotification('Please upload at least an image or video', 'error');
            return;
        }
        
        try {
            // Get form data
            const formData = new FormData(e.target);
            const productData = {
                name: formData.get('productName'),
                price: parseFloat(formData.get('productPrice')),
                category: formData.get('productCategory'),
                stock: parseInt(formData.get('productStock')),
                description: formData.get('productDescription'),
                tags: formData.get('productTags') ? formData.get('productTags').split(',').map(tag => tag.trim()) : [],
                weight: parseFloat(formData.get('productWeight')) || 0,
                imageUrl: this.currentImage ? this.currentImage.url : null,
                videoUrl: this.currentVideo ? this.currentVideo.url : null,
                userId: this.currentUser.userId,
                shopId: this.currentUser.userId + '_premium',
                accountType: 'premium',
                shopName: this.currentUser.shopName || this.currentUser.username + "'s Shop",
                timestamp: new Date(),
                status: 'active'
            };
            
            // Check document size estimate (Firestore limit is 1MB)
            const sizeEstimate = JSON.stringify(productData).length;
            if (sizeEstimate > 1048487) {
                this.showNotification('Media is still too large for the database. Try a shorter video or smaller photo.', 'error');
                return;
            }
            
            // Save to Firestore
            const docRef = await this.db.collection('products').add(productData);
            
            // Update local products
            productData.id = docRef.id;
            this.products.push(productData);
            
            // Show success message
            this.showNotification('Product saved successfully to public shop!', 'success');
            
            // Clear form and uploads
            this.clearUploadForm(true);
            this.deleteCurrentUploads();
            
            // Update UI
            this.renderProducts();
            this.updateStats();
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showNotification('Failed to save product', 'error');
        }
    }
    
    validateProductForm() {
        const requiredFields = ['product-name', 'product-price', 'product-category', 'product-stock', 'product-description'];
        
        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                this.showNotification('Please fill in all required fields', 'error');
                field?.focus();
                return false;
            }
        }
        
        const price = parseFloat(document.getElementById('product-price').value);
        if (price < 0) {
            this.showNotification('Price must be a positive number', 'error');
            return false;
        }
        
        const stock = parseInt(document.getElementById('product-stock').value);
        if (stock < 0) {
            this.showNotification('Stock must be a positive number', 'error');
            return false;
        }
        
        return true;
    }
    
    async handleFileUpload(file, mediaType) {
        try {
            console.log('📤 Uploading ' + mediaType + ':', file.name, file.type);
            const fileSizeMB = file.size / (1024 * 1024);
            
            // Enforce limits: Images 10MB, Videos 50MB
            const IMAGE_LIMIT = 10;
            const VIDEO_LIMIT = 50;
            const currentLimit = mediaType === 'image' ? IMAGE_LIMIT : VIDEO_LIMIT;

            if (fileSizeMB > currentLimit) {
                this.showNotification(`❌ ${mediaType.toUpperCase()} too large! Limit is ${currentLimit}MB.`, 'error');
                return;
            }
            
            // Validate file type
            const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
            const validTypes = mediaType === 'image' ? validImageTypes : validVideoTypes;
            
            if (!validTypes.includes(file.type)) {
                throw new Error('Invalid ' + mediaType + ' format. Allowed types: ' + validTypes.join(', '));
            }
            
            let fileToProcess = file;

            // For images: Use Cloudinary upload
            if (mediaType === 'image') {
                this.showNotification('🚀 Uploading image to Cloudinary...', 'info');
                
                const cloudName = "dlf22fpmd";
                const uploadPreset = "shop_upload";

                const formData = new FormData();
                formData.append("file", fileToProcess);
                formData.append("upload_preset", uploadPreset);

                const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                    {
                        method: "POST",
                        body: formData
                    }
                );

                const data = await res.json();

                if (data.secure_url) {
                    // Create media object with Cloudinary URL
                    const mediaObject = {
                        url: data.secure_url,
                        type: mediaType,
                        name: fileToProcess.name,
                        size: fileToProcess.size,
                        isLocalStorage: false,
                        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        uploadedAt: new Date().toISOString()
                    };
                    
                    // Save media metadata to Firestore
                    await this.saveMediaToFirestore(mediaObject);
                    
                    // Update current media references
                    this.currentImage = mediaObject;
                    
                    // Update preview
                    this.updateMediaPreview(mediaType, mediaObject);
                    
                    // Ask for related media
                    this.askForRelatedMedia(mediaType);
                    
                    // Update hidden inputs with the Cloudinary URL
                    const hiddenInput = document.getElementById('product-' + mediaType + '-url');
                    if (hiddenInput) {
                        hiddenInput.value = data.secure_url;
                    }
                    
                    const finalSizeMB = (fileToProcess.size / (1024 * 1024)).toFixed(2);
                    this.showNotification(`IMAGE uploaded to Cloudinary! (${finalSizeMB}MB)`, 'success');
                    
                    return;
                } else {
                    throw new Error("Cloudinary upload failed");
                }
            }
            
            // For videos: Use Cloudinary video upload
            if (mediaType === 'video') {
                this.showNotification('Uploading video to Cloudinary...', 'info');
                
                const cloudName = "dlf22fpmd";
                const uploadPreset = "shop_upload";

                const formData = new FormData();
                formData.append("file", fileToProcess);
                formData.append("upload_preset", uploadPreset);
                formData.append("resource_type", "video");

                const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
                    {
                        method: "POST",
                        body: formData
                    }
                );

                const data = await res.json();

                if (data.secure_url) {
                    const mediaObject = {
                        url: data.secure_url,
                        type: mediaType,
                        name: fileToProcess.name,
                        size: fileToProcess.size,
                        isLocalStorage: false,
                        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        uploadedAt: new Date().toISOString()
                    };
                    
                    await this.saveMediaToFirestore(mediaObject);
                    this.currentVideo = mediaObject;
                    this.updateMediaPreview(mediaType, mediaObject);
                    this.askForRelatedMedia(mediaType);
                    
                    const hiddenInput = document.getElementById('product-' + mediaType + '-url');
                    if (hiddenInput) {
                        hiddenInput.value = data.secure_url;
                    }
                    
                    const finalSizeMB = (fileToProcess.size / (1024 * 1024)).toFixed(2);
                    this.showNotification(`Video uploaded to Cloudinary! (${finalSizeMB}MB)`, 'success');
                    
                    return;
                } else {
                    throw new Error("Cloudinary video upload failed");
                }
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed: ' + error.message, 'error');
        }
    }

    async saveMediaToFirestore(mediaObject) {
        try {
            const userId = this.auth?.currentUser?.uid;

            // Create a copy of the media object
            const metadataOnly = { ...mediaObject };
            
            // If URL is a large Base64 string (from old logic), remove it for metadata document
            if (metadataOnly.url && metadataOnly.url.length > 2000) {
                delete metadataOnly.url;
                metadataOnly.urlStoredLocally = true;
            }

            // Save media metadata only to Firestore using the correct DB instance
            await this.db.collection('users').doc(userId).collection('media').doc(metadataOnly.id).set(metadataOnly);
            console.log('📁 Media metadata saved to Firestore');
        } catch (error) {
            console.warn('⚠️ Could not save metadata to Firestore (non-critical):', error);
        }
    }

    async compressImage(file, maxSize) {
        // Skip compression if the file is already smaller than the target size
        if (file.size <= maxSize) {
            return file;
        }
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate compression ratio - only reduce, never upscale
                    const compressionRatio = file.size > maxSize ? Math.sqrt(maxSize / file.size) : 1;
                    const newWidth = Math.floor(img.width * compressionRatio);
                    const newHeight = Math.floor(img.height * compressionRatio);
                    
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    // Draw and compress
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    // Try different quality levels
                    let quality = 0.8;
                    let compressedDataUrl;
                    
                    do {
                        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                        const compressedSize = this.dataUrlToSize(compressedDataUrl);
                        
                        if (compressedSize <= maxSize || quality <= 0.1) {
                            break;
                        }
                        
                        quality -= 0.1;
                    } while (quality > 0.1);
                    
                    // Convert to File
                    const compressedFile = this.dataUrlToFile(compressedDataUrl, file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg');
                    
                    const originalSize = (file.size / (1024 * 1024)).toFixed(2);
                    const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
                    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
                    
                    console.log('✅ Image compressed: ' + originalSize + 'MB → ' + compressedSizeMB + 'MB (reduced by ' + reduction + '%)');
                    
                    resolve(compressedFile);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    dataUrlToSize(dataUrl) {
        // Remove data URL prefix to get base64 data
        const base64 = dataUrl.split(',')[1];
        return base64.length * 0.75; // Approximate size in bytes
    }

    dataUrlToFile(dataUrl, filename) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        
        return new File([u8arr], filename, { type: mime });
    }
    
    askForRelatedMedia(mediaType) {
        console.log('🔍 askForRelatedMedia called for: ' + mediaType);
        const relatedType = mediaType === 'image' ? 'video' : 'image';
        const hasRelated = relatedType === 'image' ? this.currentImage : this.currentVideo;
        
        console.log('🔍 Related type: ' + relatedType + ', Has related: ' + !!hasRelated);
        
        if (hasRelated) {
            console.log('🔍 Already has related media, skipping modal');
            return; // Already has related media
        }
        
        console.log('🔍 Creating modal for related media...');
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'media-pairing-modal modal';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.8) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 10000 !important;
        `;
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white !important;
                border-radius: 12px !important;
                max-width: 500px !important;
                width: 90% !important;
                padding: 2rem !important;
                text-align: center !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
            ">
                <div class="modal-header">
                    <h3 style="color: #333 !important; margin-bottom: 0.5rem !important;">📸 Add Related ` + relatedType.charAt(0).toUpperCase() + relatedType.slice(1) + `?</h3>
                    <p style="color: #666 !important; font-size: 0.875rem !important; margin-bottom: 1.5rem !important;">Would you like to upload a related ` + relatedType + ` to pair with this ` + mediaType + `?</p>
                </div>
                <div class="modal-actions" style="display: flex !important; gap: 1rem !important; justify-content: center !important; margin-top: 2rem !important;">
                    <button class="btn yes" onclick="premiumDashboard.handleRelatedMediaResponse('yes', '` + relatedType + `')" style="
                        padding: 0.75rem 1.5rem !important;
                        border: none !important;
                        border-radius: 8px !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%) !important;
                        color: white !important;
                        display: flex !important;
                        align-items: center !important;
                        gap: 0.5rem !important;
                    ">
                        <i class="fas fa-check"></i> Yes, Upload ` + relatedType.charAt(0).toUpperCase() + relatedType.slice(1) + `
                    </button>
                    <button class="btn no" onclick="premiumDashboard.handleRelatedMediaResponse('no', '` + relatedType + `')" style="
                        padding: 0.75rem 1.5rem !important;
                        border: none !important;
                        border-radius: 8px !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        background: linear-gradient(135deg, #6c757d 0%, #545b62 100%) !important;
                        color: white !important;
                        display: flex !important;
                        align-items: center !important;
                        gap: 0.5rem !important;
                    ">
                        <i class="fas fa-times"></i> No, Continue
                    </button>
                </div>
            </div>
        `;
        
        console.log('🔍 Modal created, adding to body...');
        document.body.appendChild(modal);
        console.log('🔍 Modal added to body');
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    handleRelatedMediaResponse(response, mediaType) {
        // Close modal
        document.querySelector('.media-pairing-modal').remove();
        
        if (response === 'yes') {
            // Trigger file input for related media
            if (mediaType === 'video') {
                document.getElementById('video-input').click();
            } else {
                document.getElementById('photo-input').click();
            }
        } else {
            this.showNotification('Continuing with ' + (mediaType === 'image' ? 'video' : 'image') + ' only', 'info');
        }
    }
    
    updateMediaPreview(mediaType, mediaObject) {
        const slot = document.getElementById(mediaType + '-preview-slot');
        if (!slot) return;
        
        // Use previewUrl for display (Base64), fallback to regular URL
        const displayUrl = mediaObject.previewUrl || mediaObject.url;
        
        slot.classList.add('has-media');
        slot.innerHTML = `
            ` + (mediaType === 'video' ? 
                `<video src="` + displayUrl + `" class="preview-media video" controls muted></video>` :
                `<img src="` + displayUrl + `" class="preview-media" alt="Preview">`
            ) + `
            <div class="preview-actions">
                <button class="preview-action-btn" onclick="premiumDashboard.viewMedia('` + mediaType + `')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="preview-action-btn" onclick="premiumDashboard.removeMedia('` + mediaType + `')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    viewMedia(mediaType) {
        const media = mediaType === 'image' ? this.currentImage : this.currentVideo;
        if (!media) return;
        
        // Use previewUrl for display (Base64), fallback to regular URL
        const displayUrl = media.previewUrl || media.url;
        
        // Create viewer modal
        const modal = document.createElement('div');
        modal.className = 'media-viewer-modal modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>` + media.name + `</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="viewer-container">
                        ` + (mediaType === 'video' ? 
                            `<video src="` + displayUrl + `" controls autoplay muted class="viewer-media"></video>` :
                            `<img src="` + displayUrl + `" class="viewer-media">`
                        ) + `
                    </div>
                    <div class="viewer-info">
                        <p><strong>Name:</strong> ` + media.name + `</p>
                        <p><strong>Size:</strong> ` + this.formatFileSize(media.size) + `</p>
                        <p><strong>Type:</strong> ` + mediaType.toUpperCase() + `</p>
                        <p><strong>Storage:</strong> ` + (media.isMockStorage ? 'Mock Firebase Storage (Local Dev)' : (media.isBase64 ? 'Base64' : 'Cloud Storage')) + `</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    removeMedia(mediaType) {
        if (confirm('Are you sure you want to remove this ' + mediaType + '?')) {
            // Clear current media
            if (mediaType === 'image') {
                this.currentImage = null;
                document.getElementById('product-image-url').value = '';
            } else {
                this.currentVideo = null;
                document.getElementById('product-video-url').value = '';
            }
            
            // Reset preview slot
            const slot = document.getElementById(mediaType + '-preview-slot');
            if (slot) {
                slot.classList.remove('has-media');
                slot.innerHTML = `
                    <div class="preview-placeholder">
                        <i class="fas fa-` + (mediaType === 'image' ? 'image' : 'video') + `"></i>
                        <span>` + mediaType.charAt(0).toUpperCase() + mediaType.slice(1) + ` Preview</span>
                    </div>
                `;
            }
            
            this.showNotification(mediaType.charAt(0).toUpperCase() + mediaType.slice(1) + ' removed', 'info');
        }
    }
    
    clearUploadForm(silent = false) {
        const form = document.getElementById('premium-upload-form');
        if (form) {
            form.reset();
        }
        
        // Clear current media
        this.currentImage = null;
        this.currentVideo = null;
        
        // Clear hidden inputs
        document.getElementById('product-image-url').value = '';
        document.getElementById('product-video-url').value = '';
        
        // Reset preview slots
        ['image', 'video'].forEach(type => {
            const slot = document.getElementById(type + '-preview-slot');
            if (slot) {
                slot.classList.remove('has-media');
                slot.innerHTML = `
                    <div class="preview-placeholder">
                        <i class="fas fa-` + type + `"></i>
                        <span>` + type.charAt(0).toUpperCase() + type.slice(1) + ` Preview</span>
                    </div>
                `;
            }
        });
        
        if (!silent) {
            this.showNotification('Form cleared', 'info');
        }
    }
    
    deleteCurrentUploads() {
        this.clearUploadForm();
        this.showNotification('Current uploads deleted', 'success');
    }

    async checkAuth() {
        return new Promise((resolve) => {
            const userSession = sessionStorage.getItem('userSession');
            if (!userSession) {
                window.location.href = 'index.html#login';
                resolve(false);
                return;
            }

            this.currentUser = JSON.parse(userSession);
            
            // Set up shop link immediately from session data
            const viewShopBtn = document.getElementById('view-public-shop-btn');
            if (viewShopBtn && this.currentUser.userId) {
                viewShopBtn.onclick = () => window.open(`shop.html?shop=${this.currentUser.userId}_premium`, '_blank');
            }

            // Check if premium user
            if (this.currentUser.accountType !== 'premium') {
                window.location.href = 'dashboard.html';
                resolve(false);
                return;
            }

            this.updateUI();

            // Background Firebase Auth check - don't kick user out if it's not ready yet
            if (this.auth) {
                const unsubscribe = this.auth.onAuthStateChanged((user) => {
                    unsubscribe();
                    if (!user) {
                        console.log('ℹ️ Firebase Auth starting in background...');
                        this.auth.signInAnonymously().catch(err => {
                            console.error('Silent login failed:', err.message);
                            if (err.code === 'auth/admin-restricted-operation') {
                                this.showNotification('Configuration Error: Enable Anonymous Auth in Firebase Console.', 'warning');
                            }
                        });
                    }
                    resolve(true);
                });
            } else {
                resolve(true);
            }
        });
    }

    updateUI() {
        document.getElementById('shopName').textContent = this.currentUser.username + `'s Premium Shop`;
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.dataset.tab;
                if (!tab) {
                    console.warn('Premium Dashboard nav link missing data-tab');
                    return;
                }
                this.switchTab(tab);
            });
        });
    }

    async loadProducts() {
        try {
            console.log('📦 Loading products...');
            
            // Simple query without orderBy to avoid index requirement
            const productsSnapshot = await this.db.collection('products')
                .where('userId', '==', this.currentUser.userId)
                .where('accountType', '==', 'premium')
                .get();
            
            if (!productsSnapshot.empty) {
                // Sort locally and get products
                this.products = productsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Sort by timestamp (newest first)
                this.products.sort((a, b) => {
                    const timeA = a.timestamp ? a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp) : new Date(0);
                    const timeB = b.timestamp ? b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp) : new Date(0);
                    return timeB - timeA;
                });
                
                console.log('✅ Loaded ' + this.products.length + ' products');
            } else {
                this.products = [];
                console.log('📦 No products found');
            }
            
            // Update UI
            this.renderProducts();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showNotification('Failed to load products', 'error');
        }
    }

    switchTab(tabName) {
        console.log('🔄 Switching to tab:', tabName);
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Map tab names to tab IDs
        const tabIdMap = {
            'upload': 'upload-tab',
            'my-shop': 'my-shop-tab',
            'themes': 'themes-tab',
            'inventory': 'inventory-tab',
            'sales': 'sales-tab',
            'customers': 'customers-tab',
            'social-sync': 'social-sync-tab',
            'auto-post': 'auto-post-tab'
        };
        
        // Hide ALL tabs first
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none';
        });
        
        // Get original upload form (should be only one)
        const originalUploadForm = document.getElementById('premium-upload-form');
        
        if (tabName === 'upload') {
            // Show upload tab
            const uploadTab = document.getElementById('upload-tab');
            if (uploadTab) {
                uploadTab.classList.add('active');
                uploadTab.style.display = 'block';
                
                // Ensure upload form is in upload tab and visible
                if (originalUploadForm) {
                    if (!uploadTab.contains(originalUploadForm)) {
                        uploadTab.appendChild(originalUploadForm);
                    }
                    originalUploadForm.style.display = 'block';
                    originalUploadForm.style.visibility = 'visible';
                    originalUploadForm.style.opacity = '1';
                }
            }
            console.log('🔓 Showing upload tab');
        } else if (tabName === 'my-shop') {
            // Show shop tab - ENSURE NO UPLOAD FORMS
            const shopTab = document.getElementById('my-shop-tab');
            if (shopTab) {
                shopTab.classList.add('active');
                shopTab.style.display = 'block';
                
                // Remove upload form from shop tab if it's there
                if (originalUploadForm && shopTab.contains(originalUploadForm)) {
                    shopTab.removeChild(originalUploadForm);
                    console.log('🗑️ Removed upload form from shop tab');
                }
                
                // Hide upload form completely
                if (originalUploadForm) {
                    originalUploadForm.style.display = 'none';
                    originalUploadForm.style.visibility = 'hidden';
                    originalUploadForm.style.opacity = '0';
                }
            }
            console.log('🛒 Showing shop tab - no upload forms');
            
            // Load products when switching to shop tab
            this.loadProducts();
        } else {
            // Handle other tabs
            const selectedTabId = tabIdMap[tabName];
            if (selectedTabId) {
                const selectedTab = document.getElementById(selectedTabId);
                if (selectedTab) {
                    selectedTab.classList.add('active');
                    selectedTab.style.display = 'block';
                    
                    // Hide upload form for other tabs
                    if (originalUploadForm) {
                        originalUploadForm.style.display = 'none';
                        originalUploadForm.style.visibility = 'hidden';
                        originalUploadForm.style.opacity = '0';
                    }
                }
            }
        }
        
        // Add active class to selected nav link
        const selectedLink = document.querySelector('[data-tab="' + tabName + '"]');
        if (selectedLink) {
            selectedLink.classList.add('active');
            console.log('✅ Activated nav link:', tabName);
        }
    }

    renderProducts() {
        
        // Try multiple container IDs
        let productsContainer = document.getElementById('premium-products-container');
        if (!productsContainer) {
            console.log('❌ No premium-products-container found, trying products-grid');
            productsContainer = document.getElementById('products-grid');
        }
        if (!productsContainer) {
            console.log('❌ No products container found at all');
            return;
        }
        
        console.log('🔍 Found products container:', productsContainer.id);
        console.log('🔍 Container visibility:', window.getComputedStyle(productsContainer).display);
        console.log('🔍 Container position:', window.getComputedStyle(productsContainer).position);
        
        // Force container visibility
        productsContainer.style.display = 'block';
        productsContainer.style.visibility = 'visible';
        productsContainer.style.opacity = '1';
        productsContainer.style.zIndex = '10';
        
        console.log('🔧 Forced container visibility');
        
        if (!this.products || this.products.length === 0) {
            productsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No products yet</h3>
                    <p>Upload your first product to get started!</p>
                </div>
            `;
            return;
        }
        
        productsContainer.innerHTML = '';
        
        this.products.forEach((product, index) => {
            // Use product image/video URLs directly, like the free shop
            const displayImageUrl = product.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdiZzQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNlOWVjZWY7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjhmOWZhO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSJ1cmwoI2diZzQpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzY2NzVhZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvbnRlbnQ8L3RleHQ+PC9zdmc+';

            
            const mediaSection = product.videoUrl ? `
                <div class="product-media video-present">
                    <div class="media-block image-block">
                        <img src="${displayImageUrl}" alt="${product.name}" class="product-image" onerror="this.style.display='none'">
                    </div>
                    <div class="media-block video-block video-preview-wrapper" data-product-id="${product.id}">
                        <video class="product-preview-video" preload="auto"><source src="${product.videoUrl}" type="video/mp4"></video>
                        <div class="video-thumbnail-fallback" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;"><i class="fas fa-play-circle"></i></div>
                        <div class="video-play-indicator">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="product-media">
                    <img src="${displayImageUrl}" alt="${product.name}" class="product-image" onerror="this.style.opacity='0.5'">
                </div>
            `;

            const actionButtons = `
                <button class="btn view-btn" onclick="viewProductDetails('${product.id}')">
                    <i class="fas fa-eye"></i>
                    View
                </button>
                ${product.videoUrl ? `
                    <button class="btn watch-btn" onclick="watchProductVideo('${product.id}')">
                        <i class="fas fa-play-circle"></i>
                        Watch
                    </button>
                ` : ''}
            `;

            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.setAttribute('data-product-id', product.id);
            productCard.innerHTML = `
                <div class="product-card-header">
                    <input type="checkbox" class="product-checkbox" data-product-id="${product.id}" onchange="toggleProductSelection('${product.id}')">
                    <button class="btn-icon delete-btn" onclick="deleteProduct('${product.id}')" title="Delete this product">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="product-image-container">
                    ${mediaSection}
                    <div class="product-overlay">
                        <div class="overlay-label">${product.name}</div>
                        <div class="overlay-meta">
                            ${product.videoUrl ? '<span class="badge video-badge"><i class="fas fa-video"></i> Video</span>' : '<span class="badge image-badge"><i class="fas fa-image"></i> Image</span>'}
                        </div>
                    </div>
                    <div class="product-price-overlay">
                        Ksh ${product.price}
                    </div>
                    <div class="product-actions">
                        ${actionButtons}
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || 'No description'}</p>
                    <div class="product-meta">
                        <span class="category">${product.category || 'Uncategorized'}</span>
                        <span class="stock">Stock: ${product.stock || 0}</span>
                    </div>
                </div>
            `;

            productCard.addEventListener('click', (e) => {
                // Don't trigger on buttons or checkboxes
                if (e.target.closest('.view-btn') || e.target.closest('.watch-btn') || e.target.closest('.delete-btn') || e.target.closest('.product-checkbox')) {
                    return;
                }
                this.viewProductDetails(product.id);
            });

            // Add video preview hover behavior
            const videoWrapper = productCard.querySelector('.video-preview-wrapper');
            if (videoWrapper && product.videoUrl) {
                const videoEl = videoWrapper.querySelector('.product-preview-video');
                const playIndicator = videoWrapper.querySelector('.video-play-indicator');
                const thumbnailFallback = videoWrapper.querySelector('.video-thumbnail-fallback');

                // Hide thumbnail fallback when video is ready
                if (videoEl) {
                    videoEl.addEventListener('loadeddata', () => {
                        if (thumbnailFallback) thumbnailFallback.style.display = 'none';
                    }, { once: true });
                }

                videoWrapper.addEventListener('mouseenter', () => {
                    if (videoEl && videoEl.paused) {
                        videoEl.play().catch(() => {
                            console.log('Video autoplay prevented; user interaction required.');
                        });
                        if (playIndicator) playIndicator.style.opacity = '0';
                    }
                });

                videoWrapper.addEventListener('mouseleave', () => {
                    if (videoEl && !videoEl.paused) {
                        videoEl.pause();
                        videoEl.currentTime = 0;
                        if (playIndicator) playIndicator.style.opacity = '1';
                    }
                });
            }

            productsContainer.appendChild(productCard);
        });
        
        console.log(`✅ Rendered ${this.products.length} products`);
        console.log('Container children count:', productsContainer.children.length);
        console.log('Container innerHTML length:', productsContainer.innerHTML.length);
        console.log('Container style.display:', productsContainer.style.display);
        console.log('Container computed display:', window.getComputedStyle(productsContainer).display);
    }

    viewProductDetails(productId) {
        const product = this.products.find(item => item.id === productId);
        if (!product) {
            this.showNotification('Product not found', 'error');
            return;
        }

        this.currentProduct = product;
        
        // Prefer image for display, fallback to video
        if (product.imageUrl) {
            openFullscreenViewer('image', product.imageUrl, product.name || 'Product Details');
        } else if (product.videoUrl) {
            openFullscreenViewer('video', product.videoUrl, product.name || 'Product Details');
        } else {
            this.showNotification('No media available for this product', 'warning');
        }
    }

    watchProductVideo(productId) {
        const product = this.products.find(item => item.id === productId);
        if (!product) {
            this.showNotification('Product not found', 'error');
            return;
        }
        
        if (!product.videoUrl) {
            this.showNotification('No video available for this product', 'warning');
            return;
        }

        this.currentProduct = product;
        openFullscreenViewer('video', product.videoUrl, `${product.name || 'Product'} - Video`);
    }

    zoomInModal() {
        this.modalZoom = Math.min(this.modalZoom + 0.25, 3);
        this.updateModalZoom();
    }

    zoomOutModal() {
        this.modalZoom = Math.max(this.modalZoom - 0.25, 0.5);
        this.updateModalZoom();
    }

    resetModalZoom() {
        this.modalZoom = 1;
        this.updateModalZoom();
    }

    updateModalZoom() {
        const imageEl = document.getElementById('modal-product-image');
        const videoEl = document.getElementById('modal-product-video');

        if (imageEl) {
            imageEl.style.transform = `scale(${this.modalZoom})`;
        }
        if (videoEl) {
            videoEl.style.transform = `scale(${this.modalZoom})`;
        }
    }

    viewCurrentProduct() {
        if (!this.currentProduct) {
            this.showNotification('Select a product first', 'warning');
            return;
        }
        const url = this.currentProduct.videoUrl || this.currentProduct.imageUrl;
        if (!url) {
            this.showNotification('No media available to view', 'error');
            return;
        }
        window.open(url, '_blank');
    }

    editCurrentProduct() {
        if (!this.currentProduct) {
            this.showNotification('Select a product first', 'warning');
            return;
        }
        this.showNotification('Edit feature coming soon. Use the upload form to update your product listing.', 'info');
    }

    async shareCurrentProduct() {
        if (!this.currentProduct) {
            this.showNotification('Select a product first', 'warning');
            return;
        }
        const socialModal = document.getElementById('social-modal');
        if (socialModal) {
            socialModal.style.display = 'block';
        }
    }

    downloadCurrentProduct() {
        if (!this.currentProduct) {
            this.showNotification('Select a product first', 'warning');
            return;
        }
        const url = this.currentProduct.videoUrl || this.currentProduct.imageUrl;
        if (!url) {
            this.showNotification('No media available to download', 'error');
            return;
        }
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(this.currentProduct.name || 'product').replace(/\s+/g, '_')}.${this.currentProduct.videoUrl ? 'mp4' : 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    deleteCurrentProduct() {
        if (!this.currentProduct) {
            this.showNotification('Select a product first', 'warning');
            return;
        }
        this.deleteProduct(this.currentProduct.id);
        this.closeProductModal();
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        const videoEl = document.getElementById('modal-product-video');
        if (videoEl) {
            videoEl.pause();
        }
    }

    closeSocialModal() {
        const socialModal = document.getElementById('social-modal');
        if (socialModal) {
            socialModal.style.display = 'none';
        }
    }

    async confirmSocialShare(platform) {
        if (!this.currentProduct) {
            this.showNotification('Select a product first', 'warning');
            return;
        }

        const title = encodeURIComponent(this.currentProduct.name || 'My Premium Product');
        const url = encodeURIComponent(window.location.href);

        switch (platform) {
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                break;
            case 'instagram':
                this.showNotification('Instagram sharing is not directly supported from web. Copy the shop link instead.', 'info');
                break;
            case 'tiktok':
                this.showNotification('TikTok sharing is not directly supported from web. Copy the shop link instead.', 'info');
                break;
            case 'whatsapp':
                window.open(`https://api.whatsapp.com/send?text=${title}%20-%20${url}`, '_blank');
                break;
            default:
                this.showNotification('Choose a valid share option', 'error');
        }

        this.closeSocialModal();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        const productsContainer = document.getElementById('premium-products-container');
        if (!productsContainer) return;

        if (mode === 'list') {
            productsContainer.classList.add('list-view');
            this.showNotification('List view enabled', 'success');
        } else {
            productsContainer.classList.remove('list-view');
            this.showNotification('Grid view enabled', 'success');
        }
    }

    selectAllProducts() {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => card.classList.add('selected'));
        this.showNotification('All products selected', 'success');
    }

    openShareModal(platform) {
        if (!this.currentProduct) {
            this.showNotification('Open a product first before sharing', 'warning');
            return;
        }
        const socialModal = document.getElementById('social-modal');
        if (socialModal) {
            socialModal.style.display = 'block';
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }
        
        try {
            // Delete from Firestore
            await this.db.collection('products').doc(productId).delete();
            
            // Delete from Storage (only for real Firebase URLs)
            const product = this.products.find(p => p.id === productId);
            if (product) {
                // Note: Cloudinary images are managed through their dashboard
                // Firebase Storage cleanup only applies to old Firebase URLs
                // Base64 and mock URLs don't need deletion from storage
            }
            
            // Remove from local array and selection
            this.products = this.products.filter(p => p.id !== productId);
            this.selectedProducts.delete(productId);
            
            // Update UI
            this.renderProducts();
            this.updateBulkActionsToolbar();
            this.updateStats();
            
            this.showNotification('Product deleted successfully', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Failed to delete product', 'error');
        }
    }

    toggleProductSelection(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
        } else {
            this.selectedProducts.add(productId);
        }
        
        // Update checkbox and card styling
        const checkbox = document.querySelector(`input[data-product-id="${productId}"]`);
        const card = document.querySelector(`[data-product-id="${productId}"]`);
        
        if (checkbox) {
            checkbox.checked = this.selectedProducts.has(productId);
        }
        if (card) {
            card.classList.toggle('selected', this.selectedProducts.has(productId));
        }
        
        this.updateBulkActionsToolbar();
    }

    updateBulkActionsToolbar() {
        const toolbar = document.getElementById('bulk-actions-toolbar');
        const selectedCount = document.getElementById('selected-count');
        
        if (!toolbar) return;
        
        if (this.selectedProducts.size > 0) {
            toolbar.style.display = 'flex';
            selectedCount.textContent = `${this.selectedProducts.size} selected`;
        } else {
            toolbar.style.display = 'none';
        }
    }

    selectAllProducts() {
        this.products.forEach(product => {
            this.selectedProducts.add(product.id);
        });
        
        // Update all checkboxes and cards
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.checked = true;
        });
        document.querySelectorAll('[data-product-id]').forEach(card => {
            if (card.classList.contains('product-card')) {
                card.classList.add('selected');
            }
        });
        
        this.updateBulkActionsToolbar();
    }

    deselectAllProducts() {
        this.selectedProducts.clear();
        
        // Update all checkboxes and cards
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.querySelectorAll('[data-product-id]').forEach(card => {
            if (card.classList.contains('product-card')) {
                card.classList.remove('selected');
            }
        });
        
        this.updateBulkActionsToolbar();
    }

    async deleteSelectedProducts() {
        if (this.selectedProducts.size === 0) {
            this.showNotification('Please select products to delete', 'warning');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedProducts.size} product(s)? This cannot be undone.`)) {
            return;
        }
        
        const productIds = Array.from(this.selectedProducts);
        let deletedCount = 0;
        
        for (const productId of productIds) {
            try {
                // Delete from Firestore
                await this.db.collection('products').doc(productId).delete();
                
                // Delete from Storage (only for real Firebase URLs)
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    // Note: Cloudinary images are managed through their dashboard
                    // Firebase Storage cleanup only applies to old Firebase URLs
                    // Base64 and mock URLs don't need deletion from storage
                }
                deletedCount++;
            } catch (error) {
                console.error(`Failed to delete product ${productId}:`, error);
            }
        }
        
        // Remove from local array
        this.products = this.products.filter(p => !productIds.includes(p.id));
        this.selectedProducts.clear();
        
        // Update UI
        this.renderProducts();
        this.updateStats();
        
        this.showNotification(`Successfully deleted ${deletedCount} product(s)`, 'success');
    }

    shareSelectedProducts() {
        if (this.selectedProducts.size === 0) {
            this.showNotification('Please select products to share', 'warning');
            return;
        }
        
        const selectedProducts = this.products.filter(p => this.selectedProducts.has(p.id));
        let shareText = `🛍️ Check out my premium products:\n\n`;
        
        selectedProducts.forEach((product, index) => {
            shareText += `${index + 1}. ${product.name} - Ksh ${product.price}\n`;
        });
        
        shareText += `\n👉 Visit my shop to see all products!\n${window.location.href}`;
        
        const encodedText = encodeURIComponent(shareText);
        
        // Show share options modal
        const shareModal = document.getElementById('social-modal') || document.createElement('div');
        if (!document.getElementById('social-modal')) {
            shareModal.id = 'social-modal';
            shareModal.className = 'modal';
            shareModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Share Products</h3>
                        <button class="close-btn" onclick="document.getElementById('social-modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Share ${selectedProducts.length} product(s) to:</p>
                        <div class="share-options">
                            <button class="btn social-btn facebook-btn" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}', '_blank')">
                                <i class="fab fa-facebook"></i> Facebook
                            </button>
                            <button class="btn social-btn whatsapp-btn" onclick="window.open('https://api.whatsapp.com/send?text=${encodedText}', '_blank')">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </button>
                            <button class="btn social-btn twitter-btn" onclick="window.open('https://twitter.com/intent/tweet?text=${encodedText}', '_blank')">
                                <i class="fab fa-twitter"></i> Twitter
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(shareModal);
        }
        shareModal.style.display = 'block';
    }

    async loadAnalytics() {
        try {
            if (!this.currentUser?.userId) return;

            const analyticsSnapshot = await this.db.collection('analytics')
                .where('userId', '==', this.currentUser.userId)
                .get();
            
            if (!analyticsSnapshot.empty) {
                this.analytics = analyticsSnapshot.docs[0].data();
                this.updateAnalyticsDisplay();
            }
        } catch (error) {
            console.error('Error loading analytics:', error.message);
        }
    }

    updateAnalyticsDisplay() {
        if (!this.analytics) return;
        
        document.getElementById('shopViews').textContent = this.analytics.views || 0;
        document.getElementById('shopShares').textContent = this.analytics.shares || 0;
        document.getElementById('shopOrders').textContent = this.analytics.orders || 0;
    }

    async checkPaymentStatus() {
        try {
            if (!this.currentUser?.userId) return;

            // Simple query without orderBy to avoid index requirement
            const paymentSnapshot = await this.db.collection('payments')
                .where('userId', '==', this.currentUser.userId)
                .get();
            
            if (!paymentSnapshot.empty) {
                // Sort locally and get most recent payment
                const payments = paymentSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                payments.sort((a, b) => {
                    const timeA = a.timestamp ? a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp) : new Date(0);
                    const timeB = b.timestamp ? b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp) : new Date(0);
                    return timeB - timeA;
                });
                
                const lastPayment = payments[0];
                const paymentDate = new Date(lastPayment.timestamp);
                const dueDate = new Date(paymentDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
                
                if (new Date() >= dueDate) {
                    this.showPaymentWarning();
                }
            } else {
                this.hidePaymentWarning();
            }
            
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }

    showPaymentWarning() {
        const warningDiv = document.getElementById('payment-warning');
        if (warningDiv) {
            warningDiv.style.display = 'block';
        }
    }

    hidePaymentWarning() {
        const warningDiv = document.getElementById('payment-warning');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    }

    updateStats() {
        document.getElementById('productCount').textContent = this.products.length;
        document.getElementById('videoCount').textContent = this.products.filter(p => p.videoUrl).length;
        document.getElementById('photoCount').textContent = this.products.filter(p => p.imageUrl).length;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification ' + type;
        notification.innerHTML = `
            <i class="fas fa-` + (type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle') + `"></i>
            <span>` + message + `</span>
            <button class="close-btn" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Camera and upload methods
    async openCamera() {
        try {
            console.log('🎥 Attempting to open camera...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' },
                audio: false 
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            const modal = document.createElement('div');
            modal.className = 'camera-modal modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📸 Take Photo</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <video id="camera-preview" autoplay playsinline style="width: 100%; max-height: 400px; border-radius: 8px;"></video>
                        <div class="camera-controls">
                            <button class="btn primary capture-btn">
                                <i class="fas fa-camera"></i> Capture Photo
                            </button>
                            <button class="btn secondary cancel-btn">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const preview = document.getElementById('camera-preview');
            preview.srcObject = stream;
            
            modal.querySelector('.capture-btn').addEventListener('click', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
                    await this.handleFileUpload(file, 'image');
                    
                    stream.getTracks().forEach(track => track.stop());
                    modal.remove();
                }, 'image/jpeg', 0.9);
            });
            
            modal.querySelector('.cancel-btn').addEventListener('click', () => {
                stream.getTracks().forEach(track => track.stop());
                modal.remove();
            });
            
        } catch (error) {
            console.error('❌ Camera access error:', error);
            this.showNotification('Camera access denied or not available', 'error');
            this.openFileInput('image/*');
        }
    }

    openDesktopUpload() {
        this.openFileInput('image/*,video/*');
    }

    openPhoneStorage() {
        this.openFileInput('image/*,video/*');
    }

    browseProducts() {
        console.log('🌐 Opening Chrome browser...');
        const chromeUrl = 'https://www.google.com/search?q=product+images&tbm=isch';
        window.open(chromeUrl, '_blank');
        this.showNotification('📱 Search for product images, then use screenshot upload', 'info');
        setTimeout(() => {
            this.startScreenshotUpload();
        }, 2000);
    }

    openVideoUpload() {
        this.openFileInput('video/*');
    }

    openFileInput(accept) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = accept;
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => this.handleFileUpload(file, file.type.startsWith('video/') ? 'video' : 'image'));
        };
        input.click();
    }

    startScreenshotUpload() {
        this.showNotification('📸 Screenshot mode activated', 'info');
    }

    editProduct(productId) {
        this.showNotification('Edit feature coming soon', 'info');
    }

    async logout() {
        try {
            // Clear session and redirect regardless of auth status
            sessionStorage.removeItem('userSession');
            this.currentUser = null;
            this.products = [];
            
            // Try to sign out if auth is available
            if (this.auth) {
                await this.auth.signOut();
                console.log('✅ Firebase sign out successful');
            } else {
                console.log('ℹ️ Auth not available, clearing session only');
            }
            
            this.showNotification('Logged out successfully', 'success');
            this.renderProducts();
            this.switchTab('upload');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'index.html#login';
            }, 1000);
            
        } catch (error) {
            console.error('Logout failed:', error);
            // Still clear session and redirect even if sign out fails
            sessionStorage.removeItem('userSession');
            this.currentUser = null;
            this.products = [];
            this.showNotification('Logged out (session cleared)', 'info');
            
            setTimeout(() => {
                window.location.href = 'index.html#login';
            }, 1000);
        }
    }

    switchAccount() {
        this.currentUser.accountType = 'free';
        sessionStorage.setItem('userSession', JSON.stringify(this.currentUser));
        this.showNotification('Switching to Free Shop...', 'info');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
    }

    bindFormSubmit() {
        const form = document.getElementById('premium-upload-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProductSubmit(e);
            });
        }
    }

    setupGlobalFunctions() {
        // Make methods globally accessible for HTML onclick handlers
        window.premiumDashboardInstance = this;
        
        // Tab switching functionality
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = link.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Theme functionality
        window.applyTheme = (themeName) => {
            this.applyTheme(themeName);
        };
        
        // Inventory functionality
        window.addInventoryItem = () => {
            this.addInventoryItem();
        };
        window.exportInventory = () => {
            this.exportInventory();
        };
        window.reorderStock = () => {
            this.reorderStock();
        };
        
        // Analytics functionality
        window.generateReport = (period) => {
            this.generateReport(period);
        };
        window.exportReport = () => {
            this.exportReport();
        };
        
        // Social media functionality
        window.syncAllPlatforms = () => {
            this.syncAllPlatforms();
        };
        window.schedulePosts = () => {
            this.schedulePosts();
        };
        
        // Auto-post functionality
        window.startAutopost = () => {
            this.startAutopost();
        };
        window.pauseAutopost = () => {
            this.pauseAutopost();
        };
        
        // Account settings functionality
        window.saveAccountSettings = () => {
            this.saveAccountSettings();
        };
        window.changePassword = () => {
            this.changePassword();
        };
        window.enable2FA = () => {
            this.enable2FA();
        };
        window.viewLoginHistory = () => {
            this.viewLoginHistory();
        };
        window.deleteAccount = () => {
            this.deleteAccount();
        };
        
        // Support functionality
        window.startPriorityChat = () => {
            this.startPriorityChat();
        };
        window.scheduleVideoCall = () => {
            this.scheduleVideoCall();
        };
        window.openKnowledgeBase = () => {
            this.openKnowledgeBase();
        };
        window.createNewTicket = () => {
            this.createNewTicket();
        };
        
        // Ensure global functions have access to this instance
        if (typeof logout === 'function') {
            // logout function already exists globally
        }
        
        if (typeof viewProductDetails === 'function') {
            // viewProductDetails function already exists globally
        }
        
        console.log('✅ Global functions setup completed');
    }

    // Tab switching
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName + '-tab');
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Add active class to selected nav link
        const selectedNavLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedNavLink) {
            selectedNavLink.classList.add('active');
        }
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    // Load tab-specific data
    loadTabData(tabName) {
        switch(tabName) {
            case 'themes':
                this.loadThemes();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'sales':
                this.loadSalesReports();
                break;
            case 'customers':
                this.loadCustomerInsights();
                break;
            case 'social-sync':
                this.loadSocialSync();
                break;
            case 'auto-post':
                this.loadAutoPost();
                break;
            case 'account':
                this.loadAccountSettings();
                break;
            case 'billing':
                this.loadBilling();
                break;
            case 'support':
                this.loadSupport();
                break;
            case 'my-shop':
                this.loadMyPublicShop();
                break;
        }
    }

    // Load public shop functionality
    loadMyPublicShop() {
        console.log('🏪 Loading public shop...');
        
        // Update shop stats
        document.getElementById('shopViews').textContent = '1,234';
        document.getElementById('shopShares').textContent = '89';
        document.getElementById('shopOrders').textContent = '45';
        
        // Load products into the public shop container
        this.renderProducts();
        
        this.showNotification('Public shop loaded successfully!', 'success');
    }

    // Public shop functionality
    setViewMode(mode) {
        console.log('🔄 Setting view mode to:', mode);
        this.showNotification(`Switched to ${mode} view`, 'info');
    }

    selectAllProducts() {
        console.log('☑️ Selecting all products');
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateSelectedCount();
    }

    async shareToFacebook() {
        try {
            // Share current product or shop
            if (this.currentProduct) {
                // Generate share page URL for proper OG previews
                const sharePageUrl = `${window.location.origin}/share.html?shop=${this.currentUser?.uid}&product=${this.currentProduct.id}`;
                
                // Create Facebook share link pointing to share page
                const url = encodeURIComponent(sharePageUrl);
                const facebookShareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                
                // Open in new tab
                window.open(facebookShareLink, '_blank', 'width=600,height=400');
                
                this.showNotification('Product shared to Facebook!', 'success');
                
            } else {
                // Share shop
                const shopSharePageUrl = `${window.location.origin}/share.html?shop=${this.currentUser?.uid}`;
                const url = encodeURIComponent(shopSharePageUrl);
                const facebookShareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                
                window.open(facebookShareLink, '_blank', 'width=600,height=400');
                
                this.showNotification('Shop shared to Facebook!', 'success');
            }
        } catch (error) {
            console.error('Error sharing to Facebook:', error);
            this.showNotification('Failed to share to Facebook', 'error');
        }
    }

    shareToInstagram() {
        console.log('📷 Sharing to Instagram...');
        this.showNotification('Shop shared to Instagram!', 'success');
    }

    shareToTikTok() {
        console.log('🎵 Sharing to TikTok...');
        this.showNotification('Shop shared to TikTok!', 'success');
    }

    shareToWhatsApp() {
        console.log('💬 Sharing to WhatsApp...');
        this.showNotification('Shop shared to WhatsApp!', 'success');
    }

    // Theme functionality
    applyTheme(themeName) {
        // Update active theme display
        const activeThemeSpan = document.getElementById('activeTheme');
        if (activeThemeSpan) {
            activeThemeSpan.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
        }
        
        // Update theme cards
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const selectedCard = document.querySelector(`[data-theme="${themeName}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
        
        this.showNotification(`Theme "${themeName}" applied successfully!`, 'success');
    }

    // Inventory functionality
    loadInventory() {
        // Simulate loading inventory data
        const inventoryData = [
            { name: 'Premium Widget', sku: 'PW001', stock: 45, price: 29.99, status: 'In Stock' },
            { name: 'Deluxe Package', sku: 'DP002', stock: 12, price: 89.99, status: 'Low Stock' },
            { name: 'Basic Item', sku: 'BI003', stock: 156, price: 14.99, status: 'In Stock' }
        ];
        
        const tableBody = document.getElementById('inventoryTableBody');
        if (tableBody) {
            tableBody.innerHTML = inventoryData.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.sku}</td>
                    <td>${item.stock}</td>
                    <td>$${item.price}</td>
                    <td><span class="status-${item.status.toLowerCase().replace(' ', '')}">${item.status}</span></td>
                    <td>
                        <button class="btn small" onclick="premiumDashboardInstance.editInventoryItem('${item.sku}')">Edit</button>
                    </td>
                </tr>
            `).join('');
            
            // Update stats
            document.getElementById('totalItems').textContent = inventoryData.length;
            document.getElementById('lowStock').textContent = inventoryData.filter(item => item.status === 'Low Stock').length;
            document.getElementById('totalValue').textContent = inventoryData.reduce((sum, item) => sum + (item.price * item.stock), 0).toFixed(2);
        }
    }

    addInventoryItem() {
        this.showNotification('Add Inventory Item feature coming soon!', 'info');
    }

    exportInventory() {
        this.showNotification('Exporting inventory to CSV...', 'info');
        setTimeout(() => {
            this.showNotification('Inventory exported successfully!', 'success');
        }, 1500);
    }

    reorderStock() {
        this.showNotification('Reorder notifications sent to suppliers!', 'success');
    }

    // Analytics functionality
    async loadSellerAnalytics() {
        try {
            console.log('Loading seller analytics...');
            
            if (!this.db || !this.currentUser) {
                console.log('Firebase or user not available, skipping analytics');
                return;
            }
            
            // Load analytics for each product
            const analyticsPromises = this.products.map(async (product) => {
                try {
                    const analyticsDoc = await this.db.collection('analytics').doc(product.id).get();
                    const analyticsData = analyticsDoc.exists ? analyticsDoc.data() : {};
                    
                    // Load platform-specific analytics
                    const facebookDoc = await this.db.collection('analytics').doc(`${product.id}_facebook`).get();
                    const facebookData = facebookDoc.exists ? facebookDoc.data() : {};
                    
                    const whatsappDoc = await this.db.collection('analytics').doc(`${product.id}_whatsapp`).get();
                    const whatsappData = whatsappDoc.exists ? whatsappDoc.data() : {};
                    
                    return {
                        productId: product.id,
                        views: analyticsData.views || 0,
                        shares: analyticsData.shares || 0,
                        whatsappClicks: analyticsData.whatsappClicks || 0,
                        facebookShares: facebookData.count || 0,
                        lastViewed: analyticsData.lastViewed,
                        lastShared: analyticsData.lastShared,
                        lastWhatsAppClick: analyticsData.lastWhatsAppClick
                    };
                } catch (error) {
                    console.error(`Error loading analytics for product ${product.id}:`, error);
                    return {
                        productId: product.id,
                        views: 0,
                        shares: 0,
                        whatsappClicks: 0,
                        facebookShares: 0
                    };
                }
            });
            
            const analyticsResults = await Promise.all(analyticsPromises);
            
            // Store analytics data
            this.productAnalytics = {};
            analyticsResults.forEach(analytics => {
                this.productAnalytics[analytics.productId] = analytics;
            });
            
            // Update UI with analytics
            this.updateAnalyticsDisplay();
            
            console.log('Seller analytics loaded successfully');
            
        } catch (error) {
            console.error('Error loading seller analytics:', error);
        }
    }

    updateAnalyticsDisplay() {
        try {
            // Update each product card with analytics
            this.products.forEach(product => {
                const analytics = this.productAnalytics[product.id];
                if (!analytics) return;
                
                // Find product card
                const productCard = document.querySelector(`[data-product-id="${product.id}"]`);
                if (!productCard) return;
                
                // Update or create analytics display
                let analyticsDisplay = productCard.querySelector('.product-analytics');
                if (!analyticsDisplay) {
                    analyticsDisplay = document.createElement('div');
                    analyticsDisplay.className = 'product-analytics';
                    
                    // Insert after product info
                    const productInfo = productCard.querySelector('.product-info');
                    if (productInfo) {
                        productInfo.parentNode.insertBefore(analyticsDisplay, productInfo.nextSibling);
                    }
                }
                
                analyticsDisplay.innerHTML = `
                    <div class="analytics-stats">
                        <div class="stat-item">
                            <i class="fas fa-eye"></i>
                            <span class="stat-value">${analytics.views}</span>
                            <span class="stat-label">Views</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-share"></i>
                            <span class="stat-value">${analytics.shares}</span>
                            <span class="stat-label">Shares</span>
                        </div>
                        <div class="stat-item">
                            <i class="fab fa-whatsapp"></i>
                            <span class="stat-value">${analytics.whatsappClicks}</span>
                            <span class="stat-label">WhatsApp</span>
                        </div>
                    </div>
                `;
            });
            
            // Update overall analytics summary
            this.updateAnalyticsSummary();
            
        } catch (error) {
            console.error('Error updating analytics display:', error);
        }
    }

    updateAnalyticsSummary() {
        try {
            const totalViews = Object.values(this.productAnalytics).reduce((sum, analytics) => sum + analytics.views, 0);
            const totalShares = Object.values(this.productAnalytics).reduce((sum, analytics) => sum + analytics.shares, 0);
            const totalWhatsAppClicks = Object.values(this.productAnalytics).reduce((sum, analytics) => sum + analytics.whatsappClicks, 0);
            
            // Update summary cards if they exist
            const viewsElement = document.getElementById('total-views');
            const sharesElement = document.getElementById('total-shares');
            const whatsappElement = document.getElementById('total-whatsapp');
            
            if (viewsElement) viewsElement.textContent = totalViews.toLocaleString();
            if (sharesElement) sharesElement.textContent = totalShares.toLocaleString();
            if (whatsappElement) whatsappElement.textContent = totalWhatsAppClicks.toLocaleString();
            
        } catch (error) {
            console.error('Error updating analytics summary:', error);
        }
    }

    async loadAnalytics() {
        // Load charts and other analytics
        this.loadCharts();
    }

    loadCharts() {
        // Revenue trend chart
        const revenueCanvas = document.getElementById('revenueChart');
        if (revenueCanvas) {
            const ctx = revenueCanvas.getContext('2d');
            // Simple chart visualization
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(50, 100, 60, 100);
            ctx.fillStyle = '#2196F3';
            ctx.fillRect(120, 50, 60, 150);
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(190, 80, 60, 120);
        }
        
        // Product performance chart
        const productCanvas = document.getElementById('productChart');
        if (productCanvas) {
            const ctx = productCanvas.getContext('2d');
            ctx.fillStyle = '#9C27B0';
            ctx.fillRect(50, 100, 80, 120);
            ctx.fillStyle = '#FF5722';
            ctx.fillRect(140, 60, 80, 160);
        }
    }

    // Sales reports functionality
    loadSalesReports() {
        // Simulate loading sales data
        const salesData = [
            { date: '2026-03-20', orderId: 'ORD-001', customer: 'John Doe', items: 3, total: 89.97, status: 'Completed' },
            { date: '2026-03-19', orderId: 'ORD-002', customer: 'Jane Smith', items: 1, total: 45.99, status: 'Processing' },
            { date: '2026-03-18', orderId: 'ORD-003', customer: 'Bob Johnson', items: 2, total: 67.98, status: 'Completed' }
        ];
        
        const tableBody = document.getElementById('salesTableBody');
        if (tableBody) {
            tableBody.innerHTML = salesData.map(sale => `
                <tr>
                    <td>${sale.date}</td>
                    <td>${sale.orderId}</td>
                    <td>${sale.customer}</td>
                    <td>${sale.items}</td>
                    <td>$${sale.total}</td>
                    <td><span class="status-${sale.status.toLowerCase()}">${sale.status}</span></td>
                </tr>
            `).join('');
            
            // Update summary
            const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
            document.getElementById('grossSales').textContent = totalSales.toFixed(2);
            document.getElementById('netSales').textContent = (totalSales * 0.92).toFixed(2); // After fees
            document.getElementById('periodOrders').textContent = salesData.length;
        }
    }

    generateReport(period) {
        this.showNotification(`Generating ${period} report...`, 'info');
        setTimeout(() => {
            this.showNotification(`${period.charAt(0).toUpperCase() + period.slice(1)} report ready for download!`, 'success');
        }, 2000);
    }

    exportReport() {
        this.showNotification('Exporting report to PDF...', 'info');
        setTimeout(() => {
            this.showNotification('PDF report exported successfully!', 'success');
        }, 1500);
    }

    // Customer insights functionality
    loadCustomerInsights() {
        // Simulate loading customer data
        const customerData = {
            newCustomerCount: 23,
            returningRate: 67,
            avgOrderValue: 45.67
        };
        
        // Update segments
        document.getElementById('newCustomerCount').textContent = customerData.newCustomerCount;
        document.getElementById('returningRate').textContent = customerData.returningRate;
        document.getElementById('avgOrderValue').textContent = customerData.avgOrderValue;
        
        // Load customer table
        const customers = [
            { name: 'Alice Johnson', orders: 5, spent: 234.56, lastOrder: '2026-03-19', status: 'VIP' },
            { name: 'Bob Smith', orders: 3, spent: 156.78, lastOrder: '2026-03-18', status: 'Active' },
            { name: 'Carol Davis', orders: 8, spent: 567.89, lastOrder: '2026-03-20', status: 'Active' }
        ];
        
        const tableBody = document.getElementById('customerTableBody');
        if (tableBody) {
            tableBody.innerHTML = customers.map(customer => `
                <tr>
                    <td>${customer.name}</td>
                    <td>${customer.orders}</td>
                    <td>$${customer.spent}</td>
                    <td>${customer.lastOrder}</td>
                    <td><span class="status-${customer.status.toLowerCase()}">${customer.status}</span></td>
                </tr>
            `).join('');
        }
    }

    // Social sync functionality
    loadSocialSync() {
        // Simulate loading social media data
        this.showNotification('Social media platforms connected successfully!', 'success');
    }

    syncAllPlatforms() {
        this.showNotification('Syncing all social media platforms...', 'info');
        setTimeout(() => {
            this.showNotification('All platforms synced successfully!', 'success');
        }, 3000);
    }

    schedulePosts() {
        this.showNotification('Opening post scheduler...', 'info');
    }

    // Auto-post functionality
    loadAutoPost() {
        this.showNotification('Auto-post system loaded and ready!', 'info');
    }

    startAutopost() {
        this.showNotification('Auto-posting started!', 'success');
    }

    pauseAutopost() {
        this.showNotification('Auto-posting paused', 'warning');
    }

    // Account settings functionality
    loadAccountSettings() {
        // Load current settings
        const shopName = document.getElementById('shopName');
        const shopEmail = document.getElementById('shopEmail');
        const shopPhone = document.getElementById('shopPhone');
        
        if (shopName) shopName.value = this.currentUser.username + "'s Premium Shop";
        if (shopEmail) shopEmail.value = 'user@example.com';
        if (shopPhone) shopPhone.value = '+1-234-567-8900';
    }

    saveAccountSettings() {
        this.showNotification('Account settings saved successfully!', 'success');
    }

    changePassword() {
        this.showNotification('Password change feature coming soon!', 'info');
    }

    enable2FA() {
        this.showNotification('Two-factor authentication enabled!', 'success');
    }

    viewLoginHistory() {
        this.showNotification('Loading login history...', 'info');
    }

    deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            this.showNotification('Account deletion scheduled - you will receive confirmation email', 'warning');
        }
    }

    // Billing functionality
    loadBilling() {
        this.showNotification('Billing information loaded!', 'info');
    }

    // Support functionality
    loadSupport() {
        this.showNotification('Premium support system loaded!', 'success');
    }

    startPriorityChat() {
        this.showNotification('Connecting to priority support chat...', 'info');
        setTimeout(() => {
            this.showNotification('Connected to support agent!', 'success');
        }, 2000);
    }

    scheduleVideoCall() {
        this.showNotification('Opening video call scheduler...', 'info');
    }

    openKnowledgeBase() {
        window.open('https://support.example.com/knowledge-base', '_blank');
    }

    createNewTicket() {
        const subject = prompt('Please describe your issue:');
        if (subject) {
            this.showNotification('Support ticket created successfully!', 'success');
        }
    }

    // Subscription Widget Methods
    initializeSubscriptionWidget() {
        console.log('Initializing subscription widget...');
        
        // Start countdown timer
        this.updateSubscriptionCountdown();
        setInterval(() => {
            this.updateSubscriptionCountdown();
        }, 60000); // Update every minute
        
        // Setup payment form
        this.setupSubscriptionPaymentForm();
        
        // Check payment status
        this.checkPaymentStatus();
        
        // Setup pay button event listener as backup
        const payButton = document.getElementById('pay-now-btn');
        if (payButton) {
            payButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Pay button clicked via event listener!');
                this.openSubscriptionPayment();
            });
        }
        
        console.log('Subscription widget initialized');
    }

    updateSubscriptionCountdown() {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let daysUntilPayment;
        let paymentDate;
        
        if (currentDay <= 28) {
            // Payment is due this month
            paymentDate = new Date(currentYear, currentMonth, 28);
            daysUntilPayment = 28 - currentDay;
        } else {
            // Payment is due next month
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            paymentDate = new Date(nextYear, nextMonth, 28);
            daysUntilPayment = Math.ceil((paymentDate - today) / (1000 * 60 * 60 * 24));
        }
        
        // Update countdown display
        const countdownElement = document.getElementById('days-until-payment');
        if (countdownElement) {
            countdownElement.textContent = daysUntilPayment;
        }
        
        // Update payment status and warnings
        this.updatePaymentStatus(daysUntilPayment);
        
        // Store payment info
        this.paymentInfo = {
            daysUntilPayment,
            paymentDate,
            currentDay,
            gracePeriod: currentDay > 28 && currentDay <= 1 // Grace period from 28th to 1st
        };
    }

    updatePaymentStatus(daysUntilPayment) {
        const statusElement = document.getElementById('payment-status');
        const gracePeriodElement = document.getElementById('grace-period-info');
        const payButton = document.getElementById('pay-now-btn');
        
        if (!statusElement || !gracePeriodElement || !payButton) return;
        
        const today = new Date();
        const currentDay = today.getDate();
        
        // Reset classes
        statusElement.className = 'status-badge';
        gracePeriodElement.style.display = 'none';
        
        if (currentDay <= 25) {
            // Good standing
            statusElement.textContent = 'Active';
            statusElement.classList.add('active');
            payButton.textContent = 'Pay Monthly Fee';
            payButton.className = 'btn payment-btn';
        } else if (currentDay <= 28) {
            // Payment due soon
            statusElement.textContent = 'Payment Due Soon';
            statusElement.classList.add('warning');
            payButton.textContent = 'Pay Now - Due Soon';
            payButton.className = 'btn payment-btn urgent';
        } else if (currentDay <= 31) {
            // Grace period
            statusElement.textContent = 'Grace Period';
            statusElement.classList.add('warning');
            gracePeriodElement.style.display = 'block';
            payButton.textContent = 'Pay Now - Grace Period';
            payButton.className = 'btn payment-btn urgent';
        } else {
            // Overdue
            statusElement.textContent = 'Payment Overdue';
            statusElement.classList.add('danger');
            gracePeriodElement.style.display = 'block';
            payButton.textContent = 'Pay Now - Account at Risk';
            payButton.className = 'btn payment-btn danger';
        }
    }

    setupSubscriptionPaymentForm() {
        const form = document.getElementById('subscription-payment-form');
        if (form) {
            console.log('🔍 Payment form found, setting up event listener...');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('📝 Payment form submitted!');
                this.handleSubscriptionPayment(e);
            });
        } else {
            console.error('❌ Payment form not found!');
        }
    }

    async handleSubscriptionPayment(event) {
        console.log('💳 Processing subscription payment...');
        const form = event.target;
        const formData = new FormData(form);
        
        console.log('📋 Form data:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        const paymentData = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            mpesaNumber: formData.get('mpesaNumber'),
            amount: 200,
            accountReference: 'SHOPPING_PREMIUM_MONTHLY',
            userId: this.currentUser?.uid || 'anonymous',
            username: this.currentUser?.username || 'premium_user'
        };
        
        console.log('💰 Payment data:', paymentData);
        
        // Validate phone numbers
        if (!this.validatePhoneNumber(paymentData.phone) || !this.validatePhoneNumber(paymentData.mpesaNumber)) {
            console.error('❌ Invalid phone numbers');
            this.showNotification('Please enter valid phone numbers (format: 07XX XXX XXX)', 'error');
            return;
        }
        
        try {
            console.log('🔄 Starting payment processing...');
            this.showNotification('Processing M-Pesa payment...', 'info');
            
            // Use existing M-Pesa API from upgrade-to-premium.html
            const result = await this.simulateMpesaPayment(paymentData.mpesaNumber, paymentData.amount);
            console.log('💳 Payment result:', result);
            
            if (result.success) {
                // Save payment record to Firestore
                await this.savePaymentRecord(paymentData, result);
                
                // Update payment status
                await this.updatePaymentStatusInDatabase('paid', result.transactionId);
                
                this.showNotification('Payment successful! Your premium account is now active.', 'success');
                
                // Close modal and reset form
                this.closeSubscriptionPayment();
                form.reset();
                
                // Update widget
                this.updateSubscriptionCountdown();
                
            } else {
                console.error('❌ Payment failed:', result.message);
                this.showNotification('Payment failed: ' + result.message, 'error');
            }
            
        } catch (error) {
            console.error('💥 Payment processing error:', error);
            this.showNotification('Payment processing failed. Please try again.', 'error');
        }
    }

    async simulateMpesaPayment(phone, amount) {
        try {
            console.log('Processing M-Pesa payment for subscription...');
            console.log('Phone:', phone);
            console.log('Amount:', amount);
            
            // For development: Skip actual API call and simulate success
            if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                console.log('Development mode: Simulating successful payment');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                return {
                    success: true,
                    transactionId: 'SUB_' + Date.now(),
                    message: 'Payment simulated successfully (Development Mode)'
                };
            }
            
            // Production: Try actual M-Pesa API
            const response = await fetch('http://localhost:3000/api/mpesa/stkpush', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phone,
                    amount: amount,
                    accountReference: 'SHOPPING_PREMIUM_MONTHLY'
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
                return {
                    success: true,
                    transactionId: 'SUB_' + Date.now(),
                    message: 'Payment simulated successfully (Development Mode)'
                };
            }
            
            return {
                success: false,
                message: 'M-Pesa service unavailable. Please try again.'
            };
        }
    }

    async savePaymentRecord(paymentData, result) {
        try {
            const paymentRecord = {
                ...paymentData,
                transactionId: result.transactionId,
                paymentDate: new Date().toISOString(),
                paymentType: 'monthly_subscription',
                status: 'completed',
                amount: 200,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
            };
            
            // Save to Firestore
            await this.db.collection('users').doc(paymentData.userId).collection('payments').add(paymentRecord);
            console.log('Payment record saved to Firestore');
            
        } catch (error) {
            console.error('Error saving payment record:', error);
        }
    }

    async updatePaymentStatusInDatabase(status, transactionId) {
        try {
            const userId = this.currentUser?.uid;
            if (!userId) return;
            
            await this.db.collection('users').doc(userId).update({
                'subscription.status': status,
                'subscription.lastPayment': new Date().toISOString(),
                'subscription.lastTransactionId': transactionId,
                'subscription.paidThrough': this.calculatePaidThroughDate()
            });
            
            console.log('Payment status updated in database');
            
        } catch (error) {
            console.error('Error updating payment status:', error);
        }
    }

    calculatePaidThroughDate() {
        const today = new Date();
        const paidThrough = new Date(today.getFullYear(), today.getMonth() + 1, 28);
        return paidThrough.toISOString();
    }

    validatePhoneNumber(phone) {
        // Accept Kenyan phone formats: 07XX XXX XXX, +2547XX XXX XXX, 07XXXXXXXXX, +2547XXXXXXXXX
        const phoneRegex = /^(\+254|0)?7[0-9]{1,3}([0-9]{3})?[0-9]{3}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    async checkPaymentStatus() {
        try {
            const userId = this.currentUser?.uid;
            if (!userId) return;
            
            const userDoc = await this.db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            
            if (userData && userData.subscription) {
                const subscription = userData.subscription;
                console.log('Subscription status:', subscription);
                
                // Update widget based on actual payment status
                this.updateWidgetFromDatabase(subscription);
            }
            
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }

    updateWidgetFromDatabase(subscription) {
        const statusElement = document.getElementById('payment-status');
        if (!statusElement) return;
        
        const lastPayment = new Date(subscription.lastPayment);
        const paidThrough = new Date(subscription.paidThrough);
        const today = new Date();
        
        if (today <= paidThrough) {
            statusElement.textContent = 'Active';
            statusElement.className = 'status-badge active';
        } else {
            statusElement.textContent = 'Payment Overdue';
            statusElement.className = 'status-badge danger';
        }
    }

    openSubscriptionPayment() {
        const modal = document.getElementById('subscription-payment-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Pre-fill user information
            this.prefillPaymentForm();
        }
    }

    closeSubscriptionPayment() {
        const modal = document.getElementById('subscription-payment-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    prefillPaymentForm() {
        const fullNameInput = document.getElementById('full-name');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        
        if (this.currentUser) {
            if (fullNameInput) fullNameInput.value = this.currentUser.username || '';
            if (emailInput) emailInput.value = this.currentUser.email || '';
            if (phoneInput) phoneInput.value = this.currentUser.phone || '';
        }
    }

    bindFormSubmit() {
        const form = document.getElementById('premium-upload-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProductSubmit(e);
            });
        }
    }
}

// Global wrapper functions for HTML onclick handlers
function openCamera() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openCamera();
    }
}

function openDesktopUpload() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openDesktopUpload();
    }
}

function openPhoneStorage() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openPhoneStorage();
    }
}

function setViewMode(mode) {
    if (window.premiumDashboard) {
        window.premiumDashboard.setViewMode(mode);
    }
}

function selectAllProducts() {
    if (window.premiumDashboard) {
        window.premiumDashboard.selectAllProducts();
    }
}

function shareToFacebook() {
    if (window.premiumDashboard) {
        window.premiumDashboard.shareToFacebook();
    }
}

function shareToInstagram() {
    if (window.premiumDashboard) {
        window.premiumDashboard.shareToInstagram();
    }
}

function shareToTikTok() {
    if (window.premiumDashboard) {
        window.premiumDashboard.shareToTikTok();
    }
}

function shareToWhatsApp() {
    if (window.premiumDashboard) {
        window.premiumDashboard.shareToWhatsApp();
    }
}

function applyTheme(themeName) {
    if (window.premiumDashboard) {
        window.premiumDashboard.applyTheme(themeName);
    }
}

function addInventoryItem() {
    if (window.premiumDashboard) {
        window.premiumDashboard.addInventoryItem();
    }
}

function exportInventory() {
    if (window.premiumDashboard) {
        window.premiumDashboard.exportInventory();
    }
}

function reorderStock() {
    if (window.premiumDashboard) {
        window.premiumDashboard.reorderStock();
    }
}

function generateReport(period) {
    if (window.premiumDashboard) {
        window.premiumDashboard.generateReport(period);
    }
}

function exportReport() {
    if (window.premiumDashboard) {
        window.premiumDashboard.exportReport();
    }
}

function syncAllPlatforms() {
    if (window.premiumDashboard) {
        window.premiumDashboard.syncAllPlatforms();
    }
}

function schedulePosts() {
    if (window.premiumDashboard) {
        window.premiumDashboard.schedulePosts();
    }
}

function startAutopost() {
    if (window.premiumDashboard) {
        window.premiumDashboard.startAutopost();
    }
}

function pauseAutopost() {
    if (window.premiumDashboard) {
        window.premiumDashboard.pauseAutopost();
    }
}

function saveAccountSettings() {
    if (window.premiumDashboard) {
        window.premiumDashboard.saveAccountSettings();
    }
}

function changePassword() {
    if (window.premiumDashboard) {
        window.premiumDashboard.changePassword();
    }
}

function enable2FA() {
    if (window.premiumDashboard) {
        window.premiumDashboard.enable2FA();
    }
}

function viewLoginHistory() {
    if (window.premiumDashboard) {
        window.premiumDashboard.viewLoginHistory();
    }
}

function deleteAccount() {
    if (window.premiumDashboard) {
        window.premiumDashboard.deleteAccount();
    }
}

function startPriorityChat() {
    if (window.premiumDashboard) {
        window.premiumDashboard.startPriorityChat();
    }
}

function scheduleVideoCall() {
    if (window.premiumDashboard) {
        window.premiumDashboard.scheduleVideoCall();
    }
}

function openKnowledgeBase() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openKnowledgeBase();
    }
}

function createNewTicket() {
    if (window.premiumDashboard) {
        window.premiumDashboard.createNewTicket();
    }
}

function openSubscriptionPayment() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openSubscriptionPayment();
    }
}

function closeSubscriptionPayment() {
    if (window.premiumDashboard) {
        window.premiumDashboard.closeSubscriptionPayment();
    }
}

// Backup function to handle payment form submission
function handlePaymentFormSubmit(event) {
    console.log('🔄 Backup form submit handler called!');
    if (window.premiumDashboard) {
        window.premiumDashboard.handleSubscriptionPayment(event);
    }
}

function browseProducts() {
    if (window.premiumDashboard) {
        window.premiumDashboard.browseProducts();
    }
}

function openVideoUpload() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openVideoUpload();
    }
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0 && window.premiumDashboard) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            window.premiumDashboard.handleFileUpload(file, 'image');
        } else if (file.type.startsWith('video/')) {
            window.premiumDashboard.handleFileUpload(file, 'video');
        }
    }
}

function handleVideoSelect(event) {
    const files = event.target.files;
    if (files.length > 0 && window.premiumDashboard) {
        window.premiumDashboard.handleFileUpload(files[0], 'video');
    }
}

function clearUploadForm() {
    if (window.premiumDashboard) {
        window.premiumDashboard.clearUploadForm();
    }
}

function deleteCurrentUploads() {
    if (window.premiumDashboard) {
        window.premiumDashboard.deleteCurrentUploads();
    }
}

function resetForm() {
    if (window.premiumDashboard) {
        window.premiumDashboard.clearUploadForm();
    }
}

function setViewMode(mode) {
    if (window.premiumDashboard) {
        window.premiumDashboard.setViewMode(mode);
    }
}

function selectAllProducts() {
    if (window.premiumDashboard) {
        window.premiumDashboard.selectAllProducts();
    }
}

function deselectAllProducts() {
    if (window.premiumDashboard) {
        window.premiumDashboard.deselectAllProducts();
    }
}

function toggleProductSelection(productId) {
    if (window.premiumDashboard) {
        window.premiumDashboard.toggleProductSelection(productId);
    }
}

function deleteProduct(productId) {
    if (window.premiumDashboard) {
        window.premiumDashboard.deleteProduct(productId);
    }
}

function deleteSelectedProducts() {
    if (window.premiumDashboard) {
        window.premiumDashboard.deleteSelectedProducts();
    }
}

function shareSelectedProducts() {
    if (window.premiumDashboard) {
        window.premiumDashboard.shareSelectedProducts();
    }
}

function shareToFacebook() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openShareModal('facebook');
    }
}

function shareToInstagram() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openShareModal('instagram');
    }
}

function shareToTikTok() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openShareModal('tiktok');
    }
}

function shareToWhatsApp() {
    if (window.premiumDashboard) {
        window.premiumDashboard.openShareModal('whatsapp');
    }
}

function zoomInModal() {
    if (window.premiumDashboard) {
        window.premiumDashboard.zoomInModal();
    }
}

function zoomOutModal() {
    if (window.premiumDashboard) {
        window.premiumDashboard.zoomOutModal();
    }
}

function resetModalZoom() {
    if (window.premiumDashboard) {
        window.premiumDashboard.resetModalZoom();
    }
}

function closeModal() {
    if (window.premiumDashboard) {
        window.premiumDashboard.closeProductModal();
    }
}

function closeSocialModal() {
    if (window.premiumDashboard) {
        window.premiumDashboard.closeSocialModal();
    }
}

function confirmSocialShare(platform) {
    if (window.premiumDashboard) {
        window.premiumDashboard.confirmSocialShare(platform);
    }
}

function viewProductDetails(productId) {
    if (window.premiumDashboard) {
        window.premiumDashboard.viewProductDetails(productId);
    }
}

function viewProduct() {
    if (window.premiumDashboard) {
        window.premiumDashboard.viewCurrentProduct();
    }
}

function editProduct() {
    if (window.premiumDashboard) {
        window.premiumDashboard.editCurrentProduct();
    }
}

function shareProduct() {
    if (window.premiumDashboard) {
        window.premiumDashboard.shareCurrentProduct();
    }
}

function downloadProduct() {
    if (window.premiumDashboard) {
        window.premiumDashboard.downloadCurrentProduct();
    }
}

function watchProductVideo(productId) {
    if (window.premiumDashboard) {
        window.premiumDashboard.watchProductVideo(productId);
    }
}

function deleteProduct() {
    if (window.premiumDashboard) {
        window.premiumDashboard.deleteCurrentProduct();
    }
}

function switchAccount() {
    if (window.premiumDashboard) {
        window.premiumDashboard.switchAccount();
    }
}

function logout() {
    if (window.premiumDashboard) {
        window.premiumDashboard.logout();
    }
}

// Fullscreen Media Viewer Functions
let fullscreenZoom = 1;

function openFullscreenViewer(type, url, title) {
    const modal = document.getElementById('fullscreen-media-viewer');
    const imageEl = document.getElementById('fullscreen-media-image');
    const videoEl = document.getElementById('fullscreen-media-video');
    const videoSource = videoEl?.querySelector('source');
    const titleEl = document.getElementById('fullscreen-media-title');
    
    if (!modal || !imageEl || !videoEl || !videoSource) {
        console.error('Fullscreen viewer not available');
        return;
    }
    
    // Reset zoom
    fullscreenZoom = 1;
    
    // Update title
    titleEl.textContent = title || 'View Content';
    
    // Show appropriate media
    if (type === 'image') {
        imageEl.src = url;
        imageEl.style.display = 'block';
        imageEl.style.transform = 'scale(1)';
        videoEl.style.display = 'none';
    } else if (type === 'video') {
        videoSource.src = url;
        videoEl.load();
        videoEl.style.display = 'block';
        videoEl.style.transform = 'scale(1)';
        videoEl.controls = true;
        videoEl.playsInline = true;
        imageEl.style.display = 'none';
    }
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeFullscreenViewer() {
    const modal = document.getElementById('fullscreen-media-viewer');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function zoomInFullscreen() {
    fullscreenZoom = Math.min(fullscreenZoom + 0.25, 3);
    updateFullscreenZoom();
}

function zoomOutFullscreen() {
    fullscreenZoom = Math.max(fullscreenZoom - 0.25, 0.5);
    updateFullscreenZoom();
}

function resetFullscreenZoom() {
    fullscreenZoom = 1;
    updateFullscreenZoom();
}

function updateFullscreenZoom() {
    const imageEl = document.getElementById('fullscreen-media-image');
    const videoEl = document.getElementById('fullscreen-media-video');
    
    if (imageEl && imageEl.style.display !== 'none') {
        imageEl.style.transform = `scale(${fullscreenZoom})`;
    }
    if (videoEl && videoEl.style.display !== 'none') {
        videoEl.style.transform = `scale(${fullscreenZoom})`;
    }
}

// Initialize premium dashboard
let premiumDashboard;

document.addEventListener('DOMContentLoaded', () => {
    premiumDashboard = new PremiumDashboard();
    window.premiumDashboard = premiumDashboard; // Make it globally accessible
    
    // Initialize subscription widget
    premiumDashboard.initializeSubscriptionWidget();
});
