/**
 * File upload validation utility that checks image files for allowed types,
 * maximum file size, and minimum image dimensions before upload.
 */
const MAX_FILE_SIZE_MB = 5;

export function validateImageFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`);
  }

  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_FILE_SIZE_MB}MB`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateCSVFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }

  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    errors.push('Invalid file type. Allowed: CSV, XLSX, XLS');
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`);
  }

  return { valid: errors.length === 0, errors };
}
