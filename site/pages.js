for (const button of document.querySelectorAll('[data-copy]')) button.addEventListener('click', async () => {
  const value = button.previousElementSibling.innerText;
  try { await navigator.clipboard.writeText(value); button.textContent = 'Copied'; }
  catch { button.textContent = 'Select text to copy'; }
  setTimeout(() => { button.textContent = 'Copy'; }, 2500);
});
