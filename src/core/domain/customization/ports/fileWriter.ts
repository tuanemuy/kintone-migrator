export interface FileWriter {
  write(filePath: string, data: ArrayBuffer): Promise<void>;
}
