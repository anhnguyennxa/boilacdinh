import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { couponDiscount } from '@foodhub/shared';
import { Coupon, CouponType, Prisma } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import type { PromoDto } from '@foodhub/shared';
import { promoWeight } from '@foodhub/shared';
import { CacheService } from '../../common/cache.service';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { MenuInvalidator } from '../../common/revalidate.service';
import { PrismaService } from '../../prisma/prisma.service';

const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class ValidateCouponDto {
  @Transform(upper)
  @IsString()
  code: string;

  @IsInt()
  @Min(0)
  subtotal: number;
}

export class CreateCouponDto {
  @Transform(upper)
  @Matches(/^[A-Z0-9_-]{3,30}$/, { message: 'Mã gồm 3–30 ký tự chữ in hoa, số, - hoặc _' })
  code: string;

  @IsEnum(CouponType)
  type: CouponType;

  @IsInt()
  @Min(1)
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @Type(() => Date)
  @IsDate()
  endsAt: Date;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

/** Kiểm tra mã còn hiệu lực và tính số tiền giảm. Không trừ lượt dùng. */
export function evaluateCoupon(coupon: Coupon | null, subtotal: number, now = new Date()) {
  if (!coupon) throw new BadRequestException('Mã giảm giá không tồn tại');
  if (coupon.startsAt > now || coupon.endsAt < now) throw new BadRequestException('Mã giảm giá đã hết hạn');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
  }
  const minOrder = coupon.minOrder.toNumber();
  if (subtotal < minOrder) {
    throw new BadRequestException(`Đơn tối thiểu ${minOrder.toLocaleString('vi-VN')}đ để dùng mã này`);
  }
  return couponDiscount(
    {
      type: coupon.type,
      value: coupon.value.toNumber(),
      minOrder,
      maxDiscount: coupon.maxDiscount?.toNumber() ?? null,
    },
    subtotal,
  );
}

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly menu: MenuInvalidator,
  ) {}

  async validate(dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    return { code: dto.code, discount: evaluateCoupon(coupon, dto.subtotal) };
  }

  /**
   * Mã đang chạy để quảng bá trên trang chủ, ưu đãi lớn nhất đứng đầu.
   * Lượt còn lại có thể trễ tối đa 60 giây do cache — chỉ để hiển thị, lúc đặt hàng vẫn kiểm tra chính xác.
   */
  listPublic(): Promise<PromoDto[]> {
    return this.cache.wrap('menu:promos', 60, async () => {
      const now = new Date();
      const rows = await this.prisma.coupon.findMany({
        where: { isPublic: true, startsAt: { lte: now }, endsAt: { gt: now } },
        orderBy: { endsAt: 'asc' },
        take: 20,
      });
      return rows
        .filter((c) => c.usageLimit == null || c.usedCount < c.usageLimit) // Prisma không so sánh 2 cột được
        .map((c) => ({
          code: c.code,
          type: c.type,
          value: c.value.toNumber(),
          minOrder: c.minOrder.toNumber(),
          maxDiscount: c.maxDiscount?.toNumber() ?? null,
          description: c.description,
          endsAt: c.endsAt.toISOString(),
          remaining: c.usageLimit == null ? null : c.usageLimit - c.usedCount,
        }))
        .sort((a, b) => promoWeight(b) - promoWeight(a))
        .slice(0, 6);
    });
  }

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateCouponDto) {
    this.checkRange(dto.startsAt, dto.endsAt);
    const coupon = await this.prisma.coupon.create({ data: dto });
    await this.menu.menuChanged(['promos']);
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    if (dto.startsAt && dto.endsAt) this.checkRange(dto.startsAt, dto.endsAt);
    const coupon = await this.prisma.coupon.update({ where: { id }, data: dto as Prisma.CouponUpdateInput });
    await this.menu.menuChanged(['promos']);
    return coupon;
  }

  /** Mã đã có đơn dùng thì không xóa được (đơn cũ tham chiếu tới mã) — chỉ cho kết thúc sớm hoặc ẩn. */
  async remove(id: string) {
    const used = await this.prisma.order.count({ where: { couponId: id } });
    if (used > 0) {
      throw new BadRequestException(`Mã đã được dùng trong ${used} đơn — hãy tắt hiển thị hoặc cho hết hạn thay vì xóa`);
    }
    await this.prisma.coupon.delete({ where: { id } });
    await this.menu.menuChanged(['promos']);
    return { ok: true };
  }

  private checkRange(start: Date, end: Date) {
    if (end <= start) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
  }
}

@ApiTags('coupons')
@Controller()
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get('coupons/public')
  listPublic() {
    return this.coupons.listPublic();
  }

  @Post('coupons/validate')
  @HttpCode(200)
  validate(@Body() dto: ValidateCouponDto) {
    return this.coupons.validate(dto);
  }

  @Get('admin/coupons')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  list() {
    return this.coupons.list();
  }

  @Post('admin/coupons')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Patch('admin/coupons/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(id, dto);
  }

  @Delete('admin/coupons/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coupons.remove(id);
  }
}

@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
})
export class CouponsModule {}
