import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../../config/database';
import { config } from '../../config';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import { ERROR_CODES } from '../../utils/constants';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

const toPublicUser = (user: { id: string; name: string; email: string; role: string; createdAt: Date }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiry,
  } as SignOptions);
};

export const register = async (input: { name: string; email: string; password: string }) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new ConflictError('Email is already registered', ERROR_CODES.EMAIL_ALREADY_EXISTS);
  }

  const passwordHash = await bcrypt.hash(input.password, config.auth.bcryptRounds);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    },
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return { user: toPublicUser(user), token };
};

export const login = async (input: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new UnauthorizedError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return { user: toPublicUser(user), token };
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('User not found', ERROR_CODES.TOKEN_INVALID);
  }
  return toPublicUser(user);
};
