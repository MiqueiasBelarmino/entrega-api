import { HttpException, HttpStatus } from '@nestjs/common';

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export interface AlertExceptionOptions {
  title?: string;
  severity?: AlertSeverity;
  status?: HttpStatus;
  context?: Record<string, any>;
}

export class AlertException extends HttpException {
  public readonly title: string;
  public readonly severity: AlertSeverity;
  public readonly additionalContext: Record<string, any>;

  constructor(
    message: string,
    options?: AlertExceptionOptions,
  ) {
    const status = options?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    super(message, status);

    this.title = options?.title || 'Alerta de Sistema';
    this.severity = options?.severity || AlertSeverity.CRITICAL;
    this.additionalContext = options?.context || {};
  }
}
