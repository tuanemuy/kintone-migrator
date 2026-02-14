export interface FileUploader {
  upload(filePath: string): Promise<{ fileKey: string }>;
}
