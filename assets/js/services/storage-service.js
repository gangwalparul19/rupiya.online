// Firebase Storage Service
import { storage } from '../config/firebase-config.js';
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import authService from './auth-service.js';

class StorageService {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
  }

  // Get user ID
  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // Validate file
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (file.size > this.maxFileSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!this.allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed. Allowed: PDF, Images, Word, Excel, Text' };
    }

    return { valid: true };
  }

  // Generate unique filename
  generateFileName(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${nameWithoutExt}_${timestamp}_${randomString}.${extension}`;
  }

  // Upload file with progress
  async uploadFile(file, folder = 'documents', onProgress = null) {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const userId = this.getUserId();
      const fileName = this.generateFileName(file.name);
      const filePath = `users/${userId}/${folder}/${fileName}`;
      const storageRef = ref(storage, filePath);

      // Upload with progress tracking
      if (onProgress) {
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject({ success: false, error: error.message });
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                  success: true,
                  url: downloadURL,
                  path: filePath,
                  name: file.name,
                  size: file.size,
                  type: file.type
                });
              } catch (error) {
                reject({ success: false, error: error.message });
              }
            }
          );
        });
      } else {
        // Simple upload without progress
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
          success: true,
          url: downloadURL,
          path: filePath,
          name: file.name,
          size: file.size,
          type: file.type
        };
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      if (!filePath) {
        return { success: false, error: 'No file path provided' };
      }

      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);

      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      // If file doesn't exist, consider it a success
      if (error.code === 'storage/object-not-found') {
        return { success: true };
      }
      return { success: false, error: error.message };
    }
  }

  // Get file URL
  async getFileURL(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const url = await getDownloadURL(fileRef);
      return { success: true, url };
    } catch (error) {
      console.error('Error getting file URL:', error);
      return { success: false, error: error.message };
    }
  }

  // List user files
  async listUserFiles(folder = 'documents') {
    try {
      const userId = this.getUserId();
      const folderPath = `users/${userId}/${folder}`;
      const folderRef = ref(storage, folderPath);

      const result = await listAll(folderRef);
      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return {
            name: itemRef.name,
            path: itemRef.fullPath,
            url: url
          };
        })
      );

      return { success: true, files };
    } catch (error) {
      console.error('Error listing files:', error);
      return { success: false, error: error.message, files: [] };
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Get file extension
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  // Get file icon based on type
  getFileIcon(filename) {
    const ext = this.getFileExtension(filename);
    const icons = {
      pdf: '📕',
      doc: '📘',
      docx: '📘',
      xls: '📗',
      xlsx: '📗',
      txt: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️'
    };
    return icons[ext] || '📄';
  }
}

// Create and export singleton instance
const storageService = new StorageService();
export default storageService;
