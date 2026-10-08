import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, OptionalJwtGuard, RolesGuard } from '../../common/guards';
import { PaginationQuery } from '../../common/pagination.dto';
import { PageResult } from '../../common/response.interceptor';
import { AdminOrderQuery, CreateOrderDto, UpdateOrderStatusDto } from './dto/orders.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Khách vãng lai và thành viên đều đặt được; có token thì đơn gắn với tài khoản. */
  @Post('orders')
  @UseGuards(OptionalJwtGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: AuthUser) {
    return this.orders.create(dto, user);
  }

  @Get('orders/me')
  @UseGuards(JwtAuthGuard)
  async mine(@CurrentUser() user: AuthUser, @Query() q: PaginationQuery) {
    const { items, total } = await this.orders.mine(user.id, q.page, q.limit);
    return new PageResult(items, q.page, q.limit, total);
  }

  @Get('orders/:code')
  @UseGuards(OptionalJwtGuard)
  byCode(@Param('code') code: string, @CurrentUser() user?: AuthUser) {
    return this.orders.byCode(code, user);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async adminList(@Query() q: AdminOrderQuery) {
    const { items, total } = await this.orders.adminList(q);
    return new PageResult(items, q.page, q.limit, total);
  }

  @Patch('admin/orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
