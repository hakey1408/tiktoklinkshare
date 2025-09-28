/**
 * Localization Manager for TikTok Link Cleaner
 * Handles language detection, loading, and text replacement
 */

class LocalizationManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackLanguage = 'en';
        this.supportedLanguages = ['en', 'es', 'fr', 'it', 'de'];
    }

    // Initialize localization
    async init() {
        try {
            // Load translations
            await this.loadTranslations();

            // Detect user language
            const detectedLanguage = await this.detectUserLanguage();

            // Set language and apply translations
            await this.setLanguage(detectedLanguage);

            console.log(`Localization initialized: ${this.currentLanguage}`);
        } catch (error) {
            console.warn('Localization initialization failed, using fallback:', error);
            await this.setLanguage(this.fallbackLanguage);
        }
    }

    // Load translation files
    async loadTranslations() {
        try {
            const response = await fetch('translations.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.translations = await response.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
            throw error;
        }
    }

    // Detect user language based on IP geolocation
    async detectUserLanguage() {
        try {
            // Try multiple geolocation services as fallbacks
            const services = [
                this.getLocationFromIPAPI,
                this.getLocationFromIPInfo,
                this.getLocationFromCloudflare
            ];

            for (const service of services) {
                try {
                    const countryCode = await service.call(this);
                    const language = this.mapCountryToLanguage(countryCode);

                    if (this.supportedLanguages.includes(language)) {
                        return language;
                    }
                } catch (serviceError) {
                    console.warn('Geolocation service failed:', serviceError);
                    continue;
                }
            }

            // Fallback to browser language if all geolocation services fail
            return this.detectBrowserLanguage();

        } catch (error) {
            console.warn('Language detection failed:', error);
            return this.detectBrowserLanguage();
        }
    }

    // Primary geolocation service (ip-api.com - free, no API key required)
    async getLocationFromIPAPI() {
        const response = await fetch('https://ip-api.com/json/?fields=countryCode');
        if (!response.ok) throw new Error('IP-API request failed');

        const data = await response.json();
        if (data.status === 'fail') throw new Error('IP-API detection failed');

        return data.countryCode;
    }

    // Backup geolocation service (ipinfo.io)
    async getLocationFromIPInfo() {
        const response = await fetch('https://ipinfo.io/json');
        if (!response.ok) throw new Error('IPInfo request failed');

        const data = await response.json();
        return data.country;
    }

    // Cloudflare geolocation (works if site is behind Cloudflare)
    async getLocationFromCloudflare() {
        const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
        if (!response.ok) throw new Error('Cloudflare request failed');

        const text = await response.text();
        const lines = text.split('\n');
        const locLine = lines.find(line => line.startsWith('loc='));

        if (!locLine) throw new Error('Location not found in Cloudflare response');

        return locLine.split('=')[1];
    }

    // Map country codes to supported languages
    mapCountryToLanguage(countryCode) {
        const countryLanguageMap = {
            // Spanish-speaking countries
            'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es',
            'VE': 'es', 'CL': 'es', 'EC': 'es', 'GT': 'es', 'CU': 'es',
            'BO': 'es', 'DO': 'es', 'HN': 'es', 'PY': 'es', 'SV': 'es',
            'NI': 'es', 'CR': 'es', 'PA': 'es', 'UY': 'es',

            // French-speaking countries
            'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'CA': 'fr', 'LU': 'fr',
            'MC': 'fr', 'SN': 'fr', 'CI': 'fr', 'BF': 'fr', 'ML': 'fr',

            // Italian-speaking countries
            'IT': 'it', 'SM': 'it', 'VA': 'it',

            // German-speaking countries
            'DE': 'de', 'AT': 'de', 'LI': 'de'
        };

        return countryLanguageMap[countryCode] || 'en';
    }

    // Fallback to browser language detection
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();

        return this.supportedLanguages.includes(langCode) ? langCode : this.fallbackLanguage;
    }

    // Set active language and apply translations
    async setLanguage(languageCode) {
        if (!this.supportedLanguages.includes(languageCode)) {
            languageCode = this.fallbackLanguage;
        }

        this.currentLanguage = languageCode;

        // Update HTML lang attribute
        document.documentElement.lang = languageCode;

        // Apply translations to the page
        this.applyTranslations();

        // Update meta tags
        this.updateMetaTags();
    }

    // Apply translations to DOM elements using data attributes
    applyTranslations() {
        const t = this.translations[this.currentLanguage];
        if (!t) return;

        // Update text content using data-i18n attributes
        const textElements = document.querySelectorAll('[data-i18n]');
        textElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translatedText = this.getNestedValue(t, key);
            if (translatedText) {
                element.textContent = translatedText;
            }
        });

        // Update attributes using data-i18n-attr attributes
        const attrElements = document.querySelectorAll('[data-i18n-attr]');
        attrElements.forEach(element => {
            const attrMappings = element.getAttribute('data-i18n-attr');
            // Parse multiple attribute mappings: "attr1:key1,attr2:key2"
            const mappings = attrMappings.split(',').map(mapping => {
                const [attr, key] = mapping.split(':').map(s => s.trim());
                return { attr, key };
            });

            mappings.forEach(({ attr, key }) => {
                const translatedValue = this.getNestedValue(t, key);
                if (translatedValue) {
                    element.setAttribute(attr, translatedValue);
                }
            });
        });
    }

    // Helper method to get nested values from translation object
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    // Update meta tags with translations
    updateMetaTags() {
        const t = this.translations[this.currentLanguage];
        if (!t) return;

        document.title = t.meta.title;

        this.updateMetaTag('description', t.meta.description);
        this.updateMetaTag('keywords', t.meta.keywords);

        // Update Open Graph tags
        this.updateMetaTag('og:title', t.meta.title, 'property');
        this.updateMetaTag('og:description', t.meta.description, 'property');

        // Update Twitter Card tags
        this.updateMetaTag('twitter:title', t.meta.title);
        this.updateMetaTag('twitter:description', t.meta.description);
    }

    // Helper method to update meta tags
    updateMetaTag(name, content, attribute = 'name') {
        let meta = document.querySelector(`meta[${attribute}="${name}"]`);
        if (meta) {
            meta.setAttribute('content', content);
        }
    }

    // Get translated text
    getText(key) {
        const t = this.translations[this.currentLanguage];
        if (!t) return key;

        const keys = key.split('.');
        let value = t;

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) break;
        }

        return value || key;
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Get supported languages
    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }
}

// Export for use in main script
window.LocalizationManager = LocalizationManager;
