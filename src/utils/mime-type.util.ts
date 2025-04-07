/**
 * Determines the MIME type based on the file extension
 * @param fileName - The name of the file including its extension
 * @returns The corresponding MIME type string
 */
export const getMimeType = (fileName: string): string => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'csv': 'text/csv',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed'
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}; 