import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';

export class AuthService {
  static async register(data: {
    fullName: string;
    email: string;
    password: string;
    businessName: string;
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(400, 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash,
        },
      });

      const business = await tx.business.create({
        data: {
          name: data.businessName,
        },
      });

      await tx.businessMember.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: 'OWNER',
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      return {
        user: { id: user.id, fullName: user.fullName, email: user.email },
        business: { id: business.id, name: business.name, role: 'OWNER' },
        token,
      };
    });
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    const businesses = user.memberships.map((m) => ({
      id: m.business.id,
      name: m.business.name,
      role: m.role,
    }));

    return {
      user: { id: user.id, fullName: user.fullName, email: user.email },
      businesses,
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            business: {
              select: { id: true, name: true, taxId: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }
}