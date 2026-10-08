import { PartialType } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { IMAGE_URL_PATTERN } from '@foodhub/shared';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  name: string;

  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang' })
  slug: string;

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsOptional()
  @Matches(IMAGE_URL_PATTERN, { message: 'Ảnh phải là URL https hoặc đường dẫn /uploads/…' })
  imageUrl?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
