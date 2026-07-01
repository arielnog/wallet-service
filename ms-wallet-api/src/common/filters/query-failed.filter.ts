import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

// intercepta apenas erros do TypeORM — HttpExceptions continuam sendo tratadas
// pelo filtro padrão do NestJS; mapeia violação de unique constraint para 409
@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const code = (exception.driverError as any)?.code as string;
    const isUniqueViolation =
      code === 'SQLITE_CONSTRAINT' || code === 'SQLITE_CONSTRAINT_UNIQUE';

    const status = isUniqueViolation
      ? HttpStatus.CONFLICT
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isUniqueViolation
      ? 'Registro já existe'
      : 'Erro interno do servidor';

    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      message,
      error: isUniqueViolation ? 'Conflict' : 'Internal Server Error',
    });
  }
}
