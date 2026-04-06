export interface FileContentReader {
  read(filePath: string): Promise<ArrayBuffer>;
}
