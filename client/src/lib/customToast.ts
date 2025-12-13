export type ToastType = 'info' | 'success' | 'error' | 'warning';

export function showToast(message: string, type: ToastType = 'info') {
  const toast = document.createElement('div');
  toast.className = `custom-toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Force reflow
  toast.offsetHeight;
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
