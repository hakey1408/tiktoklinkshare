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
    MESSAGES: {
        INVALID_LINK: 'The link is not a valid TikTok URL from the share button.',
        PROCESSING_ERROR: 'Error processing the link.',
        COPY_SUCCESS: 'link copied to clipboard',
        COPY_FAILED: 'failed to copy to clipboard'
    }
};

// DOM Elements
const elements = {
    input: null,
    deleteBtn: null,
    copyBtn: null,
    copyIcon: null,
    copyIconCheck: null,
    loader: null,
    announcements: null,
    alerts: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // Cache DOM elements
    elements.input = document.getElementById('ttlink');
    elements.deleteBtn = document.getElementById('delete-btn');
    elements.copyBtn = document.getElementById('copy-btn');
    elements.copyIcon = document.getElementById('copy-icon');
    elements.copyIconCheck = document.getElementById('copy-icon-check');
    elements.loader = document.getElementById('loader-backdrop');
    elements.announcements = document.getElementById('announcements');
    elements.alerts = document.getElementById('alerts');

    // Initialize event listeners
    setupEventListeners();
}

function setupEventListeners() {
    elements.deleteBtn.addEventListener('click', handleDeleteClick);
    elements.copyBtn.addEventListener('click', handleCopyClick);
    elements.input.addEventListener('paste', handlePaste);
    elements.input.addEventListener('keydown', handleKeydown);
    elements.input.addEventListener('input', handleInputChange);
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
    hideCopyButton();
    elements.input.focus();
    announceToScreenReader('Input field cleared');
}

function handleCopyClick() {
    const inputValue = elements.input.value.trim();
    if (inputValue) {
        copyToClipboard(inputValue);
    }
}

function handlePaste(event) {
    const pastedText = getPastedText(event);
    hideCopyButton();
    announceToScreenReader('Processing TikTok link...');
    processTikTokLink(pastedText);
}

function handleKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const inputValue = elements.input.value.trim();
        if (inputValue) {
            announceToScreenReader('Processing TikTok link...');
            processTikTokLink(inputValue);
        }
    }
}

function handleInputChange() {
    // Hide copy button when user modifies input
    if (elements.copyBtn.style.display !== 'none') {
        hideCopyButton();
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

function showCopyButton() {
    elements.copyBtn.style.display = 'inline-block';
    announceToScreenReader('Link cleaned successfully. Copy button is now available.');
}

function hideCopyButton() {
    elements.copyBtn.style.display = 'none';
}

function showLoader() {
    elements.loader.style.display = 'flex';
    elements.loader.setAttribute('aria-hidden', 'false');
}

function hideLoader() {
    elements.loader.style.display = 'none';
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
    showCopyPopup(CONFIG.MESSAGES.COPY_SUCCESS, true);
    toggleCopyIcons();
    return true;
}

function tryFallbackCopy(text) {
    const textArea = createHiddenTextArea(text);
    document.body.appendChild(textArea);

    const success = selectAndCopyText(textArea, text);
    document.body.removeChild(textArea);

    const message = success ? CONFIG.MESSAGES.COPY_SUCCESS : CONFIG.MESSAGES.COPY_FAILED;
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
        showWarningPopup(CONFIG.MESSAGES.PROCESSING_ERROR);
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
        showCopyButton();
        elements.input.removeAttribute('aria-invalid');
    } else {
        showWarningPopup(CONFIG.MESSAGES.INVALID_LINK);
        elements.input.setAttribute('aria-invalid', 'true');
    }
}

function updateInputWithCleanedLink(cleanedUrl) {
    clearInput();
    elements.input.value = cleanedUrl;
    updateAriaLabel(elements.input, `Cleaned TikTok link: ${cleanedUrl}`);
}
