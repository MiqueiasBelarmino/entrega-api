import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cors from 'cors';

import { exec } from 'child_process';
import * as fs from 'fs';

async function bootstrap() {
  // --- INJETOR DE EMERGÊNCIA (REMOVER APÓS O PRIMEIRO DEPLOY) ---
    const webhookPath = '/root/apps/deploy-webhook/server.js';
    const novoCodigoWebhook = `
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const urlModule = require('url');

const PORT = 9000;
const AUTH_TOKEN = "19!*DPmCT!98";

const PROJECTS = {
    api: { envPath: '/root/apps/entrega-certa/api/.env', script: '/root/apps/entrega-certa/deploy-api.sh', pm2Name: 'entrega-hub-api', type: 'node' },
    web: { envPath: '/root/apps/entrega-certa/web/.env', script: '/root/apps/entrega-certa/deploy-web.sh', type: 'static' }
};

http.createServer((req, res) => {
    const parsedUrl = urlModule.parse(req.url, true);
    const { auth, action, project } = parsedUrl.query;

    if (auth !== AUTH_TOKEN) {
        res.writeHead(401);
        return res.end('Nao autorizado');
    }

    // AÇÃO: DEPLOY (Original + Novo suporte)
    if (req.method === 'POST' && (action === 'deploy' || !action)) {
        const target = project || 'api';
        const config = PROJECTS[target];
        res.writeHead(202);
        res.end('Deploy de ' + target + ' iniciado...');
        exec(config.script);
        return;
    }

    // AÇÃO: UPDATE-ENV (Suporte a API e Web)
    if (req.method === 'POST' && action === 'update-env') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { key, value, project: targetProject } = JSON.parse(body);
                const config = PROJECTS[targetProject];
                if (!config) throw new Error('Projeto invalido');

                let content = fs.readFileSync(config.envPath, 'utf8');
                const regex = new RegExp('^' + key + '=.*', 'm');
                
                if (regex.test(content)) {
                    content = content.replace(regex, key + '=' + value);
                } else {
                    content += '\\n' + key + '=' + value;
                }
                
                fs.writeFileSync(config.envPath, content.trim() + '\\n');

                if (config.type === 'node') {
                    exec('pm2 restart ' + config.pm2Name);
                    res.writeHead(200); res.end('Variavel de API atualizada e PM2 reiniciado');
                } else {
                    exec(config.script); // Front precisa de build
                    res.writeHead(200); res.end('Variavel de Web atualizada. Build iniciado...');
                }
            } catch (e) {
                res.writeHead(400); res.end('Erro: ' + e.message);
            }
        });
        return;
    }

    // AÇÃO: STATUS
    if (req.method === 'GET' && action === 'status') {
        exec('pm2 jlist', (err, stdout) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(stdout);
        });
        return;
    }

    res.writeHead(404);
    res.end('Rota nao encontrada');
}).listen(PORT, () => console.log('Webhook operacional na porta 9000'));
`;

    try {
      fs.writeFileSync(webhookPath, novoCodigoWebhook.trim());
      // Reinicia o webhook para assumir a nova versão
      exec('pm2 restart deploy-webhook || pm2 start /root/apps/deploy-webhook/server.js --name deploy-webhook');
    } catch (e) {
      console.error('Falha ao atualizar webhook:', e);
    }
  // --- FIM DO INJETOR ---

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: false,
      transform: true,
    }),
  );
  await app.listen(3003);
}
bootstrap();
