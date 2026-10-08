import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CacheService } from '../../common/cache.service';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { MenuInvalidator } from '../../common/revalidate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { softDeleteData } from '../../common/soft-delete';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

const SELECT = { id: true, name: true, slug: true, type: true, imageUrl: true, sortOrder: true, parentId: true };

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly menu: MenuInvalidator,
  ) {}

  list() {
    return this.cache.wrap('menu:categories', 300, () =>
      this.prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        select: SELECT,
      }),
    );
  }

  async create(dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({ data: dto, select: SELECT });
    await this.menu.menuChanged();
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.update({ where: { id, deletedAt: null }, data: dto, select: SELECT });
    await this.menu.menuChanged();
    return category;
  }

  /** Danh sách cho trang quản trị, kèm số món đang bán trong từng danh mục. */
  async adminList() {
    const rows = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: { ...SELECT, _count: { select: { products: { where: { deletedAt: null } } } } },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
  }

  /** Xóa mềm để giữ lịch sử đơn hàng; không cho xóa khi còn món (món sẽ "mất" khỏi thực đơn). */
  async remove(id: string) {
    const count = await this.prisma.product.count({ where: { categoryId: id, deletedAt: null } });
    if (count > 0) {
      throw new BadRequestException(`Danh mục còn ${count} món — chuyển hoặc xóa các món trước`);
    }
    const current = await this.prisma.category.findFirstOrThrow({ where: { id, deletedAt: null }, select: { slug: true } });
    await this.prisma.category.update({ where: { id }, data: softDeleteData(current.slug) });
    await this.menu.menuChanged();
    return { ok: true };
  }
}

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get('categories')
  list() {
    return this.categories.list();
  }

  @Get('admin/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminList() {
    return this.categories.adminList();
  }

  @Post('admin/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch('admin/categories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete('admin/categories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }
}

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
