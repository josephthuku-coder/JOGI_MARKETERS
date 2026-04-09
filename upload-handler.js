// Upload Handler - Shopping Online
class UploadHandler {
    constructor() {
        this.currentFile = null;
        this.currentImageUrl = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Camera button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('camera-btn')) {
                this.openCamera();
            }
        });

        // Desktop upload button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('desktop-upload-btn')) {
                this.openDesktopUpload();
            }
        });

        // Phone storage button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('phone-storage-btn')) {
                this.openPhoneStorage();
            }
        });

        // Browse products button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('browse-products-btn')) {
                this.browseProducts();
            }
        });
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
            this.currentFile = blob;
            this.currentImageUrl = URL.createObjectURL(blob);
            
            // Close modal
            modal.remove();
            
            // Show preview
            this.showImagePreview();
            
            this.showNotification('Photo captured successfully!', 'success');
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

    handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        this.currentFile = file;
        this.currentImageUrl = URL.createObjectURL(file);
        
        // Show preview
        this.showImagePreview();
        
        this.showNotification('Image selected successfully!', 'success');
    }

    showImagePreview() {
        const previewContainer = document.getElementById('image-preview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="image-preview-container">
                    <img src="${this.currentImageUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
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
                this.useImage();
            });
        }
    }

    removeImage() {
        this.currentFile = null;
        if (this.currentImageUrl) {
            URL.revokeObjectURL(this.currentImageUrl);
            this.currentImageUrl = null;
        }
        
        const previewContainer = document.getElementById('image-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        this.showNotification('Image removed', 'info');
    }

    useImage() {
        if (this.currentFile) {
            this.showNotification('Image ready for upload!', 'success');
            // Trigger upload process
            this.uploadImage();
        }
    }

    async uploadImage() {
        if (!this.currentFile) {
            this.showNotification('No image selected', 'error');
            return;
        }

        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const extension = this.currentFile.name ? this.currentFile.name.split('.').pop() : 'jpg';
            const fileName = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
            
            const storageRef = firebase.storage().ref();
            const imageRef = storageRef.child(`users/${currentUser.uid}/images/${fileName}`);
            
            const snapshot = await imageRef.put(this.currentFile);
            const downloadUrl = await snapshot.ref.getDownloadURL();
            
            await this.saveProductImage(downloadUrl);
            
            this.showNotification('Image uploaded successfully!', 'success');
            
            // Clean up
            this.removeImage();
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed: ' + error.message, 'error');
        }
    }

    async saveProductImage(imageUrl) {
        // This will be called when adding/editing products
        const productId = document.getElementById('product-id')?.value;
        
        if (productId) {
            // Update existing product
            await db.collection('products').doc(productId).update({
                imageUrl: imageUrl,
                lastUpdated: new Date().toISOString()
            });
        } else {
            // New product - store in form
            const hiddenInput = document.getElementById('product-image-url');
            if (hiddenInput) {
                hiddenInput.value = imageUrl;
            }
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
            // Get current user
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                this.showNotification('Please login first', 'error');
                return;
            }

            // Create new product in user's shop
            const newProduct = {
                ...product,
                userId: currentUser.uid,
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
            if (window.shopManager) {
                window.shopManager.loadShopData();
            }

        } catch (error) {
            console.error('Error uploading product:', error);
            this.showNotification('Failed to upload product', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize upload handler
document.addEventListener('DOMContentLoaded', () => {
    window.uploadHandler = new UploadHandler();
});
