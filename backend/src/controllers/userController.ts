import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { CreateUserInput, UpdateUserInput, LoginInput } from '../types';

const prisma = new PrismaClient();

// Interface for user query parameters
interface UserQueryParams {
  page?: string;
  limit?: string;
}

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export class UserController {
  // GET /api/users - Get all users with pagination
  static async getUsers(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10' } = req.query as UserQueryParams;
      const skip = (Number(page) - 1) * Number(limit);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: Number(limit),
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.count(),
      ]);

      return ApiResponseUtil.paginated(res, users, Number(page), Number(limit), total, 'Users retrieved successfully');
    } catch (error) {
      console.error('Error getting users:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve users');
    }
  }

  // GET /api/users/:id - Get user by ID
  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return ApiResponseUtil.notFound(res, 'User not found');
      }

      return ApiResponseUtil.success(res, user, 'User retrieved successfully');
    } catch (error) {
      console.error('Error getting user:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve user');
    }
  }

  // POST /api/users - Create new user
  static async createUser(req: Request, res: Response) {
    try {
      const userData: CreateUserInput = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        return ApiResponseUtil.conflict(res, 'User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ApiResponseUtil.created(res, user, 'User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      return ApiResponseUtil.serverError(res, 'Failed to create user');
    }
  }

  // PUT /api/users/:id - Update user
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateUserInput = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return ApiResponseUtil.notFound(res, 'User not found');
      }

      // Check if email is being updated and already exists
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email },
        });

        if (emailExists) {
          return ApiResponseUtil.conflict(res, 'Email already in use');
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ApiResponseUtil.success(res, updatedUser, 'User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update user');
    }
  }

  // DELETE /api/users/:id - Delete user
  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return ApiResponseUtil.notFound(res, 'User not found');
      }

      // Delete user
      await prisma.user.delete({
        where: { id },
      });

      return ApiResponseUtil.success(res, null, 'User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      return ApiResponseUtil.serverError(res, 'Failed to delete user');
    }
  }

  // PATCH /api/users/:id/status - Toggle user active status
  static async toggleUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        return ApiResponseUtil.error(res, 'Active field must be a boolean');
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return ApiResponseUtil.notFound(res, 'User not found');
      }

      // Update user status
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { active: active },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ApiResponseUtil.success(res, updatedUser, 'User status updated successfully');
    } catch (error) {
      console.error('Error updating user status:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update user status');
    }
  }

  // POST /api/auth/login - User login
  static async login(req: Request, res: Response) {
    try {
      const { username, password }: LoginInput = req.body;

      // Find user by name (username)
      const user = await prisma.user.findFirst({
        where: { name: username },
      });

      if (!user) {
        return ApiResponseUtil.unauthorized(res, 'Invalid credentials');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return ApiResponseUtil.unauthorized(res, 'Invalid credentials');
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      return ApiResponseUtil.success(res, { user: userResponse, token }, 'Login successful');
    } catch (error) {
      console.error('Error during login:', error);
      return ApiResponseUtil.serverError(res, 'Login failed');
    }
  }

  // GET /api/auth/me - Get current user profile
  static async getProfile(req: Request, res: Response) {
    try {
      // Assuming we have middleware that adds user to request
      const userId = (req as AuthenticatedRequest).user?.userId;

      if (!userId) {
        return ApiResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return ApiResponseUtil.notFound(res, 'User not found');
      }

      return ApiResponseUtil.success(res, user, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Error getting profile:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve profile');
    }
  }
}