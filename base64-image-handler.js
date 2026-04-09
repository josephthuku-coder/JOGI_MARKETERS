// Base64 Image Storage - No Firebase Storage Required
class Base64ImageHandler {
    constructor() {
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
                    <button class="btn primary capture-btn">?? Capture</button>
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

        // Convert to base64
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

    handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        this.handleImageCapture(file);
    }

    async handleImageCapture(file) {
        try {
            // Convert to base64
            const base64 = await this.fileToBase64(file);
            const dataUrl = `data:image/jpeg;base64,${base64}`;
            
            // Store in form
            const hiddenInput = document.getElementById('product-image-url');
            if (hiddenInput) {
                hiddenInput.value = dataUrl;
                this.showNotification('Image uploaded successfully!', 'success');
                this.showImagePreview(dataUrl);
            }
            
        } catch (error) {
            console.error('Error processing image:', error);
            this.showNotification('Failed to process image', 'error');
        }
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

    showImagePreview(dataUrl) {
        const previewContainer = document.getElementById('photo-preview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="image-preview-container">
                    <img src="${dataUrl}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                    <div class="preview-actions">
                        <button class="btn danger remove-image-btn">?? Remove</button>
                        <button class="btn primary use-image-btn">?? Image Ready</button>
                    </div>
                </div>
            `;
            
            // Setup preview buttons
            previewContainer.querySelector('.remove-image-btn').addEventListener('click', () => {
                this.removeImage();
            });
            
            previewContainer.querySelector('.use-image-btn').addEventListener('click', () => {
                this.showNotification('Image ready for upload!', 'success');
            });
        }
    }

    removeImage() {
        const previewContainer = document.getElementById('photo-preview');
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
}

// Initialize base64 image handler
document.addEventListener('DOMContentLoaded', () => {
    window.base64ImageHandler = new Base64ImageHandler();
});
