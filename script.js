// JavaScript for TikTok Link Share homepage
// Add interactivity here as needed

document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('ttlink');
  const deleteBtn = document.getElementById('delete-btn');

  // Clear input when delete button is clicked
  deleteBtn.addEventListener('click', function() {
    input.value = '';
    input.focus();
  });

  input.addEventListener('paste', async function(e) {
    let pastedText = '';
    if (e.clipboardData && e.clipboardData.getData) {
      pastedText = e.clipboardData.getData('text');
    } else if (window.clipboardData && window.clipboardData.getData) {
      pastedText = window.clipboardData.getData('Text');
    }
    let urlToProcess = pastedText;
    let is301 = false;
    let location = null;
    // Try to follow 301 redirect
    try {
      const response = await fetch(pastedText, { method: 'GET', redirect: 'manual' });
      if (response.status === 301) {
        location = response.headers.get('Location');
        if (location) {
          urlToProcess = location;
          is301 = true;
        }
      }
    } catch (err) {
      // fetch may fail due to CORS or invalid URL, fallback to pastedText
    }
    if (!is301) {
      showWarning('The link is not a valid TikTok URL coming from the share button.');
      e.preventDefault();
      return;
    }
    // Remove query string from URL
    try {
      const url = new URL(urlToProcess);
      const cleanUrl = url.origin + url.pathname;
      input.value = cleanUrl;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanUrl);
      } else {
        input.select();
        document.execCommand('copy');
      }
      e.preventDefault();
    } catch (err) {
      // Not a valid URL, do nothing
    }
  });

  // Fancy warning popup
  function showWarning(message) {
    let popup = document.createElement('div');
    popup.className = 'warning-popup';
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.classList.add('fade');
      setTimeout(() => {
        popup.remove();
      }, 500);
    }, 5000);
  }
});
