import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REUSE_GRACE_MS = 30_000;

const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

export function toUserDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email đã được sử dụng');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName.trim(),
        phone: dto.phone,
        passwordHash: await argon2.hash(dto.password),
      },
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = user?.passwordHash && user.isActive && (await argon2.verify(user.passwordHash, dto.password));
    if (!user || !valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.issueTokens(user);
  }

  /** Xoay vòng refresh token: token cũ bị thu hồi, dùng lại token đã thu hồi sẽ thu hồi toàn bộ phiên. */
  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
    if (stored.revoked) {
      // Hai request refresh song song (nhiều tab, StrictMode) là bình thường: chỉ coi là đánh cắp token
      // khi token đã bị thu hồi quá khoảng ân hạn.
      if (Date.now() - stored.updatedAt.getTime() > REUSE_GRACE_MS) {
        await this.prisma.refreshToken.updateMany({ where: { userId: stored.userId }, data: { revoked: true } });
      }
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    return this.issueTokens(stored.user);
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawToken) },
      data: { revoked: true },
    });
  }

  private async issueTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken, user: toUserDto(user) };
  }
}
