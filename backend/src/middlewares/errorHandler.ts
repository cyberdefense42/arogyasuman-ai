import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err as AppError;
  
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Security logging - don't expose sensitive information
  const logData = {
    requestId,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  // Different log levels based on error type
  if (error.statusCode >= 500) {
    logger.error('Server error occurred:', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error occurred:', logData);
  }

  // Handle specific error types
  if (err instanceof ZodError) {
    const message = 'Validation failed';
    const details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    error = new AppError(message, 400);
    error.details = details;
  }

  // JWT errors
  if (err instanceof JsonWebTokenError) {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err instanceof TokenExpiredError) {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      const message = 'Duplicate entry';
      error = new AppError(message, 409);
    }
    if (prismaError.code === 'P2025') {
      const message = 'Resource not found';
      error = new AppError(message, 404);
    }
  }

  // Rate limiting
  if ((error as any).code === 'RATE_LIMITED') {
    const message = 'Too many requests';
    error = new AppError(message, 429);
  }

  // File upload errors
  if ((error as any).code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new AppError(message, 413);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Security: Don't expose internal errors in production
  let responseMessage = error.message;
  if (statusCode >= 500 && isProduction) {
    responseMessage = 'Internal server error';
  }

  const errorResponse: any = {
    success: false,
    error: responseMessage,
    requestId
  };

  // Include additional details for client errors (400-499)
  if (statusCode < 500 && error.details) {
    errorResponse.details = error.details;
  }

  // Include stack trace only in development
  if (!isProduction && error.stack) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};