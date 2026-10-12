import { DeliveryType, OrderStatus, PaymentMethod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQuery } from '../../../common/pagination.dto';

export class OrderItemInput {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  optionIds: string[] = [];
}

export class DeliveryAddressInput {
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
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng trống' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @MinLength(2)
  customerName: string;

  @Matches(/^(0|\+84)\d{9}$/, { message: 'Số điện thoại không hợp lệ' })
  customerPhone: string;

  @ValidateIf((o: CreateOrderDto) => o.deliveryType === 'DELIVERY')
  @IsDefined({ message: 'Vui lòng nhập địa chỉ giao hàng' })
  @ValidateNested()
  @Type(() => DeliveryAddressInput)
  address?: DeliveryAddressInput;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : undefined))
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class AdminOrderQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** Tìm theo mã đơn, số điện thoại hoặc tên khách */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  q?: string;
}
