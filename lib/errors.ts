/**
 * Centralized error classes for Signalist.
 * Provides structured, typed errors across all services.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Unauthorized', context?: Record<string, unknown>) {
    super(message, 401, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 404, true, context);
  }
}

export class ExternalApiError extends AppError {
  public readonly service: string;
  public readonly originalError?: unknown;

  constructor(
    service: string,
    message: string,
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(`[${service}] ${message}`, 502, true, context);
    this.service = service;
    this.originalError = originalError;
  }
}

export class DuplicateError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 409, true, context);
  }
}
