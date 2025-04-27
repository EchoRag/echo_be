import { Storage } from '@google-cloud/storage';

export class StorageService {
  private storage = new Storage();
  private bucketName = process.env.GCLOUD_STORAGE_BUCKET as string; // Make sure your .env has this

  async deleteFile(filePath: string): Promise<void> {
    await this.storage.bucket(this.bucketName).file(filePath).delete();
  }

  async deleteFiles(filePaths: string[]): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);

    const deletePromises = filePaths.map((filePath) => {
      return bucket.file(filePath).delete().catch((err) => {
        console.error(`Error deleting file ${filePath}:`, err.message);
      });
    });

    await Promise.all(deletePromises);
  }
}
