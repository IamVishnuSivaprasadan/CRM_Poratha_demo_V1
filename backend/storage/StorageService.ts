import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StorageProvider {
  saveFile(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<{ storageKey: string; fileSize: number; checksum: string }>;
  getFileStream(storageKey: string): fs.ReadStream;
  getFileBuffer(storageKey: string): Promise<Buffer>;
  deleteFile(storageKey: string): Promise<boolean>;
  fileExists(storageKey: string): Promise<boolean>;
  getFilePath(storageKey: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string = './storage/files') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<{ storageKey: string; fileSize: number; checksum: string }> {
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const ext = path.extname(originalFilename) || '.bin';
    const randomId = crypto.randomBytes(16).toString('hex');
    const storageKey = `${Date.now()}_${randomId}${ext}`;
    const targetPath = path.join(this.baseDir, storageKey);

    await fs.promises.writeFile(targetPath, fileBuffer);

    return {
      storageKey,
      fileSize: fileBuffer.length,
      checksum,
    };
  }

  getFileStream(storageKey: string): fs.ReadStream {
    const targetPath = this.getFilePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found in storage: ${storageKey}`);
    }
    return fs.createReadStream(targetPath);
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const targetPath = this.getFilePath(storageKey);
    return await fs.promises.readFile(targetPath);
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    const targetPath = this.getFilePath(storageKey);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      return true;
    }
    return false;
  }

  async fileExists(storageKey: string): Promise<boolean> {
    const targetPath = this.getFilePath(storageKey);
    return fs.existsSync(targetPath);
  }

  getFilePath(storageKey: string): string {
    // Sanitize to avoid directory traversal
    const safeKey = path.basename(storageKey);
    return path.join(this.baseDir, safeKey);
  }
}

// S3 compatible placeholder for production configurations
export class S3StorageProvider implements StorageProvider {
  private localFallback: LocalStorageProvider;

  constructor() {
    this.localFallback = new LocalStorageProvider();
  }

  async saveFile(fileBuffer: Buffer, originalFilename: string, mimeType: string) {
    // Production would call @aws-sdk/client-s3 PutObjectCommand
    return this.localFallback.saveFile(fileBuffer, originalFilename, mimeType);
  }

  getFileStream(storageKey: string) {
    return this.localFallback.getFileStream(storageKey);
  }

  async getFileBuffer(storageKey: string) {
    return this.localFallback.getFileBuffer(storageKey);
  }

  async deleteFile(storageKey: string) {
    return this.localFallback.deleteFile(storageKey);
  }

  async fileExists(storageKey: string) {
    return this.localFallback.fileExists(storageKey);
  }

  getFilePath(storageKey: string) {
    return this.localFallback.getFilePath(storageKey);
  }
}

export class StorageService {
  private static instance: StorageProvider;

  public static getInstance(): StorageProvider {
    if (!StorageService.instance) {
      const driver = process.env.STORAGE_DRIVER || 'local';
      if (driver === 's3' && process.env.AWS_S3_BUCKET) {
        StorageService.instance = new S3StorageProvider();
      } else {
        StorageService.instance = new LocalStorageProvider(process.env.STORAGE_LOCAL_DIR || './storage/files');
      }
    }
    return StorageService.instance;
  }
}
