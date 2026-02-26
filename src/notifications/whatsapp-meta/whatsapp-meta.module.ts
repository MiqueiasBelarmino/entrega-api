import { Module } from '@nestjs/common';
import { WhatsAppMetaService } from './whatsapp-meta.service';

@Module({
  providers: [WhatsAppMetaService],
  exports: [WhatsAppMetaService],
})
export class WhatsAppMetaModule {}
