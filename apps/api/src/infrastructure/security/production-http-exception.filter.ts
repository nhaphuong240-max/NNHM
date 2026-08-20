import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/** T7-S2 / H-04 — hide stack traces in production responses. */
@Catch()
export class ProductionHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProductionHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      statusCode: status,
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      body =
        typeof res === 'string'
          ? { statusCode: status, message: res }
          : { ...(res as Record<string, unknown>), statusCode: status };
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, isProd ? undefined : exception.stack);
      if (!isProd) {
        body = {
          statusCode: status,
          message: exception.message,
          stack: exception.stack,
        };
      }
    }

    if (isProd && 'stack' in body) {
      delete body.stack;
    }

    response.status(status).json(body);
  }
}
