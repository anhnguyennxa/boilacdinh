import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IMAGE_URL_PATTERN } from '@foodhub/shared';
import { PaginationQuery } from '../../../common/pagination.dto';

export const PRODUCT_SORTS = ['popular', 'newest', 'price_asc', 'price_desc', 'rating'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export class ProductQuery extends PaginationQuery {
  /** slug danh mục */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: ProductSort;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;
}

export class OptionInput {
  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(0)
  extraPrice: number;
}

export class OptionGroupInput {
  @IsString()
  @MinLength(1)
  name: string;

  @IsBoolean()
  isRequired: boolean;

  @IsInt()
  @Min(1)
  @Max(20)
  maxSelect: number;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OptionInput)
  options: OptionInput[];
}

export class CreateProductDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang' })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  basePrice: number;

  /** https://… (Cloudinary/S3) hoặc /uploads/… (ảnh đã tải lên); gửi null để gỡ ảnh */
  @IsOptional()
  @Matches(IMAGE_URL_PATTERN, { message: 'Ảnh phải là URL https hoặc đường dẫn /uploads/…' })
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionGroupInput)
  optionGroups?: OptionGroupInput[];
}

/** Khi cập nhật, nếu gửi optionGroups thì thay thế toàn bộ nhóm tùy chọn. */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
