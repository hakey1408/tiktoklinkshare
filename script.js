// JavaScript for TikTok Link Share homepage
// Add interactivity here as needed

document.addEventListener('DOMContentLoaded', function() {
  const TT_API_ENDPOINT = 'https://tiktoklinkshare-vercel.vercel.app/fetch-real-ttlink';
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

  input.addEventListener('paste', async function(e) {
    let pastedText = '';
    if (e.clipboardData && e.clipboardData.getData) {
      pastedText = e.clipboardData.getData('text');
    } else if (window.clipboardData && window.clipboardData.getData) {
      pastedText = window.clipboardData.getData('Text');
    }
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
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data['purified-location']);
        }
      } else {
        showWarningPopup('The link is not a valid TikTok URL from the share button.');
      }
    } catch (err) {
      hideLoader();
      showWarningPopup('Error processing the link.');
    }
  });
});
