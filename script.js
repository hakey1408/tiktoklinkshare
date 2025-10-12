/**
 * TikTok Link Share Application
 * Handles TikTok link processing and cleanup
 */

// Constants
const CONFIG = {
    API_ENDPOINT: 'https://tiktoklinkshare-vercel.vercel.app/fetch-real-ttlink',
    POPUP_DURATION: {
        WARNING: 5000,
        SUCCESS: 2000,
        ICON_TOGGLE: 2000
    },
    STORAGE_KEYS: {
        LANGUAGE: 'tiktok-cleaner-language',
        THEME: 'tiktok-cleaner-theme',
        RECENT_LINKS: 'tiktok-cleaner-recent-links'
    },
    MAX_RECENT_LINKS: 10
};

// Global instances
let localizationManager = null;

// DOM Elements
const elements = {
    input: null,
    deleteBtn: null,
    copyBtn: null,
    openBtn: null,
    actionButtons: null,
    copyIcon: null,
    copyIconCheck: null,
    loader: null,
    announcements: null,
    alerts: null,
    helpBtn: null,
    helpModal: null,
    helpCloseBtn: null,
    languageButton: null,
    languageOptions: null,
    linkPreview: null,
    previewImage: null,
    previewLoader: null,
    previewError: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        // Initialize localization first
        localizationManager = new LocalizationManager();
        await localizationManager.init();

        // Cache DOM elements
        cacheElements();

        // Initialize event listeners
        setupEventListeners();

        console.log('TikTok Link Cleaner initialized successfully');
    } catch (error) {
        console.error('Application initialization failed:', error);
        // Continue without localization if it fails
        cacheElements();
        setupEventListeners();
    }
}

function cacheElements() {
    elements.input = document.getElementById('ttlink');
    elements.deleteBtn = document.getElementById('delete-btn');
    elements.copyBtn = document.getElementById('copy-btn');
    elements.openBtn = document.getElementById('open-btn');
    elements.copyIcon = document.getElementById('copy-icon');
    elements.actionButtons = document.getElementById('action-buttons');
    elements.copyIconCheck = document.getElementById('copy-icon-check');
    elements.loader = document.getElementById('loader-backdrop');
    elements.announcements = document.getElementById('announcements');
    elements.alerts = document.getElementById('alerts');
    elements.helpBtn = document.getElementById('help-btn');
    elements.helpModal = document.getElementById('help-modal');
    elements.helpCloseBtn = document.getElementById('help-close-btn');
    elements.languageButton = document.getElementById('language-select');
    elements.languageOptions = document.getElementById('language-options');
    elements.linkPreview = document.getElementById('link-preview');
    elements.previewImage = document.getElementById('preview-image');
    elements.previewLoader = document.getElementById('preview-loader');
    elements.previewError = document.getElementById('preview-error');
}

// Updated message functions to use localization
function getLocalizedMessage(key, fallback) {
    return localizationManager ? localizationManager.getText(`messages.${key}`) : fallback;
}

// Accessibility Functions
function announceToScreenReader(message, isAlert = false) {
    const target = isAlert ? elements.alerts : elements.announcements;
    if (target) {
        target.textContent = message;
        // Clear after announcement
        setTimeout(() => {
            target.textContent = '';
        }, 1000);
    }
}

function updateAriaLabel(element, label) {
    if (element) {
        element.setAttribute('aria-label', label);
    }
}

// Event Handlers
function handleDeleteClick() {
    clearInput();
    hideActionButtons();
    elements.input.focus();
    announceToScreenReader(getLocalizedMessage('inputCleared', 'Input field cleared'));
}

function handleCopyClick() {
    const inputValue = elements.input.value.trim();
    if (inputValue) {
        copyToClipboard(inputValue);
    }
}

function handleOpenClick() {
    const inputValue = elements.input.value.trim();
    if (inputValue) {
        window.open(inputValue, '_blank', 'noopener,noreferrer');
        announceToScreenReader(getLocalizedMessage('linkOpened', 'Link opened in new tab'));
    }
}

function handlePaste(event) {
    const pastedText = getPastedText(event);
    hideActionButtons();
    announceToScreenReader(getLocalizedMessage('processingLink', 'Processing TikTok link...'));
    processTikTokLink(pastedText);
}

function handleKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const inputValue = elements.input.value.trim();
        if (inputValue) {
            announceToScreenReader(getLocalizedMessage('processingLink', 'Processing TikTok link...'));
            processTikTokLink(inputValue);
        }
    }
}

function handleInputChange() {
    // Hide copy button when user modifies input
    if (elements.copyBtn.style.display !== 'none') {
        hideActionButtons();
    }
}

// Utility Functions
function getPastedText(event) {
    if (event.clipboardData?.getData) {
        return event.clipboardData.getData('text');
    }
    if (window.clipboardData?.getData) {
        return window.clipboardData.getData('Text');
    }
    return '';
}

function clearInput() {
    elements.input.value = '';
    elements.input.removeAttribute('aria-invalid');
}

function showActionButtons() {
    elements.actionButtons.classList.remove('hidden');
    announceToScreenReader(getLocalizedMessage('linkCleaned', 'Link cleaned successfully. Copy and open buttons are now available.'));
}

function hideActionButtons() {
    elements.actionButtons.classList.add('hidden');
    hideLinkPreview();
}

function showLoader() {
    elements.loader.classList.remove('hidden');
    elements.loader.setAttribute('aria-hidden', 'false');
}

function hideLoader() {
    elements.loader.classList.add('hidden');
    elements.loader.setAttribute('aria-hidden', 'true');
}

// Popup Functions
function createPopup(className, message) {
    const popup = document.createElement('div');
    popup.className = className;
    popup.textContent = message;
    popup.setAttribute('role', 'alert');
    popup.setAttribute('aria-live', 'assertive');
    document.body.appendChild(popup);
    return popup;
}

function showWarningPopup(message) {
    const popup = createPopup('warning-popup', message);
    announceToScreenReader(message, true);

    setTimeout(() => {
        popup.classList.add('fade');
        setTimeout(() => popup.remove(), 500);
    }, CONFIG.POPUP_DURATION.WARNING);
}

function showCopyPopup(message, isSuccess) {
    const popupClass = `copy-popup ${isSuccess ? 'success' : 'error'}`;
    const popup = createPopup(popupClass, message);
    announceToScreenReader(message);

    setTimeout(() => {
        popup.classList.add('fade');
        setTimeout(() => popup.remove(), 500);
    }, CONFIG.POPUP_DURATION.SUCCESS);
}

// Icon Toggle Functions
function toggleCopyIcons() {
    if (elements.copyIcon && elements.copyIconCheck) {
        elements.copyIcon.classList.toggle('hide');
        elements.copyIconCheck.classList.toggle('hide');

        const isShowingCheck = elements.copyIcon.classList.contains('hide');
        updateAriaLabel(elements.copyBtn, isShowingCheck ? 'Link copied successfully' : 'Copy cleaned link to clipboard');

        setTimeout(() => {
            elements.copyIcon.classList.toggle('hide');
            elements.copyIconCheck.classList.toggle('hide');
            updateAriaLabel(elements.copyBtn, 'Copy cleaned link to clipboard');
        }, CONFIG.POPUP_DURATION.ICON_TOGGLE);
    }
}

// Clipboard Functions
async function copyToClipboard(text) {
    try {
        if (await tryModernClipboardAPI(text)) {
            return true;
        }
        return tryFallbackCopy(text);
    } catch (error) {
        console.warn('Clipboard operation failed:', error);
        return tryFallbackCopy(text);
    }
}

async function tryModernClipboardAPI(text) {
    if (!navigator.clipboard?.writeText) {
        return false;
    }

    await navigator.clipboard.writeText(text);
    showCopyPopup(getLocalizedMessage('copySuccess', 'Link copied to clipboard'), true);
    toggleCopyIcons();
    return true;
}

function tryFallbackCopy(text) {
    const textArea = createHiddenTextArea(text);
    document.body.appendChild(textArea);

    const success = selectAndCopyText(textArea, text);
    document.body.removeChild(textArea);

    const message = success
        ? getLocalizedMessage('copySuccess', 'Link copied to clipboard')
        : getLocalizedMessage('copyFailed', 'Failed to copy to clipboard');
    showCopyPopup(message, success);

    if (success) {
        toggleCopyIcons();
    }

    return success;
}

function createHiddenTextArea(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = `
        position: fixed;
        left: -9999px;
        top: -9999px;
        opacity: 0;
    `;
    textArea.setAttribute('readonly', '');
    textArea.setAttribute('aria-hidden', 'true');
    return textArea;
}

function selectAndCopyText(textArea, text) {
    try {
        if (isIOSDevice()) {
            selectTextForIOS(textArea, text);
        } else {
            textArea.select();
        }

        return document.execCommand('copy');
    } catch (error) {
        console.warn('Text selection or copy failed:', error);
        return false;
    }
}

function selectTextForIOS(textArea, text) {
    textArea.contentEditable = true;
    textArea.readOnly = false;

    const range = document.createRange();
    range.selectNodeContents(textArea);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    textArea.setSelectionRange(0, text.length);
}

function isIOSDevice() {
    return /ipad|ipod|iphone/i.test(navigator.userAgent);
}

// API Functions
async function processTikTokLink(pastedText) {
    if (!pastedText?.trim()) {
        return;
    }

    showLoader();

    try {
        const response = await fetchTikTokData(pastedText);
        const data = deobfuscateResponse(response.data)
        handleAPIResponse(data);
    } catch (error) {
        console.error('TikTok processing failed:', error);
        showWarningPopup(getLocalizedMessage('processingError', 'Error processing the link.'));
        elements.input.setAttribute('aria-invalid', 'true');
    } finally {
        hideLoader();
    }
}

async function fetchTikTokData(url) {
    const apiUrl = `${CONFIG.API_ENDPOINT}?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

function handleAPIResponse(data) {
    if (data['purified-location']) {
        const cleanedUrl = data['purified-location'];
        const creator = data['creator'];
        const previewImage = data['og_image'];

        // Save to recent links
        saveRecentLink(cleanedUrl, creator, previewImage);

        updateInputWithCleanedLink(cleanedUrl);
        showActionButtons();

        // Show preview image for the cleaned URL
        showLinkPreview(creator, previewImage);

        elements.input.removeAttribute('aria-invalid');
    } else {
        showWarningPopup(getLocalizedMessage('invalidLink', 'The link is not a valid TikTok URL from the share button.'));
        elements.input.setAttribute('aria-invalid', 'true');
    }
}

function updateInputWithCleanedLink(cleanedUrl) {
    clearInput();
    elements.input.value = cleanedUrl;
    updateAriaLabel(elements.input, `Cleaned TikTok link: ${cleanedUrl}`);
}

function deobfuscateResponse(obfuscatedData) {
    try {
        // Reverse character substitution
        const charMap = {
            'z': 'a', 'y': 'b', 'x': 'c', 'w': 'd', 'v': 'e', 'u': 'f', 't': 'g', 's': 'h', 'r': 'i', 'q': 'j',
            'p': 'k', 'o': 'l', 'n': 'm', 'm': 'n', 'l': 'o', 'k': 'p', 'j': 'q', 'i': 'r', 'h': 's', 'g': 't',
            'f': 'u', 'e': 'v', 'd': 'w', 'c': 'x', 'b': 'y', 'a': 'z',
            'Z': 'A', 'Y': 'B', 'X': 'C', 'W': 'D', 'V': 'E', 'U': 'F', 'T': 'G', 'S': 'H', 'R': 'I', 'Q': 'J',
            'P': 'K', 'O': 'L', 'N': 'M', 'M': 'N', 'L': 'O', 'K': 'P', 'J': 'Q', 'I': 'R', 'H': 'S', 'G': 'T',
            'F': 'U', 'E': 'V', 'D': 'W', 'C': 'X', 'B': 'Y', 'A': 'Z',
            '9': '0', '8': '1', '7': '2', '6': '3', '5': '4', '4': '5', '3': '6', '2': '7', '1': '8', '0': '9',
            '-': '+', '_': '/'
        };

        // Apply character substitution
        let unsubstituted = '';
        for (let char of obfuscatedData) {
            unsubstituted += charMap[char] || char;
        }

        // Reverse the string
        const unreversed = unsubstituted.split('').reverse().join('');

        // Base64 decode
        const decoded = atob(unreversed);

        // Parse JSON
        return JSON.parse(decoded);
    } catch (error) {
        console.error('Deobfuscation failed:', error);
        throw new Error('Failed to decode response data');
    }
}

// Help Modal Functions
function showHelpModal() {
    elements.helpModal.classList.remove('hidden');
    elements.helpModal.classList.add('show');

    // Focus management for accessibility
    elements.helpCloseBtn.focus();

    // Trap focus within modal
    trapFocus(elements.helpModal);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    announceToScreenReader(getLocalizedMessage('helpOpened', 'Help guide opened'));
}

function hideHelpModal() {
    elements.helpModal.classList.remove('show');

    setTimeout(() => {
        elements.helpModal.classList.add('hidden');
        document.body.style.overflow = '';

        // Return focus to help button
        elements.helpBtn.focus();
    }, 300);

    announceToScreenReader(getLocalizedMessage('helpClosed', 'Help guide closed'));
}

function handleModalBackdropClick(event) {
    if (event.target === elements.helpModal || event.target.classList.contains('help-modal-backdrop')) {
        hideHelpModal();
    }
}

function handleModalKeydown(event) {
    if (elements.helpModal.classList.contains('show')) {
        if (event.key === 'Escape') {
            event.preventDefault();
            hideHelpModal();
        }
    }
}

function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    modal.addEventListener('keydown', function(event) {
        if (event.key === 'Tab') {
            if (event.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    event.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    });
}

// Language Selector Functions
function initializeLanguageSelector() {
    if (!elements.languageButton || !elements.languageOptions) {
        return;
    }

    // Set initial state based on current language
    updateLanguageDisplay();

    // Add event listeners
    elements.languageButton.addEventListener('click', toggleLanguageDropdown);
    elements.languageButton.addEventListener('keydown', handleLanguageButtonKeydown);

    // Add click listeners to language options
    const languageOptions = elements.languageOptions.querySelectorAll('.language-option');
    languageOptions.forEach(option => {
        option.addEventListener('click', () => handleLanguageSelection(option));
        option.addEventListener('keydown', (event) => handleLanguageOptionKeydown(event, option));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', handleOutsideClick);
}

function toggleLanguageDropdown() {
    const isExpanded = elements.languageButton.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
        closeLanguageDropdown();
    } else {
        openLanguageDropdown();
    }
}

function openLanguageDropdown() {
    elements.languageButton.setAttribute('aria-expanded', 'true');
    elements.languageOptions.classList.remove('hidden');

    // Focus first option
    const firstOption = elements.languageOptions.querySelector('.language-option');
    if (firstOption) {
        firstOption.focus();
    }
}

function closeLanguageDropdown() {
    elements.languageButton.setAttribute('aria-expanded', 'false');
    elements.languageOptions.classList.add('hidden');
    elements.languageButton.focus();
}

function handleLanguageButtonKeydown(event) {
    switch (event.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
            event.preventDefault();
            openLanguageDropdown();
            break;
        case 'ArrowUp':
            event.preventDefault();
            openLanguageDropdown();
            // Focus last option
            const lastOption = elements.languageOptions.querySelector('.language-option:last-child');
            if (lastOption) {
                lastOption.focus();
            }
            break;
    }
}

function handleLanguageOptionKeydown(event, option) {
    switch (event.key) {
        case 'Enter':
        case ' ':
            event.preventDefault();
            handleLanguageSelection(option);
            break;
        case 'ArrowDown':
            event.preventDefault();
            focusNextLanguageOption(option);
            break;
        case 'ArrowUp':
            event.preventDefault();
            focusPreviousLanguageOption(option);
            break;
        case 'Escape':
            event.preventDefault();
            closeLanguageDropdown();
            break;
    }
}

function focusNextLanguageOption(currentOption) {
    const nextOption = currentOption.nextElementSibling;
    if (nextOption) {
        nextOption.focus();
    } else {
        // Loop to first option
        const firstOption = elements.languageOptions.querySelector('.language-option');
        if (firstOption) {
            firstOption.focus();
        }
    }
}

function focusPreviousLanguageOption(currentOption) {
    const previousOption = currentOption.previousElementSibling;
    if (previousOption) {
        previousOption.focus();
    } else {
        // Loop to last option
        const lastOption = elements.languageOptions.querySelector('.language-option:last-child');
        if (lastOption) {
            lastOption.focus();
        }
    }
}

async function handleLanguageSelection(option) {
    const languageCode = option.getAttribute('data-lang');

    if (!languageCode || !localizationManager) {
        return;
    }

    // Update selected state
    elements.languageOptions.querySelectorAll('.language-option').forEach(opt => {
        opt.setAttribute('aria-selected', 'false');
    });
    option.setAttribute('aria-selected', 'true');

    // Close dropdown
    closeLanguageDropdown();

    // Change language
    try {
        await localizationManager.setLanguage(languageCode);

        // Save language preference
        saveToLocalStorage(CONFIG.STORAGE_KEYS.LANGUAGE, languageCode);

        updateLanguageDisplay();
        announceToScreenReader(`Language changed to ${option.querySelector('.language-name').textContent}`);
    } catch (error) {
        console.error('Failed to change language:', error);
    }
}

function updateLanguageDisplay() {
    if (!localizationManager || !elements.languageButton) {
        return;
    }

    const currentLang = localizationManager.currentLanguage;
    const langFlagMap = {
        'en': '🇺🇸',
        'es': '🇪🇸',
        'fr': '🇫🇷',
        'it': '🇮🇹',
        'de': '🇩🇪'
    };

    // Update button display
    const flagElement = elements.languageButton.querySelector('.language-flag');
    const nameElement = elements.languageButton.querySelector('.language-name');

    if (flagElement && nameElement) {
        flagElement.textContent = langFlagMap[currentLang] || '🇺🇸';
        nameElement.textContent = localizationManager.getText(`footer.languages.${currentLang}`) || 'English';
    }

    // Update selected option in dropdown
    elements.languageOptions.querySelectorAll('.language-option').forEach(option => {
        const isSelected = option.getAttribute('data-lang') === currentLang;
        option.setAttribute('aria-selected', isSelected.toString());
    });
}

function handleOutsideClick(event) {
    if (!elements.languageButton || !elements.languageOptions) {
        return;
    }

    const isClickInsideSelector = elements.languageButton.contains(event.target) ||
                                  elements.languageOptions.contains(event.target);

    if (!isClickInsideSelector && elements.languageButton.getAttribute('aria-expanded') === 'true') {
        closeLanguageDropdown();
    }
}

// Storage Functions
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

function saveRecentLink(cleanedUrl, creator, previewImage) {
    const recentLinks = loadFromLocalStorage(CONFIG.STORAGE_KEYS.RECENT_LINKS, []);
    const linkEntry = {
        id: Date.now(),
        link: cleanedUrl,
        creator: creator,
        previewImage: previewImage,
        timestamp: new Date().toISOString()
    };

    // Remove duplicate if exists
    const filtered = recentLinks.filter(link => link.cleanedUrl !== cleanedUrl);

    // Add new link at the beginning
    filtered.unshift(linkEntry);

    // Keep only the latest MAX_RECENT_LINKS
    const trimmed = filtered.slice(0, CONFIG.MAX_RECENT_LINKS);

    saveToLocalStorage(CONFIG.STORAGE_KEYS.RECENT_LINKS, trimmed);
}

function getRecentLinks() {
    return loadFromLocalStorage(CONFIG.STORAGE_KEYS.RECENT_LINKS, []);
}

// Enhanced Link Validation
function validateTikTokUrl(url) {
    const tikTokPatterns = [
        /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
        /^https?:\/\/(www\.)?tiktok\.com\/t\/[\w\d]+/,
        /^https?:\/\/vm\.tiktok\.com\/[\w\d]+/,
        /^https?:\/\/vt\.tiktok\.com\/[\w\d]+/,
        /^https?:\/\/m\.tiktok\.com/
    ];

    return tikTokPatterns.some(pattern => pattern.test(url));
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + V for paste (if input is focused)
        if ((event.ctrlKey || event.metaKey) && event.key === 'v' && document.activeElement === elements.input) {
            // Let default paste behavior happen, but prepare for processing
            setTimeout(() => {
                const value = elements.input.value.trim();
                if (value && validateTikTokUrl(value)) {
                    processTikTokLink(value);
                }
            }, 50);
        }

        // Ctrl/Cmd + C for copy (when copy button is visible)
        if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !elements.actionButtons.classList.contains('hidden')) {
            event.preventDefault();
            handleCopyClick();
        }

        // Escape to clear input and hide buttons
        if (event.key === 'Escape' && document.activeElement === elements.input) {
            event.preventDefault();
            handleDeleteClick();
        }

        // Enter to process link
        if (event.key === 'Enter' && document.activeElement === elements.input) {
            event.preventDefault();
            const value = elements.input.value.trim();
            if (value) {
                processTikTokLink(value);
            }
        }
    });
}

// URL Processing with validation
function preprocessTikTokUrl(url) {
    // Remove whitespace
    url = url.trim();

    // Add https if missing
    if (url.match(/^(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|m\.tiktok\.com)/)) {
        url = 'https://' + url;
    }

    return url;
}

function setupEventListeners() {
    // Input events
    if (elements.input) {
        elements.input.addEventListener('paste', handlePaste);
        elements.input.addEventListener('keydown', handleKeydown);
        elements.input.addEventListener('input', handleInputChange);
    }

    // Button events
    if (elements.deleteBtn) {
        elements.deleteBtn.addEventListener('click', handleDeleteClick);
    }

    if (elements.copyBtn) {
        elements.copyBtn.addEventListener('click', handleCopyClick);
    }

    if (elements.openBtn) {
        elements.openBtn.addEventListener('click', handleOpenClick);
    }

    // Link preview click event
    if (elements.linkPreview) {
        elements.linkPreview.addEventListener('click', handleOpenClick);
        elements.linkPreview.style.cursor = 'pointer';
    }

    // Help modal events
    if (elements.helpBtn) {
        elements.helpBtn.addEventListener('click', showHelpModal);
    }

    if (elements.helpCloseBtn) {
        elements.helpCloseBtn.addEventListener('click', hideHelpModal);
    }

    if (elements.helpModal) {
        elements.helpModal.addEventListener('click', handleModalBackdropClick);
    }

    // Global keyboard events
    document.addEventListener('keydown', handleModalKeydown);

    // Initialize language selector
    initializeLanguageSelector();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
}

// Link Preview Functions
function showLinkPreview(creator, previewImage) {
    if (!elements.linkPreview) return;

    // Show the preview container
    elements.linkPreview.classList.remove('hidden');

    // Clear previous content
    clearPreviousPreview();

    // Show loading state
    if (elements.previewLoader) {
        elements.previewLoader.classList.remove('hidden');
    }

    if (elements.previewError) {
        elements.previewError.classList.add('hidden');
    }

    // Set creator name if available
    const creatorElement = elements.linkPreview.querySelector('.preview-creator');
    if (creatorElement && creator) {
        creatorElement.textContent = `@${creator}`;
        creatorElement.classList.remove('hidden');
    }

    // Load preview image if available
    if (previewImage && elements.previewImage) {
        loadPreviewImage(previewImage);
    } else {
        // Hide loader and show error if no image
        if (elements.previewLoader) {
            elements.previewLoader.classList.add('hidden');
        }
        showPreviewError();
    }
}

function loadPreviewImage(imageUrl) {
    const img = new Image();

    img.onload = function() {
        if (elements.previewImage) {
            elements.previewImage.src = imageUrl;
            elements.previewImage.classList.remove('hidden');
            elements.previewImage.setAttribute('alt', 'TikTok video preview');
        }

        if (elements.previewLoader) {
            elements.previewLoader.classList.add('hidden');
        }

        if (elements.previewError) {
            elements.previewError.classList.add('hidden');
        }
    };

    img.onerror = function() {
        console.warn('Failed to load preview image:', imageUrl);
        showPreviewError();
    };

    // Start loading the image
    img.src = imageUrl;
}

function showPreviewError() {
    if (elements.previewLoader) {
        elements.previewLoader.classList.add('hidden');
    }

    if (elements.previewError) {
        elements.previewError.classList.remove('hidden');
    }

    // Show placeholder image
    if (elements.previewImage) {
        elements.previewImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA0MEg2NVY2MEgzNVY0MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTQwIDQ1VjU1TDUwIDUwTDQwIDQ1WiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K';
        elements.previewImage.classList.remove('hidden');
        elements.previewImage.setAttribute('alt', 'Preview image not available');
    }
}

function clearPreviousPreview() {
    if (elements.previewImage) {
        elements.previewImage.src = '';
        elements.previewImage.classList.add('hidden');
    }

    const creatorElement = elements.linkPreview?.querySelector('.preview-creator');
    if (creatorElement) {
        creatorElement.textContent = '';
        creatorElement.classList.add('hidden');
    }
}

function hideLinkPreview() {
    if (elements.linkPreview) {
        elements.linkPreview.classList.add('hidden');
        clearPreviousPreview();
    }
}
