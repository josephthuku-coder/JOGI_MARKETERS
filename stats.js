// ANIMATED COUNTER FOR STATISTICS
class AnimatedCounter {
    constructor() {
        this.counters = document.querySelectorAll('.stat-number');
        this.animated = false;
        this.init();
    }
    
    init() {
        if (this.counters.length === 0) return;
        
        // Start animation when section comes into view
        this.observeStats();
    }
    
    observeStats() {
        const statsSection = document.querySelector('.stats-section');
        if (!statsSection) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    this.animateCounters();
                    this.animated = true;
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(statsSection);
    }
    
    animateCounters() {
        this.counters.forEach(counter => {
            const target = parseInt(counter.dataset.target);
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString();
                }
            };
            
            updateCounter();
        });
    }
}

// LIVE STATISTICS UPDATES (Firebase Connected)
class LiveStats {
    constructor() {
        this.statsElements = {
            activeShops: document.querySelector('[data-target="234"]'),
            productsListed: document.querySelector('[data-target="1847"]'),
            premiumAccounts: document.querySelector('.premium-count'),
            happyCustomers: document.querySelector('[data-target="89"]'),
            newProducts: document.querySelector('[data-target="15"]')
        };
        
        this.db = null;
        this.init();
    }
    
    async init() {
        // Initialize Firebase
        await this.initFirebase();
        
        // Load real stats from Firebase
        await this.loadRealStats();
        
        // Listen for real-time updates
        this.listenForUpdates();
        
        // Keep some simulated updates for demo
        setInterval(() => this.updateRandomStat(), 15000);
    }
    
    async initFirebase() {
        // Use the global db instance initialized in index.html
        this.db = window.db || window.firebase.firestore();
        console.log('📊 Stats Firebase initialized');
    }
    
    async loadRealStats() {
        try {
            console.log('📊 Loading real statistics from Firebase...');
            
            // Get total users (active shops)
            const usersSnapshot = await this.db.collection('users').get();
            const totalUsers = usersSnapshot.size;
            
            // Get premium users
            const premiumSnapshot = await this.db.collection('users').where('accountType', '==', 'premium').get();
            const premiumCount = premiumSnapshot.size;
            
            // Update stats with real data
            this.updateStat('activeShops', totalUsers);
            this.updateStat('premiumAccounts', premiumCount);
            
            // Update data-target attributes for animation
            if (this.statsElements.activeShops) {
                this.statsElements.activeShops.dataset.target = totalUsers;
            }
            if (this.statsElements.premiumAccounts) {
                this.statsElements.premiumAccounts.dataset.target = premiumCount;
            }
            
            console.log('📊 Real stats loaded:', { totalUsers, premiumCount });
            
        } catch (error) {
            console.error('❌ Error loading real stats:', error);
        }
    }
    
    listenForUpdates() {
        if (!this.db) return;
        
        // Listen for user changes
        this.db.collection('users').onSnapshot((snapshot) => {
            const totalUsers = snapshot.size;
            this.updateStat('activeShops', totalUsers);
            
            // Count premium users
            const premiumCount = snapshot.docs.filter(doc => doc.data().accountType === 'premium').length;
            this.updateStat('premiumAccounts', premiumCount);
            
            console.log('📊 Real-time stats update:', { totalUsers, premiumCount });
        });
    }
    
    updateStat(statName, value) {
        const element = this.statsElements[statName];
        if (!element) return;
        
        const currentValue = parseInt(element.textContent.replace(/,/g, ''));
        
        // Animate the change
        this.animateValue(element, currentValue, value, 800);
        
        // Update data-target for future animations
        element.dataset.target = value;
    }
    
    updateRandomStat() {
        const stats = ['happyCustomers', 'newProducts']; // Only update simulated stats
        const randomStat = stats[Math.floor(Math.random() * stats.length)];
        const element = this.statsElements[randomStat];
        
        if (!element) return;
        
        const currentValue = parseInt(element.textContent.replace(/,/g, ''));
        const change = Math.floor(Math.random() * 3) - 1; // Random change between -1 and 1
        const newValue = Math.max(0, currentValue + change);
        
        // Animate the change
        this.animateValue(element, currentValue, newValue, 500);
    }
    
    animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const updateValue = () => {
            current += increment;
            if ((increment > 0 && current < end) || (increment < 0 && current > end)) {
                element.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateValue);
            } else {
                element.textContent = end.toLocaleString();
            }
        };
        
        updateValue();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnimatedCounter();
    new LiveStats();
});
