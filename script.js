// JavaScript for TikTok Link Share homepage
// Add interactivity here as needed

document.addEventListener('DOMContentLoaded', function() {
  const TT_API_ENDPOINT = 'https://tiktoklinkshare-vercel.vercel.app/fetch-real-ttlink';
  const API_KEY = 'FrfqeMIIFxQImf701DS4HhSzG43EN8nCPqXlQnMW9JY';
  const input = document.getElementById('ttlink');
  const deleteBtn = document.getElementById('delete-btn');
  const loader = document.getElementById('loader-backdrop');

  // Clear input when delete button is clicked
  deleteBtn.addEventListener('click', function() {
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
      const response = await fetch(apiUrl, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      const data = await response.json();
      hideLoader();
      if (data.status === 301 && data['purified-location']) {
        input.value = '';
        input.value = data['purified-location'];
        // Copy to clipboard: fallback for iOS
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(data['purified-location']).catch(() => {
            // fallback below
            input.select();
            document.execCommand('copy');
            input.setSelectionRange(0, 0); // remove selection
          });
        } else {
          // fallback for iOS and non-secure context
          input.select();
          document.execCommand('copy');
          input.setSelectionRange(0, 0); // remove selection
        }
      } else {
        showWarningPopup('The link is not a valid TikTok URL from the share button.');
      }
    } catch (err) {
      hideLoader();
      showWarningPopup('Error processing the link.');
    }
  }

  input.addEventListener('paste', function(e) {
    let pastedText = '';
    if (e.clipboardData && e.clipboardData.getData) {
      pastedText = e.clipboardData.getData('text');
    } else if (window.clipboardData && window.clipboardData.getData) {
      pastedText = window.clipboardData.getData('Text');
    }
    handleTiktokLinkProcess(pastedText);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      handleTiktokLinkProcess(input.value);
    }
  });
});
