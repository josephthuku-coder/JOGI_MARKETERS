// Smart Upload Handler - Tries Firebase Storage first, falls back to base64
class SmartUploadHandler {
    constructor() {
        this.maxRetries = 3;
        this.compressionQuality = 0.7;
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
    }

    async openCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            const cameraModal = this.createCameraModal(stream);
            document.body.appendChild(cameraModal);
            cameraModal.style.display = 'block';
            
        } catch (error) {
            console.error('Camera access error:', error);
            this.showNotification('Camera access denied, using file input', 'warning');
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

        const video = modal.querySelector('#camera-video');
        video.srcObject = stream;

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

        stream.getTracks().forEach(track => track.stop());

        canvas.toBlob((blob) => {
            this.handleImageCapture(blob);
            modal.remove();
        }, 'image/jpeg', this.compressionQuality);
    }

    openDesktopUpload() {
        this.openFileInput('image/*');
    }

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

    async handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        // Show processing status
        this.showNotification('Processing image...', 'info');

        // Compress image first
        const compressedFile = await this.compressImage(file);
        
        try {
            // Try Firebase Storage first
            await this.tryFirebaseUpload(compressedFile);
        } catch (storageError) {
            console.warn('Firebase Storage failed, trying base64 fallback:', storageError);
            
            // Fall back to base64
            await this.tryBase64Upload(compressedFile);
        }
    }

    async compressImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions (max 800px)
                let { width, height } = img;
                const maxSize = 800;
                
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Try different quality levels to get under 500KB
                let quality = this.compressionQuality;
                let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                while (compressedDataUrl.length > 500000 && quality > 0.1) {
                    quality -= 0.1;
                    compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                // Convert back to blob
                fetch(compressedDataUrl)
                    .then(res => res.blob())
                    .then(blob => resolve(blob));
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    async tryFirebaseUpload(file) {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        const fileName = `products/${currentUser.uid}_${Date.now()}.jpg`;
        const storageRef = firebase.storage().ref().child(fileName);
        
        // Try upload with timeout
        const uploadPromise = storageRef.put(file);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout')), 10000)
        );

        const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
        const downloadUrl = await snapshot.ref.getDownloadURL();
        
        // Store Firebase URL in form
        const hiddenInput = document.getElementById('product-image-url');
        if (hiddenInput) {
            hiddenInput.value = downloadUrl;
        }
        
        this.showNotification('✅ Image uploaded to Firebase Storage!', 'success');
        this.showImagePreview(downloadUrl);
        
        return downloadUrl;
    }

    async tryBase64Upload(file) {
        const base64 = await this.fileToBase64(file);
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        
        // Store base64 in form
        const hiddenInput = document.getElementById('product-image-url');
        if (hiddenInput) {
            hiddenInput.value = dataUrl;
        }
        
        this.showNotification('📦 Using base64 storage (Firebase blocked)', 'warning');
        this.showImagePreview(dataUrl);
        
        return dataUrl;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showImagePreview(imageUrl) {
        const previewContainer = document.getElementById('photo-preview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="image-preview-container">
                    <img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                    <div class="preview-actions">
                        <button class="btn danger remove-image-btn">🗑️ Remove</button>
                        <button class="btn primary use-image-btn">✓ Image Ready</button>
                    </div>
                    <div class="storage-info">
                        <small style="color: #666;">
                            ${imageUrl.startsWith('data:') ? '📦 Base64 storage (Firebase blocked)' : '☁️ Firebase Storage'}
                        </small>
                    </div>
                </div>
            `;
            
            // Setup preview buttons
            previewContainer.querySelector('.remove-image-btn').addEventListener('click', () => {
                this.removeImage();
            });
            
            previewContainer.querySelector('.use-image-btn').addEventListener('click', () => {
                this.showNotification('Image ready for product upload!', 'success');
            });
        }
    }

    removeImage() {
        const previewContainer = document.getElementById('photo-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        const hiddenInput = document.getElementById('product-image-url');
        if (hiddenInput) {
            hiddenInput.value = '';
        }
        
        this.showNotification('Image removed', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
}

// Initialize smart upload handler
document.addEventListener('DOMContentLoaded', () => {
    window.smartUploadHandler = new SmartUploadHandler();
});
