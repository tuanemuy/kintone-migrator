export interface FileDownloader {
  download(fileKey: string): Promise<ArrayBuffer>;
}
