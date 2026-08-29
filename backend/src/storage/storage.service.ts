import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private s3?: S3Client;
  constructor(private config: ConfigService) {
    const account = this.config.get<string>('R2_ACCOUNT_ID');
    const key = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secret = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    if (account && key && secret) {
      this.s3 = new S3Client({ region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId: key, secretAccessKey: secret } });
    }
  }
  async upload(file: { originalname: string; mimetype: string; buffer: Buffer }) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `erp/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safe}`;
    const bucket = this.config.get<string>('R2_BUCKET');
    if (this.s3 && bucket) {
      await this.s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
      return { objectKey: key, storage: 'r2' };
    }
    const base = this.config.get('LOCAL_UPLOAD_DIR', './uploads');
    const target = join(base, key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
    return { objectKey: key, storage: 'local' };
  }
}
