// SCROLL INDICATOR FUNCTIONALITY
class ScrollIndicator {
    constructor() {
        this.scrollIndicator = document.querySelector('.scroll-indicator');
        this.init();
    }
    
    init() {
        if (!this.scrollIndicator) return;
        
        // Smooth scroll to next section on click
        this.scrollIndicator.addEventListener('click', () => {
            this.scrollToNextSection();
        });
        
        // Hide scroll indicator when user starts scrolling
        this.hideOnScroll();
    }
    
    scrollToNextSection() {
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
    
    hideOnScroll() {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            // Show again when user stops scrolling at top
            scrollTimeout = setTimeout(() => {
                if (window.scrollY < 100) {
                    this.scrollIndicator.style.opacity = '1';
                    this.scrollIndicator.style.pointerEvents = 'auto';
                }
            }, 150);
        });
    }
}

// PRODUCT RAIN SYSTEM - Mobile First
class ProductRain {
    constructor() {
        this.products = [];
        this.rainContainer = null;
        this.isMobile = window.innerWidth < 768;
        this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        this.productCount = this.getProductCount();
        this.init();
    }
    
    getProductCount() {
        if (this.isMobile) return 6;      // Mobile: 6 products
        if (this.isTablet) return 15;     // Tablet: 15 products  
        return 40;                         // Desktop: 40 products
    }
    
    init() {
        console.log("Product Rain init - Mobile First");
        console.log("Device type:", this.isMobile ? "Mobile" : this.isTablet ? "Tablet" : "Desktop");
        console.log("Product count:", this.productCount);
        
        // Create rain container
        this.createRainContainer();
        
        // Load products from Firebase (mock for now)
        this.loadMockProducts();
        
        // Start rain effect
        setTimeout(() => this.startRain(), 1000);
    }
    
    createRainContainer() {
        this.rainContainer = document.createElement('div');
        this.rainContainer.className = 'product-rain-container';
        this.rainContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            overflow: hidden;
        `;
        document.body.appendChild(this.rainContainer);
    }
    
    loadMockProducts() {
        // Mock expensive products - will be replaced with Firebase
        this.products = [
            { name: 'iPhone 15 Pro', price: '$999', image: 'phone', category: 'electronics' },
            { name: 'MacBook Pro', price: '$2499', image: 'laptop', category: 'electronics' },
            { name: 'Rolex Watch', price: '$15000', image: 'watch', category: 'luxury' },
            { name: 'Designer Dress', price: '$899', image: 'dress', category: 'fashion' },
            { name: 'Luxury Sofa', price: '$3200', image: 'furniture', category: 'furniture' },
            { name: 'Samsung TV', price: '$1899', image: 'tv', category: 'electronics' },
            { name: 'Air Jordans', price: '$450', image: 'shoes', category: 'fashion' },
            { name: 'Gucci Bag', price: '$2200', image: 'bag', category: 'luxury' },
            { name: 'iPad Pro', price: '$1099', image: 'tablet', category: 'electronics' },
            { name: 'Diamond Ring', price: '$8500', image: 'jewelry', category: 'luxury' }
        ];
    }
    
    startRain() {
        console.log("Starting product rain");
        
        for (let i = 0; i < this.productCount; i++) {
            setTimeout(() => {
                this.createProduct();
            }, i * 200); // Stagger product creation
        }
        
        // Continue raining
        setInterval(() => {
            if (this.rainContainer.children.length < this.productCount) {
                this.createProduct();
            }
        }, 3000);
    }
    
    createProduct() {
        const product = this.products[Math.floor(Math.random() * this.products.length)];
        const productEl = document.createElement('div');
        productEl.className = 'falling-product';
        productEl.innerHTML = `
            <div class="product-icon">${this.getProductIcon(product.category)}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price}</div>
        `;
        
        // Responsive sizing
        const size = this.isMobile ? 40 : this.isTablet ? 50 : 60;
        const posX = Math.random() * window.innerWidth;
        const duration = 5 + Math.random() * 5;
        const rotation = Math.random() * 360;
        
        productEl.style.cssText = `
            position: absolute;
            left: ${posX}px;
            top: -${size}px;
            width: ${size}px;
            height: ${size}px;
            background: rgba(0, 247, 255, 0.08);
            border: none;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: ${this.isMobile ? '8px' : '10px'};
            color: white;
            font-weight: bold;
            transform: rotate(${rotation}deg);
            animation: fall ${duration}s linear forwards;
            z-index: 1;
            pointer-events: none;
            backdrop-filter: blur(12px);
            opacity: 0.3;
            box-shadow: 0 2px 8px rgba(0, 247, 255, 0.1);
        `;
        
        this.rainContainer.appendChild(productEl);
        
        // Remove product after animation
        setTimeout(() => {
            if (productEl.parentNode) {
                productEl.remove();
            }
        }, duration * 1000);
    }
    
    getProductIcon(category) {
        const icons = {
            electronics: '📱',
            fashion: '👗',
            furniture: '🪑',
            luxury: '💎',
            shoes: '👟',
            jewelry: '💍',
            watch: '⌚',
            bag: '👜',
            dress: '👗',
            phone: '📱',
            laptop: '💻',
            tv: '📺',
            tablet: '📱'
        };
        return icons[category] || '📦';
    }
}
class SmoothScrolling {
    constructor() {
        this.init();
    }
    
    init() {
        // Get all anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// CONTACT FORM HANDLING
class ContactForm {
    constructor() {
        this.form = document.querySelector('.contact-form form');
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });
        
        // Handle email button
        const emailBtn = document.querySelector('.email-btn');
        if (emailBtn) {
            emailBtn.addEventListener('click', () => {
                this.sendEmailWithMessage();
            });
        }
        
        // Handle WhatsApp button
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                this.sendWhatsAppMessage();
            });
        }
    }
    
    handleFormSubmission() {
        const formData = new FormData(this.form);
        const name = this.form.querySelector('input[type="text"]').value;
        const email = this.form.querySelector('input[type="email"]').value;
        const phone = this.form.querySelector('input[type="tel"]').value;
        const message = this.form.querySelector('textarea').value;
        
        // Simple validation
        if (!name || !email || !phone || !message) {
            alert('Please fill in all fields');
            return;
        }
        
        // Show success message
        alert(`Thank you ${name}! Your message has been sent successfully. We'll contact you at ${email} or ${phone} soon.`);
        
        // Send email with message
        this.sendEmailWithMessage();
        
        // Reset form
        this.form.reset();
    }
    
    sendEmailWithMessage() {
        const name = this.form.querySelector('input[type="text"]').value;
        const email = this.form.querySelector('input[type="email"]').value;
        const phone = this.form.querySelector('input[type="tel"]').value;
        const message = this.form.querySelector('textarea').value;
        
        const subject = encodeURIComponent('Contact Request - Shopping Online');
        const body = encodeURIComponent(`Hello Shopping Online Team,\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}\n\nThank you!`);
        
        window.location.href = `mailto:josephgthuku@gmail.com?subject=${subject}&body=${body}`;
    }
    
    sendWhatsAppMessage() {
        const name = this.form.querySelector('input[type="text"]').value;
        const email = this.form.querySelector('input[type="email"]').value;
        const phone = this.form.querySelector('input[type="tel"]').value;
        const message = this.form.querySelector('textarea').value;
        
        // Create WhatsApp message with form data
        const whatsappText = encodeURIComponent(`Hello Shopping Online Team!\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nMessage: ${message}\n\nThank you!`);
        
        // Open WhatsApp with your number and pre-filled message
        window.open(`https://wa.me/254707584594?text=${whatsappText}`, '_blank');
    }
}

// HELP SECTION INTERACTIONS
class HelpSection {
    constructor() {
        this.init();
    }
    
    init() {
        // Handle help buttons
        const liveChatBtn = document.querySelector('.help-buttons .btn.primary');
        const emailSupportBtn = document.querySelector('.help-buttons .btn.secondary');
        const whatsappHelpBtn = document.querySelector('.whatsapp-help-btn');
        
        if (liveChatBtn) {
            liveChatBtn.addEventListener('click', () => {
                alert('Live chat feature coming soon! For now, please call +254 707584594 or email josephgthuku@gmail.com');
            });
        }
        
        if (emailSupportBtn) {
            emailSupportBtn.addEventListener('click', () => {
                const subject = encodeURIComponent('Support Request - Shopping Online');
                const body = encodeURIComponent('Hello Shopping Online Team,\n\nI need help with:\n\n[Please describe your issue here]\n\nThank you!');
                window.location.href = `mailto:josephgthuku@gmail.com?subject=${subject}&body=${body}`;
            });
        }
        
        if (whatsappHelpBtn) {
            whatsappHelpBtn.addEventListener('click', () => {
                const whatsappText = encodeURIComponent('Hello Shopping Online Team!\n\nI need help with:\n\n[Please describe your issue here]\n\nThank you!');
                window.open(`https://wa.me/254707584594?text=${whatsappText}`, '_blank');
            });
        }
    }
    
    // Cleanup method to prevent memory leaks
    destroy() {
        const liveChatBtn = document.querySelector('.help-buttons .btn.primary');
        if (liveChatBtn) {
            liveChatBtn.removeEventListener('click', this.handleLiveChatClick);
        }
        
        const emailSupportBtn = document.querySelector('.help-buttons .btn.secondary');
        if (emailSupportBtn) {
            emailSupportBtn.removeEventListener('click', this.handleEmailSupportClick);
        }
        
        const whatsappHelpBtn = document.querySelector('.whatsapp-help-btn');
        if (whatsappHelpBtn) {
            whatsappHelpBtn.removeEventListener('click', this.handleWhatsAppHelpClick);
        }
    }
}

// HERO TEXT LETTER ANIMATION CONTROLLER
class HeroTextSlider {
    constructor() {
        this.messages = document.querySelectorAll('.hero-text-message');
        this.currentMessage = 0;
        this.init();
    }
    
    init() {
        console.log("HeroTextSlider init - Letter Animation");
        console.log("messages found:", this.messages.length);
        
        if (this.messages.length === 0) {
            console.error("Hero text messages not found!");
            return;
        }
        
        // Start message cycling
        this.startMessageCycling();
    }
    
    startMessageCycling() {
        console.log("Starting message cycling");
        
        // Show first message immediately
        this.showMessage(0);
        
        // Change message every 8 seconds (enough time for letter animation + reading)
        setInterval(() => {
            this.currentMessage = (this.currentMessage + 1) % this.messages.length;
            console.log("Changing to message:", this.currentMessage);
            this.showMessage(this.currentMessage);
        }, 8000);
    }
    
    showMessage(index) {
        console.log("Showing message:", index);
        
        // Hide all messages
        this.messages.forEach((message, i) => {
            if (i === index) {
                message.style.display = 'flex';
                // Reset and restart letter animations
                this.restartLetterAnimation(message);
            } else {
                message.style.display = 'none';
            }
        });
    }
    
    restartLetterAnimation(message) {
        const letters = message.querySelectorAll('.text-letter');
        letters.forEach(letter => {
            // Reset animation
            letter.style.animation = 'none';
            letter.offsetHeight; // Trigger reflow
            // Restore animation
            const isOdd = Array.from(letters).indexOf(letter) % 2 === 0;
            letter.style.animation = isOdd ? 'slideLeft 0.6s forwards' : 'slideRight 0.6s forwards';
        });
    }
}

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScrollIndicator();
    new SmoothScrolling();
    new ContactForm();
    new HelpSection();
    new HeroTextSlider();
    new ProductRain(); // Mobile-First Product Rain
    console.log("Homepage loaded successfully with Firebase and Product Rain!");
});