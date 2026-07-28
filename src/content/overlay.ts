export function createOverlay(): {
  overlay: HTMLDivElement;
  getSelection: () => Promise<{ x: number; y: number; width: number; height: number }>;
} {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    cursor: crosshair;
    z-index: 999999;
  `;

  const selection = document.createElement('div');
  selection.style.cssText = `
    position: absolute;
    border: 2px dashed #fff;
    background: rgba(255, 255, 255, 0.1);
    display: none;
  `;
  overlay.appendChild(selection);

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000000;
  `;
  toast.textContent = 'Drag to select QR code area. Press ESC to cancel.';
  overlay.appendChild(toast);

  function getSelection(): Promise<{ x: number; y: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      let startX = 0;
      let startY = 0;
      let isSelecting = false;

      const onMouseDown = (e: MouseEvent) => {
        startX = e.clientX;
        startY = e.clientY;
        isSelecting = true;
        selection.style.display = 'block';
        selection.style.left = `${startX}px`;
        selection.style.top = `${startY}px`;
        selection.style.width = '0';
        selection.style.height = '0';
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isSelecting) return;
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const width = Math.abs(e.clientX - startX);
        const height = Math.abs(e.clientY - startY);
        selection.style.left = `${x}px`;
        selection.style.top = `${y}px`;
        selection.style.width = `${width}px`;
        selection.style.height = `${height}px`;
      };

      const onMouseUp = (e: MouseEvent) => {
        isSelecting = false;
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const width = Math.abs(e.clientX - startX);
        const height = Math.abs(e.clientY - startY);

        cleanup();
        document.body.removeChild(overlay);

        if (width < 10 || height < 10) {
          reject(new Error('Selection too small'));
        } else {
          resolve({ x, y, width, height });
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          document.body.removeChild(overlay);
          reject(new Error('Cancelled'));
        }
      };

      const cleanup = () => {
        overlay.removeEventListener('mousedown', onMouseDown);
        overlay.removeEventListener('mousemove', onMouseMove);
        overlay.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('keydown', onKeyDown);
      };

      overlay.addEventListener('mousedown', onMouseDown);
      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseup', onMouseUp);
      document.addEventListener('keydown', onKeyDown);
    });
  }

  document.body.appendChild(overlay);

  return { overlay, getSelection };
}

export function showToast(message: string, isError = false): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isError ? '#e74c3c' : '#2ecc71'};
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000000;
    transition: opacity 0.3s;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}
