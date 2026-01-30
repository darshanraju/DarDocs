export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
];

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

export function isImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
  return ACCEPTED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/');
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function openImagePicker(): Promise<File | null> {
  return openFilePicker(ACCEPTED_IMAGE_TYPES.join(','));
}

export function openVideoPicker(): Promise<File | null> {
  return openFilePicker(ACCEPTED_VIDEO_TYPES.join(','));
}

function openFilePicker(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    let resolved = false;

    input.onchange = () => {
      if (resolved) return;
      resolved = true;
      const file = input.files?.[0] || null;
      cleanup();
      resolve(file);
    };

    const cleanup = () => {
      window.removeEventListener('focus', handleFocus);
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    };

    // Handle cancel via focus returning to the window
    const handleFocus = () => {
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }, 300);
    };
    window.addEventListener('focus', handleFocus);

    input.click();
  });
}
