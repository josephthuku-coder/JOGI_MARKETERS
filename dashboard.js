// Dashboard JavaScript - Shopping Online
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.selectedProducts = new Set();
        this.maxProducts = 5; // Free account limit
        this.isPremiumAccount = window.location.pathname.includes('premium-dashboard.html');
        this.accountType = this.isPremiumAccount ? 'premium' : 'free';
        this.db = null; // Initialize db property
        this.currentZoom = 1;
        this.init();
    }

    async init() {
        // Wait for Firebase to be initialized
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            this.db = firebase.firestore();
        } else {
            console.error('Firebase not initialized');
            return;
        }
        
        // Check if user is logged in
        await this.checkAuth();
        
        // Load user's products
        await this.loadProducts();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateUI();
    }

    async checkAuth() {
        const userSession = sessionStorage.getItem('userSession');
        if (!userSession) {
            window.location.href = 'index.html#login';
            return;
        }
        
        this.currentUser = JSON.parse(userSession);
        document.getElementById('shopName').textContent = `${this.currentUser.username}'s Shop`;
    }

    setupEventListeners() {
        // Upload form submission
        document.getElementById('upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductUpload();
        });

        // Image input change event
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileSelect(file);
                }
            });
        }

        // Modal close on background click
        document.getElementById('product-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') {
                this.closeModal();
            }
        });
    }

    switchAccount() {
        this.currentUser.accountType = 'premium';
        sessionStorage.setItem('userSession', JSON.stringify(this.currentUser));
        this.showNotification('Switching to Premium Shop...', 'info');
        setTimeout(() => window.location.href = 'premium-dashboard.html', 1000);
    }

    switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Refresh shop view when switching to shop tab
        if (tabName === 'shop') {
            this.renderProducts();
        }
    }

    // Upload functionality
    async openCamera() {
        try {
            console.log('🎥 Attempting to open camera...');
            
            // Check if mediaDevices is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showNotification('Camera not supported on this device', 'error');
                this.openFileInput('image/*');
                return;
            }
            
            // Request camera permissions first
            console.log('📋 Requesting camera permissions...');
            
            // Try to get user media directly (this will trigger permission prompt)
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 }
                } 
            });
            
            console.log('📸 Camera access granted!');
            
            // Stop the initial stream (we'll create a new one in modal)
            stream.getTracks().forEach(track => track.stop());
            
            // Create camera modal
            const cameraModal = this.createCameraModal();
            document.body.appendChild(cameraModal);
            cameraModal.style.display = 'block';
            
            // Start camera in modal
            await this.startCameraInModal(cameraModal);
            
        } catch (error) {
            console.error('🚫 Camera access error:', error);
            
            if (error.name === 'NotAllowedError') {
                this.showNotification('Camera permission denied. Please allow camera access and try again.', 'error');
            } else if (error.name === 'NotFoundError') {
                this.showNotification('No camera device found. Please check your camera.', 'error');
            } else if (error.name === 'NotReadableError') {
                this.showNotification('Camera is already in use by another application.', 'error');
            } else {
                this.showNotification('Camera access failed: ' + error.message, 'error');
            }
            
            // Fallback to file input
            this.openFileInput('image/*');
        }
    }

    async startCameraInModal(modal) {
        try {
            const video = modal.querySelector('#camera-video');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 }
                } 
            });
            
            video.srcObject = stream;
            
            // Setup capture button
            modal.querySelector('.capture-btn').addEventListener('click', () => {
                this.capturePhoto(stream, modal);
            });
            
        } catch (error) {
            console.error('Error starting camera in modal:', error);
            this.showNotification('Failed to start camera', 'error');
            modal.remove();
        }
    }

    createCameraModal() {
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
    openDesktopUpload() {
        this.openFileInput('image/*');
    }

    // Phone storage access
    openPhoneStorage() {
        this.openFileInput('image/*');
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

    // Browse products functionality
    browseProducts() {
        console.log('🌐 Opening Chrome browser...');
        
        // Open normal Chrome
        const chromeUrl = 'https://www.google.com/';
        
        try {
            // Try to open Chrome
            const opened = window.open(chromeUrl, '_blank', 'noopener,noreferrer,width=1200,height=800');
            
            if (!opened || opened.closed || typeof opened.closed === 'undefined') {
                // If popup blocked, try direct navigation
                window.location.href = chromeUrl;
            } else {
                // Focus the opened window
                opened.focus();
            }
            
            this.showNotification('🌐 Opened Chrome browser. Take screenshots of products to upload!', 'info');
            
            // Show screenshot instructions
            setTimeout(() => {
                this.showScreenshotInstructions();
            }, 2000);
            
        } catch (error) {
            console.error('Error opening Chrome:', error);
            // Fallback to direct navigation
            window.location.href = chromeUrl;
        }
    }

    showScreenshotInstructions() {
        const instructionsModal = document.createElement('div');
        instructionsModal.className = 'modal';
        instructionsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📸 How to Upload Products from Chrome</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="instructions">
                        <h4>📋 Step-by-Step Guide:</h4>
                        <ol>
                            <li><strong>Open Chrome</strong> (already opened for you)</li>
                            <li><strong>Search</strong> for any product (shoes, clothes, etc.)</li>
                            <li><strong>Take Screenshot</strong> of the product image:
                                <ul>
                                    <li>Windows: <strong>Win + Shift + S</strong></li>
                                    <li>Mac: <strong>Cmd + Shift + 4</strong></li>
                                    <li>Phone: <strong>Power + Volume Down</strong></li>
                                </ul>
                            </li>
                            <li><strong>Come back</strong> to this dashboard</li>
                            <li><strong>Click "Phone Storage"</strong> to upload screenshot</li>
                            <li><strong>Fill details</strong> (name, price, description)</li>
                            <li><strong>Upload</strong> to your shop</li>
                        </ol>
                        
                        <div class="tips">
                            <h4>💡 Pro Tips:</h4>
                            <ul>
                                <li>Crop screenshots to show only the product</li>
                                <li>Note the price from the original listing</li>
                                <li>Copy the product description for reference</li>
                                <li>Use high-quality screenshots for best results</li>
                            </ul>
                        </div>
                        
                        <div class="quick-actions">
                            <h4>🚀 Quick Actions:</h4>
                            <button class="btn primary" onclick="dashboardManager.startScreenshotUpload()">
                                <i class="fas fa-camera"></i> Start Screenshot Upload
                            </button>
                            <button class="btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(instructionsModal);
        instructionsModal.style.display = 'block';
    }

    startScreenshotUpload() {
        // Close instructions modal
        document.querySelector('.modal').remove();
        
        // Open phone storage (for screenshots)
        this.openPhoneStorage();
        
        this.showNotification('📱 Select your screenshot from phone storage or desktop', 'info');
    }

    
    handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        this.handleImageCapture(file);
    }

    handleImageCapture(file) {
        // Create preview
        const previewContainer = document.getElementById('photo-preview');
        if (previewContainer) {
            const imageUrl = URL.createObjectURL(file);
            previewContainer.innerHTML = `
                <div class="image-preview-container">
                    <img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                    <div class="preview-actions">
                        <button class="btn danger remove-image-btn">?? Remove</button>
                        <button class="btn primary use-image-btn">? Use This Image</button>
                    </div>
                </div>
            `;
            
            // Setup preview buttons
            previewContainer.querySelector('.remove-image-btn').addEventListener('click', () => {
                this.removeImage();
            });
            
            previewContainer.querySelector('.use-image-btn').addEventListener('click', () => {
                this.uploadImage(file);
            });
        }
        
        this.showNotification('Image selected successfully!', 'success');
    }

    removeImage() {
        const previewContainer = document.getElementById('photo-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        // Clear hidden input
        const hiddenInput = document.getElementById('imageUrl');
        if (hiddenInput) {
            hiddenInput.value = '';
        }
        
        this.showNotification('Image removed', 'info');
    }

    async uploadImage(file) {
        const cloudName = "dlf22fpmd";
        const uploadPreset = "shop_upload";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        try {
            // Show upload status
            const statusDiv = document.getElementById('upload-status');
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading to Cloudinary...';
            }

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await res.json();

            if (data.secure_url) {
                // Save URL to hidden input
                const hiddenInput = document.getElementById('imageUrl');
                if (hiddenInput) {
                    hiddenInput.value = data.secure_url;
                }

                // Hide upload status
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                }

                this.showNotification('Image uploaded successfully!', 'success');
                console.log("Upload success:", data.secure_url);
                return data.secure_url;
            } else {
                throw new Error("Upload failed");
            }

        } catch (error) {
            console.error("Upload error:", error);
            
            // Hide upload status
            const statusDiv = document.getElementById('upload-status');
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
            
            this.showNotification('Image upload failed: ' + error.message, 'error');
        }
    }

    async loadProducts() {
        try {
            // Simple query without complex ordering to avoid index requirement
            const snapshot = await this.db.collection('products')
                .where('userId', '==', this.currentUser.userId)
                .where('accountType', '==', this.accountType) // 🔥 KEY: Separate by account type
                .where('status', '==', 'active')
                .get();

            // Sort client-side instead of server-side
            this.products = snapshot.docs
                .map(doc => ({ ...doc.data(), id: doc.id }))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            this.updateUI();
            this.updateProductCount(); // 🔥 Update product count display
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Failed to load products', 'error');
        }
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');
        const emptyState = document.getElementById('empty-shop');

        if (this.products.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            grid.style.display = 'grid';
            emptyState.style.display = 'none';

            grid.innerHTML = this.products.map(product => `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-checkbox-container">
                        <input type="checkbox" class="product-checkbox" data-product-id="${product.id}" 
                               onchange="dashboardManager.toggleProductSelection('${product.id}')">
                    </div>
                    <img src="${product.imageUrl || 'placeholder.jpg'}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p class="price">Ksh ${product.price}</p>
                        <p class="description">${product.description}</p>
                    </div>
                    <div class="product-actions">
                        <button class="btn primary" onclick="viewProduct('${product.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn secondary select-btn" onclick="dashboardManager.selectSingleProduct('${product.id}')">
                            <i class="fas fa-check"></i> Select
                        </button>
                        <button class="btn info share-facebook-btn" onclick="dashboardManager.shareSingleProductToFacebook('${product.id}')">
                            <i class="fab fa-facebook"></i> Share
                        </button>
                        <button class="btn danger" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    async handleProductUpload() {
        const nameElement = document.getElementById('product-name');
        const priceElement = document.getElementById('product-price');
        const descriptionElement = document.getElementById('product-description');
        const imageUrlElement = document.getElementById('imageUrl');
        
        // Check if elements exist
        if (!nameElement || !priceElement || !descriptionElement || !imageUrlElement) {
            this.showNotification('Form elements not found', 'error');
            return;
        }
        
        const name = nameElement.value;
        const price = parseFloat(priceElement.value);
        const description = descriptionElement.value;
        const imageUrl = imageUrlElement.value;
        
        console.log('📝 Form values:');
        console.log('  - Name:', name);
        console.log('  - Price:', price);
        console.log('  - Description:', description);
        console.log('  - Image URL:', imageUrl);

        if (!name || !price || !description) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        if (!imageUrl) {
            console.log('❌ Image URL is empty!');
            console.log('❌ Hidden input element:', !!imageUrlElement);
            console.log('❌ Hidden input value:', imageUrlElement.value);
            console.log('❌ Hidden input value length:', imageUrlElement.value.length);
            this.showNotification('Please upload a product image', 'error');
            return;
        } else {
            console.log('✅ Image URL found:', imageUrl.substring(0, 50) + '...');
            console.log('✅ Image URL length:', imageUrl.length);
        }

        const newProduct = {
            name: name,
            price: price,
            description: description,
            imageUrl: imageUrl, // Cloudinary URL is already optimized
            userId: this.currentUser.userId,
            shopId: this.currentUser.userId,
            accountType: this.accountType, // 🔥 KEY: Include account type
            timestamp: new Date().toISOString(),
            status: 'active'
        };

        console.log('🚀 Uploading product:', newProduct);
        console.log('📊 Current user:', this.currentUser);
        console.log('🔗 Database reference:', this.db);
        console.log('👤 User ID being used:', this.currentUser.userId);
        console.log('🔍 Shop ID should be:', this.currentUser.userId);

        // Show saving notification
        this.showNotification('Saving product to database...', 'info');

        try {
            console.log('🚀 Starting Firebase save...');
            const docRef = await this.db.collection('products').add(newProduct);
            console.log('✅ Product saved with ID:', docRef.id);
            console.log('🎉 UPLOAD COMPLETE! Product ID:', docRef.id);
            console.log('🔍 Check Firebase console for product:', docRef.id);

            this.showNotification('Product uploaded successfully! ID: ' + docRef.id, 'success');
            this.clearForm();
            
            // Wait a moment before loading products to ensure Firebase updates
            setTimeout(async () => {
                console.log('🔄 Reloading products...');
                await this.loadProducts();
                console.log('✅ Products reloaded');
                // Also refresh the shop page if it's open
                if (window.location.href.includes('shop.html')) {
                    console.log('🔄 Refreshing shop page...');
                    window.location.reload();
                } else {
                    console.log('🛍️ Opening shop page to verify product...');
                    window.open('shop.html', '_blank');
                }
            }, 2000);

        } catch (error) {
            console.error('❌ FIREBASE SAVE FAILED!');
            console.error('❌ Error details:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ Product data being saved:', newProduct);
            
            this.showNotification('Upload failed: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateUI() {
        // Update product count display
        const productCount = this.products.length;
        const remainingSlots = this.maxProducts - productCount;

        // Update upload limit message
        const limitElement = document.querySelector('.upload-limit');
        if (limitElement) {
            limitElement.textContent = `Free Account: ${productCount}/${this.maxProducts} products used (${remainingSlots} slots remaining)`;
        }

        // Render products if on shop tab
        if (document.getElementById('shop-tab').classList.contains('active')) {
            this.renderProducts();
        }
    }

    clearForm() {
        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-description').value = '';
        document.getElementById('imageUrl').value = '';
        document.getElementById('photo-preview').innerHTML = '';
        this.showNotification('Form cleared', 'info');
    }

    async logout() {
        sessionStorage.removeItem('userSession');
        window.location.href = 'index.html';
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            await this.db.collection('products').doc(productId).delete();
            this.showNotification('Product deleted successfully', 'success');
            await this.loadProducts();
            this.updateUI();
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showNotification('Failed to delete product', 'error');
        }
    }

    viewProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            this.showProductImageViewer(product);
        } else {
            this.showNotification('Product not found', 'error');
        }
    }

    showProductImageViewer(product) {
        // Create image viewer modal
        const viewerModal = document.createElement('div');
        viewerModal.className = 'modal';
        viewerModal.innerHTML = `
            <div class="modal-content full-image-modal">
                <div class="modal-header">
                    <h3>${product.name} - Ksh ${product.price}</h3>
                    <button class="close-btn" onclick="dashboardManager.closeProductViewer()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="image-viewer-container">
                        <div class="zoom-controls">
                            <button class="zoom-btn back-btn" onclick="closeProductViewer()">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                            <button class="zoom-btn" onclick="dashboardManager.zoomIn()">
                                <i class="fas fa-search-plus"></i> Zoom In
                            </button>
                            <button class="zoom-btn" onclick="dashboardManager.zoomOut()">
                                <i class="fas fa-search-minus"></i> Zoom Out
                            </button>
                            <button class="zoom-btn" onclick="dashboardManager.resetZoom()">
                                <i class="fas fa-compress"></i> Reset
                            </button>
                            <button class="zoom-btn" onclick="dashboardManager.toggleFullscreen()">
                                <i class="fas fa-expand"></i> Fullscreen
                            </button>
                        </div>
                        <div class="image-viewport" id="dashboard-image-viewport">
                            <img id="dashboard-viewer-image" src="${product.imageUrl}" alt="${product.name}" style="transform: scale(1);">
                        </div>
                        <div class="product-info-overlay">
                            <h4>${product.name}</h4>
                            <p class="price">Ksh ${product.price}</p>
                            <p class="description">${product.description}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(viewerModal);
        viewerModal.style.display = 'block';
        
        // Initialize zoom
        this.currentZoom = 1;
        this.setupDashboardImageDrag();
    }

    closeProductViewer() {
        const modal = document.querySelector('.full-image-modal')?.closest('.modal');
        if (modal) {
            modal.remove();
        }
        this.currentZoom = 1;
    }

    zoomIn() {
        this.currentZoom = Math.min(this.currentZoom + 0.25, 5);
        this.updateDashboardImageZoom();
    }

    zoomOut() {
        this.currentZoom = Math.max(this.currentZoom - 0.25, 0.5);
        this.updateDashboardImageZoom();
    }

    resetZoom() {
        this.currentZoom = 1;
        this.updateDashboardImageZoom();
    }

    updateDashboardImageZoom() {
        const viewerImage = document.getElementById('dashboard-viewer-image');
        if (viewerImage) {
            viewerImage.style.transform = `scale(${this.currentZoom})`;
        }
    }

    toggleFullscreen() {
        const modal = document.querySelector('.full-image-modal');
        if (modal) {
            if (!document.fullscreenElement) {
                modal.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    }

    setupDashboardImageDrag() {
        const viewport = document.getElementById('dashboard-image-viewport');
        const viewerImage = document.getElementById('dashboard-viewer-image');
        if (!viewport) return;

        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

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
    }

    // Bulk Selection Methods
    selectAllProducts() {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
            const productId = checkbox.dataset.productId;
            if (!allChecked) {
                this.selectedProducts.add(productId);
            } else {
                this.selectedProducts.delete(productId);
            }
        });
        
        this.updateBulkSelectionUI();
    }

    toggleProductSelection(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
        } else {
            this.selectedProducts.add(productId);
        }
        this.updateBulkSelectionUI();
    }

    updateBulkSelectionUI() {
        const selectAllBtn = document.querySelector('button[onclick="selectAllProducts()"]');
        const checkboxes = document.querySelectorAll('.product-checkbox');
        const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        
        if (selectAllBtn) {
            selectAllBtn.innerHTML = allChecked ? 
                '<i class="fas fa-check-square"></i> Deselect All' : 
                '<i class="fas fa-check-square"></i> Select All';
        }
        
        // Update share button state
        const shareBtn = document.querySelector('button[onclick="shareSelectedToFacebook()"]');
        if (shareBtn) {
            shareBtn.disabled = this.selectedProducts.size === 0;
            shareBtn.innerHTML = `<i class="fab fa-facebook"></i> Share Selected (${this.selectedProducts.size})`;
        }
    }

    shareSelectedToFacebook() {
        if (this.selectedProducts.size === 0) {
            this.showNotification('Please select at least one product to share', 'error');
            return;
        }

        const selectedProductsData = this.products.filter(p => this.selectedProducts.has(p.id));
        
        if (selectedProductsData.length === 1) {
            // Share single product
            const product = selectedProductsData[0];
            const shareUrl = `${window.location.origin}/shop.html?shop=${this.currentUser.userId}&product=${product.id}`;
            const shareText = `Check out this amazing product: ${product.name} for only Ksh ${product.price}!`;
            
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
            window.open(facebookUrl, '_blank', 'width=600,height=400');
        } else {
            // Share multiple products
            const shopUrl = `${window.location.origin}/shop.html?shop=${this.currentUser.userId}`;
            const productNames = selectedProductsData.map(p => p.name).join(', ');
            const shareText = `Check out these amazing products from my shop: ${productNames} and many more!`;
            
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopUrl)}&quote=${encodeURIComponent(shareText)}`;
            window.open(facebookUrl, '_blank', 'width=600,height=400');
        }

        this.showNotification(`Shared ${selectedProductsData.length} product(s) to Facebook`, 'success');
        
        // Track sharing
        this.trackBulkShare(selectedProductsData.map(p => p.id));
    }

    async trackBulkShare(productIds) {
        for (const productId of productIds) {
            const shareRecord = {
                productId: productId,
                platform: 'facebook',
                timestamp: new Date().toISOString(),
                shopId: this.currentUser.userId,
                source: 'dashboard_bulk_share'
            };
            
            await this.db.collection('shares').add(shareRecord);
        }
    }

    // Single Product Selection and Sharing Methods
    selectSingleProduct(productId) {
        // Clear all other selections first
        this.selectedProducts.clear();
        
        // Add the selected product
        this.selectedProducts.add(productId);
        
        // Update all checkboxes to reflect single selection
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checkbox.dataset.productId === productId;
        });
        
        this.updateBulkSelectionUI();
        
        this.showNotification(`Selected: ${this.products.find(p => p.id === productId)?.name}`, 'info');
    }

    shareSingleProductToFacebook(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            this.showNotification('Product not found', 'error');
            return;
        }

        const shareUrl = `${window.location.origin}/shop.html?shop=${this.currentUser.userId}&product=${product.id}`;
        const shareText = `Check out this amazing product: ${product.name} for only Ksh ${product.price}!`;
        
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');

        this.showNotification(`Shared "${product.name}" to Facebook`, 'success');
        
        // Track the share
        this.trackSingleShare(productId);
    }

    async trackSingleShare(productId) {
        const shareRecord = {
            productId: productId,
            platform: 'facebook',
            timestamp: new Date().toISOString(),
            shopId: this.currentUser.userId,
            source: 'dashboard_single_share'
        };
        
        await this.db.collection('shares').add(shareRecord);
    }

    updateProductCount() {
        const productCountElement = document.getElementById('productCount');
        if (productCountElement) {
            productCountElement.textContent = this.products.length;
        }
        
        // Show warning if approaching limit (only for free accounts)
        if (!this.isPremiumAccount && this.products.length >= 4) {
            this.showNotification(`⚠️ You have ${this.products.length}/5 products. Upgrade to Premium for unlimited products!`, 'warning');
        }
    }

    upgradeToPremium() {
        // Show upgrade confirmation
        const confirmUpgrade = confirm('🚀 Upgrade to Premium for:\n\n✅ Unlimited Products\n✅ Priority Support\n✅ Advanced Analytics\n✅ Custom Themes\n\nContinue to upgrade?');
        
        if (confirmUpgrade) {
            // In a real app, this would redirect to payment page
            this.showNotification('🎉 Redirecting to Premium upgrade...', 'success');
            setTimeout(() => {
                window.location.href = 'premium-dashboard.html';
            }, 2000);
        }
    }
}

// Global functions for HTML onclick handlers
function switchTab(tabName) {
    dashboardManager.switchTab(tabName);
}

function closeModal() {
    dashboardManager.closeModal();
}

function logout() {
    dashboardManager.logout();
}

function clearForm() {
    dashboardManager.clearForm();
}

function openDesktopUpload() {
    if (window.dashboardManager) {
        window.dashboardManager.openDesktopUpload();
    }
}

function openCamera() {
    if (window.dashboardManager) {
        window.dashboardManager.openCamera();
    }
}

function deleteProduct(productId) {
    if (window.dashboardManager) {
        window.dashboardManager.deleteProduct(productId);
    }
}

function viewProduct(productId) {
    if (window.dashboardManager) {
        window.dashboardManager.viewProduct(productId);
    }
}

function selectAllProducts() {
    if (window.dashboardManager) {
        window.dashboardManager.selectAllProducts();
    }
}

function shareSelectedToFacebook() {
    if (window.dashboardManager) {
        window.dashboardManager.shareSelectedToFacebook();
    }
}

function forceBase64Upload() {
    if (window.dashboardManager) {
        window.dashboardManager.forceBase64Upload();
    }
}

function shareSelectedToTwitter() {
    console.log('🐦 Twitter share feature coming soon!');
    // TODO: Implement Twitter sharing functionality
    alert('Twitter sharing will be available in the next update!');
}

function shareSelectedToWhatsApp() {
    console.log('💚 WhatsApp share feature coming soon!');
    // TODO: Implement WhatsApp sharing functionality
    alert('WhatsApp sharing will be available in the next update!');
}

function startScreenshotUpload() {
    dashboardManager.startScreenshotUpload();
}

function openPhoneStorage() {
    dashboardManager.openPhoneStorage();
}

function browseProducts() {
    dashboardManager.browseProducts();
}

function handleFormSubmit(event) {
    event.preventDefault();
    dashboardManager.handleProductUpload();
}

function upgradeToPremium() {
    if (window.dashboardManager) {
        window.dashboardManager.upgradeToPremium();
    }
}

function switchAccount() {
    if (window.dashboardManager) {
        window.dashboardManager.switchAccount();
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        dashboardManager.handleFileSelect(file);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Add notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    }
    
    .notification.success {
        border-left: 4px solid #28a745;
    }
    
    .notification.error {
        border-left: 4px solid #dc3545;
    }
    
    .notification.info {
        border-left: 4px solid #17a2b8;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
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
        display: flex;
        justify-content: space-between;
        align-items: center;
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
        position: relative;
    }
    
    .zoom-controls {
        background: #2a2a2a;
        padding: 10px;
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
        border-bottom: 1px solid #3a3a3a;
        position: relative;
        z-index: 10;
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
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .zoom-btn:hover {
        background: #4a4a4a;
    }
    
    .zoom-btn.back-btn {
        background: #dc3545;
        margin-left: auto;
    }
    
    .zoom-btn.back-btn:hover {
        background: #c82333;
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
    
    #dashboard-viewer-image {
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
    
    .product-info-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0,0,0,0.8));
        color: white;
        padding: 20px;
        transform: translateY(100%);
        transition: transform 0.3s ease;
    }
    
    .image-viewport:hover .product-info-overlay {
        transform: translateY(0);
    }
    
    .product-info-overlay h4 {
        margin: 0 0 10px 0;
        font-size: 18px;
    }
    
    .product-info-overlay .price {
        font-size: 16px;
        font-weight: bold;
        color: #28a745;
        margin: 0 0 8px 0;
    }
    
    .product-info-overlay .description {
        font-size: 14px;
        margin: 0;
        opacity: 0.9;
    }
    
    .product-checkbox-container {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 10;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        padding: 5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .product-checkbox {
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: #007bff;
    }
    
    .product-card {
        position: relative;
    }
    
    .product-card:hover .product-checkbox-container {
        background: rgba(255, 255, 255, 1);
    }
    
    .select-btn {
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.3s;
    }
    
    .select-btn:hover {
        background: #5a6268;
    }
    
    .share-facebook-btn {
        background: #1877f2;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.3s;
    }
    
    .share-facebook-btn:hover {
        background: #166fe5;
    }
    
    .product-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 10px;
    }
    
    .product-actions .btn {
        flex: 1;
        min-width: 60px;
        font-size: 11px;
        padding: 6px 8px;
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
        
        .product-info-overlay {
            padding: 15px;
        }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles + imageViewerStyles;
document.head.appendChild(styleSheet);

// Debug: Verify global functions are available
console.log('🔧 Dashboard script loaded');
console.log('🔧 openDesktopUpload function:', typeof openDesktopUpload);
console.log('🔧 dashboardManager available:', typeof window.dashboardManager);

// Global wrapper function for Back button
function closeProductViewer() {
    if (window.dashboardManager) {
        window.dashboardManager.closeProductViewer();
    }
}
