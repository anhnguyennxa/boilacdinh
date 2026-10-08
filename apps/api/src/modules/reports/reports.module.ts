import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PaymentMethod } from '@prisma/client';
import type { RevenueReportDto, RevenueSummary, TopProductDto } from '@foodhub/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveRange } from './date-range';

class RangeQuery {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

class TopQuery extends RangeQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

/** created_at lưu UTC (timestamp không múi giờ) → đổi sang ngày theo giờ Việt Nam */
const VN_DATE = `((o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;

type SummaryRow = { orders: bigint; completed: bigint; cancelled: bigint; revenue: unknown };

const num = (v: unknown) => (v == null ? 0 : Number(v));

function toSummary(r: SummaryRow | undefined): RevenueSummary {
  const completed = num(r?.completed);
  const revenue = num(r?.revenue);
  return {
    revenue,
    orders: num(r?.orders),
    completed,
    cancelled: num(r?.cancelled),
    avgOrderValue: completed ? Math.round(revenue / completed) : 0,
  };
}

/** Doanh thu = tổng tiền đơn đã hoàn thành (COD thu tiền khi giao xong; online đã thu trước đó). */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private summary(from: string, to: string) {
    return this.prisma.$queryRawUnsafe<SummaryRow[]>(
      `SELECT count(*) AS orders,
              count(*) FILTER (WHERE o.status = 'COMPLETED') AS completed,
              count(*) FILTER (WHERE o.status = 'CANCELLED') AS cancelled,
              coalesce(sum(o.total) FILTER (WHERE o.status = 'COMPLETED'), 0) AS revenue
         FROM orders o
        WHERE ${VN_DATE} BETWEEN $1::date AND $2::date`,
      from,
      to,
    );
  }

  async revenue(q: RangeQuery): Promise<RevenueReportDto> {
    const range = resolveRange(q.from, q.to);

    // generate_series để ngày không có đơn vẫn có điểm 0 trên biểu đồ
    const series = await this.prisma.$queryRawUnsafe<
      { date: string; orders: bigint; completed: bigint; cancelled: bigint; revenue: unknown }[]
    >(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              count(o.id) AS orders,
              count(o.id) FILTER (WHERE o.status = 'COMPLETED') AS completed,
              count(o.id) FILTER (WHERE o.status = 'CANCELLED') AS cancelled,
              coalesce(sum(o.total) FILTER (WHERE o.status = 'COMPLETED'), 0) AS revenue
         FROM generate_series($1::date, $2::date, interval '1 day') AS d
         LEFT JOIN orders o ON ${VN_DATE} = d::date
        GROUP BY d
        ORDER BY d`,
      range.from,
      range.to,
    );

    const [current, previous, byPayment] = await Promise.all([
      this.summary(range.from, range.to),
      this.summary(range.previous.from, range.previous.to),
      this.prisma.$queryRawUnsafe<{ method: PaymentMethod; orders: bigint; revenue: unknown }[]>(
        `SELECT o.payment_method AS method, count(*) AS orders, coalesce(sum(o.total), 0) AS revenue
           FROM orders o
          WHERE o.status = 'COMPLETED' AND ${VN_DATE} BETWEEN $1::date AND $2::date
          GROUP BY o.payment_method
          ORDER BY revenue DESC`,
        range.from,
        range.to,
      ),
    ]);

    return {
      from: range.from,
      to: range.to,
      series: series.map((r) => ({
        date: r.date,
        revenue: num(r.revenue),
        orders: num(r.orders),
        completed: num(r.completed),
        cancelled: num(r.cancelled),
      })),
      summary: toSummary(current[0]),
      previous: toSummary(previous[0]),
      byPayment: byPayment.map((r) => ({ method: r.method, orders: num(r.orders), revenue: num(r.revenue) })),
    };
  }

  /** Món bán chạy theo doanh thu trong khoảng (đơn hoàn thành); gộp theo món, giữ tên đã chụp lúc đặt. */
  async topProducts(q: TopQuery): Promise<TopProductDto[]> {
    const range = resolveRange(q.from, q.to);
    const rows = await this.prisma.$queryRawUnsafe<
      { product_id: string | null; name: string; quantity: bigint; revenue: unknown }[]
    >(
      `SELECT i.product_id, max(i.product_name) AS name, sum(i.quantity) AS quantity, sum(i.line_total) AS revenue
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
        WHERE o.status = 'COMPLETED' AND ${VN_DATE} BETWEEN $1::date AND $2::date
        GROUP BY i.product_id
        ORDER BY revenue DESC
        LIMIT $3`,
      range.from,
      range.to,
      q.limit,
    );
    return rows.map((r) => ({ productId: r.product_id, name: r.name, quantity: num(r.quantity), revenue: num(r.revenue) }));
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  revenue(@Query() q: RangeQuery) {
    return this.reports.revenue(q);
  }

  @Get('top-products')
  topProducts(@Query() q: TopQuery) {
    return this.reports.topProducts(q);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
