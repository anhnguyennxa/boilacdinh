import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../common/cache.service';
import { MenuInvalidator } from '../../common/revalidate.service';
import { serialize } from '../../common/response.interceptor';
import { PrismaService } from '../../prisma/prisma.service';
import { softDeleteData } from '../../common/soft-delete';
import { CreateProductDto, OptionGroupInput, ProductQuery, UpdateProductDto } from './dto/products.dto';

export const PRODUCT_SUMMARY = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  imageUrl: true,
  isAvailable: true,
  isFeatured: true,
  soldCount: true,
  ratingAvg: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true, type: true } },
} satisfies Prisma.ProductSelect;

const PRODUCT_DETAIL = {
  ...PRODUCT_SUMMARY,
  description: true,
  images: { select: { id: true, url: true }, orderBy: { sortOrder: 'asc' } },
  optionGroups: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      isRequired: true,
      maxSelect: true,
      options: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, extraPrice: true } },
    },
  },
} satisfies Prisma.ProductSelect;

const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  popular: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  price_asc: [{ basePrice: 'asc' }],
  price_desc: [{ basePrice: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { soldCount: 'desc' }],
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly menu: MenuInvalidator,
  ) {}

  async list(query: ProductQuery) {
    const key = `menu:products:${JSON.stringify(query)}`;
    return this.cache.wrap(key, 300, () => this.queryList(query));
  }

  private async queryList(query: ProductQuery) {
    const where: Prisma.ProductWhereInput = { deletedAt: null, category: { deletedAt: null } };
    if (query.category) where.category = { slug: query.category, deletedAt: null };
    if (query.featured) where.isFeatured = true;
    if (query.minPrice != null || query.maxPrice != null) {
      where.basePrice = { gte: query.minPrice, lte: query.maxPrice };
    }
    if (query.q?.trim()) {
      where.id = { in: await this.searchIds(query.q.trim()) };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_SUMMARY,
        orderBy: [{ isAvailable: 'desc' }, ...ORDER_BY[query.sort ?? 'popular']],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: serialize<unknown[]>(items), total };
  }

  /**
   * Tìm gần đúng, không phân biệt dấu: dùng f_unaccent + pg_trgm (chỉ mục GIN trong migration).
   * Ví dụ "tra sua" khớp "Trà sữa trân châu"; similarity bắt lỗi gõ nhẹ.
   */
  private async searchIds(q: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM products
      WHERE deleted_at IS NULL
        AND (f_unaccent(lower(name)) LIKE '%' || f_unaccent(lower(${q})) || '%'
             OR similarity(f_unaccent(lower(name)), f_unaccent(lower(${q}))) > 0.3)
      LIMIT 200`;
    return rows.map((r) => r.id);
  }

  async bySlug(slug: string) {
    const product = await this.cache.wrap(`menu:product:${slug}`, 300, async () => {
      const p = await this.prisma.product.findFirst({
        where: { slug, deletedAt: null },
        select: PRODUCT_DETAIL,
      });
      return p ? serialize(p) : null;
    });
    if (!product) throw new NotFoundException('Không tìm thấy món');
    return product;
  }

  async related(slug: string, limit = 4) {
    const product = await this.prisma.product.findFirst({ where: { slug }, select: { id: true, categoryId: true } });
    if (!product) throw new NotFoundException('Không tìm thấy món');
    return this.prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, deletedAt: null, isAvailable: true },
      select: PRODUCT_SUMMARY,
      orderBy: { soldCount: 'desc' },
      take: limit,
    });
  }

  async adminList(query: ProductQuery) {
    return this.queryList(query);
  }

  async create(dto: CreateProductDto) {
    const { optionGroups, ...data } = dto;
    const product = await this.prisma.product.create({
      data: { ...data, optionGroups: optionGroups ? { create: this.groupsInput(optionGroups) } : undefined },
      select: PRODUCT_DETAIL,
    });
    await this.menu.menuChanged();
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const { optionGroups, ...data } = dto;
    const product = await this.prisma.$transaction(async (tx) => {
      if (optionGroups) await tx.optionGroup.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id, deletedAt: null },
        data: { ...data, optionGroups: optionGroups ? { create: this.groupsInput(optionGroups) } : undefined },
        select: PRODUCT_DETAIL,
      });
    });
    await this.menu.menuChanged();
    return product;
  }

  /** Xóa mềm: đơn cũ vẫn tham chiếu được món. */
  async remove(id: string) {
    const current = await this.prisma.product.findFirstOrThrow({ where: { id, deletedAt: null }, select: { slug: true } });
    await this.prisma.product.update({ where: { id }, data: softDeleteData(current.slug) });
    await this.menu.menuChanged();
    return { ok: true };
  }

  private groupsInput(groups: OptionGroupInput[]): Prisma.OptionGroupCreateWithoutProductInput[] {
    return groups.map((g, gi) => ({
      name: g.name,
      isRequired: g.isRequired,
      maxSelect: g.maxSelect,
      sortOrder: gi,
      options: { create: g.options.map((o, oi) => ({ name: o.name, extraPrice: o.extraPrice, sortOrder: oi })) },
    }));
  }
}
