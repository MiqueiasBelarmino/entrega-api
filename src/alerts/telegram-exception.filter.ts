import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TelegramAlertService } from './telegram-alert.service';
import { AlertException, AlertSeverity } from './exceptions/alert.exception';

@Catch()
export class TelegramExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TelegramExceptionFilter.name);

  constructor(private readonly telegramAlertService: TelegramAlertService) {}

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return '🚨';
      case AlertSeverity.WARNING: return '🟡';
      case AlertSeverity.INFO: return 'ℹ️';
      default: return '🔥';
    }
  }

  private extractUserInfo(request: any): string {
    if (!request.user) return 'Não autenticado';
    
    const userId = request.user.id || request.user.sub || request.user.userId;
    const role = request.user.role || request.user.type || '';
    
    return userId ? `ID: ${userId} ${role ? `(${role})` : ''}` : 'Autenticado (ID desconhecido)';
  }

  private formatContextData(context: Record<string, any>): string {
    if (!context || Object.keys(context).length === 0) return '';
    
    let contextStr = '\n\n*Contexto Adicional:*';
    for (const [key, value] of Object.entries(context)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
      contextStr += `\n- ${key}: \`${displayValue}\``;
    }
    return contextStr;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isAlertException = exception instanceof AlertException;

    // Intercepta erros críticos 500+ ou qualquer AlertException explícito (mesmo que seja < 500)
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR || isAlertException) {
      const message = exception instanceof Error ? exception.message : 'Erro Desconhecido';
      
      this.logger.error(`Erro ${status} capturado no endpoint ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : '');

      let alertMessage = '';
      const userInfo = this.extractUserInfo(request);

      if (isAlertException) {
        const emoji = this.getSeverityEmoji(exception.severity);
        const contextStr = this.formatContextData(exception.additionalContext);
        
        alertMessage = `${emoji} *${exception.title}* ${emoji}\n\n` +
                       `*Endpoint:* \`${request.method} ${request.url}\`\n` +
                       `*Usuário:* ${userInfo}\n` +
                       `*Erro:* ${message}` + 
                       contextStr;
      } else {
        // Formatação Padrão para Erros de Servidor (500) não previstos
        alertMessage = `🔥 *ERRO ${status}: API Entrega Hub* 🔥\n\n` +
                       `*Endpoint:* \`${request.method} ${request.url}\`\n` +
                       `*Usuário:* ${userInfo}\n` +
                       `*Erro:* ${message}\n\n` +
                       `_Verifique os logs (PM2) para detalhes._`;
      }

      this.telegramAlertService.sendAlert(alertMessage).catch(err => {
         this.logger.error('Falha interna ao tentar enviar alerta do ExceptionFilter', err);
      });
    }

    if (response.headersSent) {
      return;
    }

    if (exception instanceof HttpException) {
       response.status(status).json(exception.getResponse());
    } else {
       response.status(status).json({
         statusCode: status,
         message: 'Internal server error',
       });
    }
  }
}
