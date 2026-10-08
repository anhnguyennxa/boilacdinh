import {
  BadRequestException,
  Controller,
  HttpCode,
  Injectable,
  Logger,
  Module,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { detectImage, type ImageKind } from './image-type';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Thư mục lưu ảnh khi không dùng Cloudinary (phục vụ tĩnh tại /uploads, xem main.ts) */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly config: ConfigService) {}

  async saveImage(file: Express.Multer.File | undefined): Promise<{ url: string; bytes: number }> {
    if (!file) throw new BadRequestException('Chưa chọn ảnh');
    if (file.size > MAX_UPLOAD_BYTES) throw new PayloadTooLargeException('Ảnh tối đa 5MB');
    const kind = detectImage(file.buffer);
    if (!kind) throw new BadRequestException('Chỉ nhận ảnh JPG, PNG hoặc WebP');

    const cloudinary = this.config.get<string>('CLOUDINARY_URL');
    const url = cloudinary ? await this.toCloudinary(cloudinary, file.buffer, kind) : await this.toDisk(file.buffer, kind);
    return { url, bytes: file.size };
  }

  /** Tên file ngẫu nhiên, chia thư mục theo năm/tháng; không dùng tên gốc của người dùng. */
  private async toDisk(buf: Buffer, kind: ImageKind) {
    const now = new Date();
    const rel = path.posix.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'), `${randomUUID()}.${kind.ext}`);
    const abs = path.join(UPLOAD_DIR, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buf);
    return `/uploads/${rel}`;
  }

  /** Upload có chữ ký (CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>) */
  private async toCloudinary(connection: string, buf: Buffer, kind: ImageKind) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(connection);
    if (!m) throw new Error('CLOUDINARY_URL không đúng dạng cloudinary://key:secret@cloud');
    const [, apiKey, apiSecret, cloud] = m;
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'boilacdinh/products';
    const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buf)], { type: kind.mime }));
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
    const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
    if (!res.ok || !json.secure_url) {
      this.logger.error(`Cloudinary: ${json.error?.message ?? res.status}`);
      throw new BadRequestException('Không tải được ảnh lên kho lưu trữ');
    }
    return json.secure_url;
  }
}

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  // Giới hạn ở tầng multer để không đọc file quá lớn vào bộ nhớ
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    return this.uploads.saveImage(file);
  }
}

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
