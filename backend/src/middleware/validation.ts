import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiResponseUtil } from '../utils/response';

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ApiResponseUtil.validationError(res, error.errors);
        return;
      }
      ApiResponseUtil.serverError(res, 'Error de validación');
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ApiResponseUtil.validationError(res, error.errors);
        return;
      }
      ApiResponseUtil.serverError(res, 'Error de validación');
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ApiResponseUtil.validationError(res, error.errors);
        return;
      }
      ApiResponseUtil.serverError(res, 'Error de validación');
    }
  };
};