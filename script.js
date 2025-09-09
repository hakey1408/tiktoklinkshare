// JavaScript for TikTok Link Share homepage
// Add interactivity here as needed

document.addEventListener('DOMContentLoaded', function () {
    const TT_API_ENDPOINT = 'https://tiktoklinkshare-vercel.vercel.app/fetch-real-ttlink';
    const input = document.getElementById('ttlink');
    const deleteBtn = document.getElementById('delete-btn');
    const loader = document.getElementById('loader-backdrop');

    // Clear input when delete button is clicked
    deleteBtn.addEventListener('click', function () {
        input.value = '';
        input.focus();
    });

    function showWarningPopup(message) {
        let popup = document.createElement('div');
        popup.className = 'warning-popup';
        popup.textContent = message;
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.classList.add('fade');
            setTimeout(() => popup.remove(), 500);
        }, 5000);
    }

    /**
     * Copies to Clipboard value
     * @param {String} valueForClipboard value to be copied
     * @return {boolean} shows if copy has been successful
     */
    const copyToClipboard = (valueForClipboard) => {
        const textArea = document.createElement('textarea');
        textArea.value = valueForClipboard;

        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px'; // to make it invisible and out of the reach
        textArea.setAttribute('readonly', ''); // without it, the native keyboard will pop up (so we show it is only for reading)

        document.body.appendChild(textArea);

        let success = false;
        if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
            const range = document.createRange();
            range.selectNodeContents(textArea);

            const selection = window.getSelection();
            selection.removeAllRanges(); // remove previously selected ranges
            selection.addRange(range);
            textArea.setSelectionRange(0, valueForClipboard.length); // this line makes the selection in iOS
        } else {
            textArea.select(); // this line is for all other browsers except ios
        }

        try {
            success = document.execCommand('copy'); // if copy is successful, function returns true
        } catch (e) {
            success = false; // return false to show that copy unsuccessful
        } finally {
            document.body.removeChild(textArea); // delete textarea from DOM
        }

        if (success) {
            showCopyPopup('link copied to clipboard', true);
        } else {
            showCopyPopup('failed to copy to clipboard', false);
        }
        return success;
    };

    function showCopyPopup(message, isSuccess) {
        let popup = document.createElement('div');
        popup.className = 'copy-popup' + (isSuccess ? ' success' : ' error');
        popup.textContent = message;
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.classList.add('fade');
            setTimeout(() => popup.remove(), 500);
        }, 2000);
    }

    function showLoader() {
        loader.style.display = 'flex';
    }

    function hideLoader() {
        loader.style.display = 'none';
    }

    // Unified handler for paste and enter
    async function handleTiktokLinkProcess(pastedText) {
        if (!pastedText) return;
        showLoader();
        try {
            const apiUrl = `${TT_API_ENDPOINT}?url=${encodeURIComponent(pastedText)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            hideLoader();
            if (data.status === 301 && data['purified-location']) {
                input.value = '';
                input.value = data['purified-location'];
                copyToClipboard(data['purified-location']);
            } else {
                showWarningPopup('The link is not a valid TikTok URL from the share button.');
            }
        } catch (err) {
            hideLoader();
            showWarningPopup('Error processing the link.');
        }
    }

    input.addEventListener('paste', function (e) {
        let pastedText = '';
        if (e.clipboardData && e.clipboardData.getData) {
            pastedText = e.clipboardData.getData('text');
        } else if (window.clipboardData && window.clipboardData.getData) {
            pastedText = window.clipboardData.getData('Text');
        }
        handleTiktokLinkProcess(pastedText);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            handleTiktokLinkProcess(input.value);
        }
    });
});
