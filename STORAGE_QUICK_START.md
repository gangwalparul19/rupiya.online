# Firebase Storage - Quick Start Guide

## What's New

Firebase Storage is now integrated into the Documents page for actual file uploads!

## Features

### File Upload
- **Max Size**: 10MB per file
- **Allowed Types**: PDF, Images (JPG, PNG, GIF), Word, Excel, Text
- **Progress Bar**: Real-time upload progress
- **Validation**: Automatic file type and size checking

### File Management
- **Upload**: Select file and upload to Firebase Storage
- **View**: Open files in new tab
- **Replace**: Upload new file (old file auto-deleted)
- **Delete**: Remove file from storage and database
- **Storage Tracking**: See total storage used

### File Organization
Files are stored in user-specific folders:
```
users/{userId}/documents/{filename}
```

## How to Use

### Upload a Document
1. Go to Documents page
2. Click "Add Document"
3. Fill in document details
4. Click "Choose File" and select your file
5. Watch the progress bar
6. Click "Save Document"

### View a Document
1. Click the "Open" button (↗️ icon) on any document card
2. File opens in new browser tab

### Replace a File
1. Click "Edit" on document card
2. Current file is shown with "View" link
3. Select new file (optional)
4. Click "Update Document"
5. Old file is automatically deleted

### Delete a Document
1. Click "Delete" (🗑️ icon) on document card
2. Confirm deletion
3. File is removed from storage and database

## Storage Service

### Import
```javascript
import storageService from '../services/storage-service.js';
```

### Upload File
```javascript
const result = await storageService.uploadFile(
  file,
  'documents',
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);

if (result.success) {
  console.log('File URL:', result.url);
  console.log('File Path:', result.path);
}
```

### Delete File
```javascript
const result = await storageService.deleteFile(filePath);
if (result.success) {
  console.log('File deleted');
}
```

### Format File Size
```javascript
const size = storageService.formatFileSize(1024000);
// Returns: "1000 KB"
```

### Get File Icon
```javascript
const icon = storageService.getFileIcon('document.pdf');
// Returns: "📕"
```

## Security

### Storage Rules
Make sure your Firebase Storage rules allow authenticated users to access their own files:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == userId &&
                            request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

## File Types & Icons

| Type | Extensions | Icon |
|------|-----------|------|
| PDF | .pdf | 📕 |
| Word | .doc, .docx | 📘 |
| Excel | .xls, .xlsx | 📗 |
| Text | .txt | 📄 |
| Images | .jpg, .jpeg, .png, .gif | 🖼️ |

## Error Messages

- **"No file selected"** - Choose a file before saving
- **"File size exceeds 10MB limit"** - File is too large
- **"File type not allowed"** - Use allowed file types only
- **"Failed to upload file"** - Network or permission error

## Tips

1. **Compress large files** before uploading to save storage
2. **Use descriptive names** for easy identification
3. **Add descriptions** to provide context
4. **Organize by category** for better management
5. **Regular cleanup** - delete unused documents

## Storage Limits

- **Free Tier**: 5GB storage, 1GB/day downloads
- **Blaze Plan**: Pay as you go ($0.026/GB storage, $0.12/GB downloads)

## Next Steps

Consider adding file upload to other pages:
- Expenses (receipts)
- Income (invoices)
- Houses (property docs)
- Vehicles (registration)
- Investments (certificates)

---

**Need Help?** Check `FIREBASE_STORAGE_IMPLEMENTATION.md` for detailed documentation.
