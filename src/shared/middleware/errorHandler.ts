// Global error handling middleware
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { appConfig } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

class ErrorHandler {
  // Handle different types of errors
  private handleCastError(error: any): AppError {
    const message = `Invalid ${error.path}: ${error.value}`;
    return this.createError(message, 400);
  }

  private handleDuplicateFieldsError(error: any): AppError {
    const value = error.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return this.createError(message, 400);
  }

  private handleValidationError(error: any): AppError {
    const errors = Object.values(error.errors).map((el: any) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return this.createError(message, 400);
  }

  private handleJWTError(): AppError {
    return this.createError('Invalid token. Please log in again!', 401);
  }

  private handleJWTExpiredError(): AppError {
    return this.createError('Your token has expired! Please log in again.', 401);
  }

  private handlePostgresError(error: any): AppError {
    switch (error.code) {
      case '23505': // Unique violation
        return this.createError('Duplicate entry. This record already exists.', 409);
      case '23503': // Foreign key violation
        return this.createError('Referenced record does not exist.', 400);
      case '23502': // Not null violation
        return this.createError('Required field is missing.', 400);
      case '22001': // String data too long
        return this.createError('Input data is too long.', 400);
      default:
        return this.createError('Database operation failed.', 500);
    }
  }

  private createError(message: string, statusCode: number): AppError {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
  }

  private sendErrorDev(error: AppError, res: Response): void {
    const response: ApiResponse = {
      success: false,
      message: error.message,
      error: error.message,
      data: {
        stack: error.stack,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      },
    };

    res.status(error.statusCode || 500).json(response);
  }

  private sendErrorProd(error: AppError, res: Response): void {
    // Operational, trusted error: send message to client
    if (error.isOperational) {
      const response: ApiResponse = {
        success: false,
        message: error.message,
        error: error.message,
      };

      res.status(error.statusCode || 500).json(response);
    } else {
      // Programming or other unknown error: don't leak error details
      console.error('ERROR 💥', error);

      const response: ApiResponse = {
        success: false,
        message: 'Something went wrong!',
        error: 'Internal server error',
      };

      res.status(500).json(response);
    }
  }

  public globalErrorHandler = (
    error: AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    error.statusCode = error.statusCode || 500;

    let processedError = { ...error };
    processedError.message = error.message;

    // Handle specific error types
    if (error.name === 'CastError') {
      processedError = this.handleCastError(processedError);
    }
    
    if (error.code === 11000) {
      processedError = this.handleDuplicateFieldsError(processedError);
    }
    
    if (error.name === 'ValidationError') {
      processedError = this.handleValidationError(processedError);
    }
    
    if (error.name === 'JsonWebTokenError') {
      processedError = this.handleJWTError();
    }
    
    if (error.name === 'TokenExpiredError') {
      processedError = this.handleJWTExpiredError();
    }

    // Handle PostgreSQL errors
    if (error.code && typeof error.code === 'string' && error.code.match(/^[0-9]{5}$/)) {
      processedError = this.handlePostgresError(error);
    }

    if (appConfig.app.env === 'development') {
      this.sendErrorDev(processedError, res);
    } else {
      this.sendErrorProd(processedError, res);
    }
  };

  // Async error wrapper
  public catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      fn(req, res, next).catch(next);
    };
  };

  // 404 handler
  public notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    const error = this.createError(`Can't find ${req.originalUrl} on this server!`, 404);
    next(error);
  };
}

export const errorHandlerInstance = new ErrorHandler();

export const globalErrorHandler = errorHandlerInstance.globalErrorHandler;
export const catchAsync = errorHandlerInstance.catchAsync;
export const notFoundHandler = errorHandlerInstance.notFoundHandler;
export const errorHandler = errorHandlerInstance.globalErrorHandler;

export default errorHandlerInstance;