import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PHONE = /^(0|\+84)\d{9}$/;

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @Matches(PHONE, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  receiverName: string;

  @Matches(PHONE, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @IsString()
  @MinLength(3)
  street: string;

  @IsString()
  @MinLength(1)
  ward: string;

  @IsString()
  @MinLength(1)
  district: string;

  @IsString()
  @MinLength(1)
  city: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
