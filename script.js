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
    }
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
    helpCloseBtn: null
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
        const data = await fetchTikTokData(pastedText);
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
    if (data.status === 301 && data['purified-location']) {
        updateInputWithCleanedLink(data['purified-location']);
        showActionButtons();
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

function setupEventListeners() {
    elements.deleteBtn.addEventListener('click', handleDeleteClick);
    elements.copyBtn.addEventListener('click', handleCopyClick);
    elements.openBtn.addEventListener('click', handleOpenClick);
    elements.input.addEventListener('paste', handlePaste);
    elements.input.addEventListener('keydown', handleKeydown);
    elements.input.addEventListener('input', handleInputChange);

    // Help modal event listeners
    elements.helpBtn.addEventListener('click', showHelpModal);
    elements.helpCloseBtn.addEventListener('click', hideHelpModal);
    elements.helpModal.addEventListener('click', handleModalBackdropClick);

    // Keyboard navigation for modal
    document.addEventListener('keydown', handleModalKeydown);
}
