// PRODUCT CAROUSEL FUNCTIONALITY
class ProductCarousel {
    constructor() {
        this.currentPosition = 0;
        this.track = document.querySelector('.carousel-track');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.cards = document.querySelectorAll('.product-card');
        
        this.init();
    }
    
    init() {
        if (!this.track) return;
        
        this.prevBtn.addEventListener('click', () => this.moveCarousel(-1));
        this.nextBtn.addEventListener('click', () => this.moveCarousel(1));
        
        // Auto-scroll every 5 seconds
        setInterval(() => this.moveCarousel(1), 5000);
        
        // Add hover pause
        this.track.addEventListener('mouseenter', () => this.isHovered = true);
        this.track.addEventListener('mouseleave', () => this.isHovered = false);
    }
    
    moveCarousel(direction) {
        const cardWidth = 300; // card width + gap
        const maxPosition = -(this.cards.length - 3) * cardWidth; // Show 3 cards at once
        
        this.currentPosition += direction * cardWidth;
        
        // Boundary checks
        if (this.currentPosition > 0) this.currentPosition = 0;
        if (this.currentPosition < maxPosition) this.currentPosition = maxPosition;
        
        this.track.style.transform = `translateX(${this.currentPosition}px)`;
    }
}

// TESTIMONIALS SLIDER
class TestimonialsSlider {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.testimonial-card');
        this.dots = document.querySelectorAll('.dot');
        
        this.init();
    }
    
    init() {
        if (this.slides.length === 0) return;
        
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });
        
        // Auto-advance every 4 seconds
        setInterval(() => this.nextSlide(), 4000);
    }
    
    goToSlide(index) {
        this.slides[this.currentSlide].classList.remove('active');
        this.dots[this.currentSlide].classList.remove('active');
        
        this.currentSlide = index;
        
        this.slides[this.currentSlide].classList.add('active');
        this.dots[this.currentSlide].classList.add('active');
    }
    
    nextSlide() {
        const nextIndex = (this.currentSlide + 1) % this.slides.length;
        this.goToSlide(nextIndex);
    }
}

// CATEGORY INTERACTIONS
class CategoryInteractions {
    constructor() {
        this.categories = document.querySelectorAll('.category-card');
        this.init();
    }
    
    init() {
        this.categories.forEach(category => {
            category.addEventListener('click', () => {
                const categoryName = category.dataset.category;
                this.handleCategoryClick(categoryName);
            });
        });
    }
    
    handleCategoryClick(category) {
        // Define category page mappings
        const categoryPages = {
            'electronics': 'categories/electronics.html',
            'mens-fashion': 'categories/mens-fashion.html',
            'womens-fashion': 'categories/womens-fashion.html',
            'kenyan-food': 'categories/kenyan-food.html',
            'international-food': 'categories/international-food.html',
            'beverages': 'categories/beverages.html',
            'home': 'categories/home.html',
            'sports': 'categories/sports.html',
            'books': 'categories/books.html'
        };
        
        // Get the target page URL
        const targetPage = categoryPages[category];
        
        if (targetPage) {
            // Navigate to the category page
            window.location.href = targetPage;
        } else {
            // Fallback for categories without dedicated pages
            console.log(`Category page for ${category} not found`);
            // Could show a message or redirect to a general shop page
            window.location.href = 'shop.html?category=' + category;
        }
    }
}

// PRODUCT QUICK VIEW
class ProductQuickView {
    constructor() {
        this.quickViewBtns = document.querySelectorAll('.quick-view');
        this.init();
    }
    
    init() {
        this.quickViewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productCard = btn.closest('.product-card');
                const productName = productCard.querySelector('h3').textContent;
                const price = productCard.querySelector('.price').textContent;
                this.showQuickView(productName, price);
            });
        });
    }
    
    showQuickView(productName, price) {
        console.log(`Quick view for ${productName} - ${price}`);
        // Create modal or expand card with more details
        // Could show product images, description, add to cart button
    }
}

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProductCarousel();
    new TestimonialsSlider();
    new CategoryInteractions();
    new ProductQuickView();
});
