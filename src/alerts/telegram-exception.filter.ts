import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TelegramAlertService } from './telegram-alert.service';

@Catch()
export class TelegramExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TelegramExceptionFilter.name);

  constructor(private readonly telegramAlertService: TelegramAlertService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Apenas intercepta erros 500+ (Erros de Servidor que os usuários não deveriam ver)
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const message = exception instanceof Error ? exception.message : 'Erro Desconhecido';
      
      // O NestJS já loga no console pelo logger nativo se não interceptarmos, 
      // então vamos logar aqui também para manter o comportamento padrão no PM2.
      this.logger.error(`Erro ${status} capturado no endpoint ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : '');

      // Formatação pro Telegram
      const alertMessage = `🔥 *ERRO ${status}: API Entrega Hub* 🔥\n\n*Endpoint:* \`${request.method} ${request.url}\`\n*Erro:* ${message}\n\n_Verifique os logs (PM2) para detalhes._`;

      // Envia de forma assíncrona para não travar a resposta da API
      this.telegramAlertService.sendAlert(alertMessage).catch(err => {
         this.logger.error('Falha interna ao tentar enviar alerta do ExceptionFilter', err);
      });
    }

    // Se a request já tiver sido resolvida, não tenta reenviar headers
    if (response.headersSent) {
      return;
    }

    // Devolve a resposta padrão para o cliente
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
