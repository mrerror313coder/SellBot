import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { pino } from 'pino';
import { sentryService } from './sentry';

export interface IncomingWhatsAppMessage {
  from: string;
  senderName?: string;
  body: string;
  mediaType: 'text' | 'image' | 'voice' | 'audio' | 'document';
  rawMessage?: proto.IWebMessageInfo;
  timestamp: number;
}

export type WhatsAppMessageHandler = (msg: IncomingWhatsAppMessage) => Promise<string | void>;

export class WhatsAppService {
  private static instance: WhatsAppService;
  public sock: WASocket | null = null;
  public qrCodeRaw: string | null = null;
  public qrCodeDataUrl: string | null = null;
  public isConnected: boolean = false;
  public isConnecting: boolean = false;
  private messageHandlers: WhatsAppMessageHandler[] = [];
  private authDir: string;

  private constructor() {
    this.authDir = path.resolve(process.env.WHATSAPP_SESSION_PATH || './auth/baileys-session');
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  public onMessage(handler: WhatsAppMessageHandler) {
    this.messageHandlers.push(handler);
  }

  public async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) return;
    this.isConnecting = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['SellBot Agent', 'Chrome', '1.0.0'],
        syncFullHistory: false,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCodeRaw = qr;
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr);
          } catch (e) {
            console.error('Failed to generate QR data URL:', e);
          }
          console.log('\n================== SCAN WHATSAPP QR CODE ==================');
          qrcodeTerminal.generate(qr, { small: true });
          console.log('You can also scan this QR in the SellBot Web Dashboard at /');
          console.log('===========================================================\n');
        }

        if (connection === 'close') {
          this.isConnected = false;
          this.isConnecting = false;
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.warn(`WhatsApp socket closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

          if (shouldReconnect) {
            setTimeout(() => this.connect(), 5000);
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.isConnecting = false;
          this.qrCodeRaw = null;
          this.qrCodeDataUrl = null;
          console.log('🎉 SellBot WhatsApp connection established successfully!');
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const from = msg.key.remoteJid;
          if (!from || from.includes('@g.us')) continue; // Ignore groups for MVP 1-on-1 sales

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

          let mediaType: 'text' | 'image' | 'voice' | 'audio' | 'document' = 'text';
          if (msg.message.imageMessage) mediaType = 'image';
          else if (msg.message.audioMessage) mediaType = 'voice';
          else if (msg.message.documentMessage) mediaType = 'document';

          const incoming: IncomingWhatsAppMessage = {
            from,
            senderName: msg.pushName || 'Customer',
            body: text,
            mediaType,
            rawMessage: msg,
            timestamp: typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : Date.now(),
          };

          // Send typing indicator (Human-like presence)
          try {
            await this.sock?.presenceSubscribe(from);
            await this.sock?.sendPresenceUpdate('composing', from);
            await new Promise((r) => setTimeout(r, 1200));
            await this.sock?.sendPresenceUpdate('paused', from);
          } catch (e) {
            // non-fatal
          }

          for (const handler of this.messageHandlers) {
            try {
              const reply = await handler(incoming);
              if (reply && this.sock) {
                await this.sendMessage(from, reply);
              }
            } catch (err: any) {
              sentryService.captureException(err, { context: 'whatsapp_message_handling', from });
            }
          }
        }
      });
    } catch (err: any) {
      this.isConnecting = false;
      this.isConnected = false;
      console.warn(`WhatsApp initialization warning (${err.message}). Web Simulator is ready.`);
    }
  }

  public async sendMessage(to: string, content: string | { text: string; image?: Buffer; audio?: Buffer }): Promise<boolean> {
    if (!this.sock || !this.isConnected) {
      console.log(`[WhatsApp Outgoing Simulation to ${to}]: ${typeof content === 'string' ? content : content.text}`);
      return true;
    }

    try {
      if (typeof content === 'string') {
        await this.sock.sendMessage(to, { text: content });
      } else if (content.image) {
        await this.sock.sendMessage(to, { image: content.image, caption: content.text });
      } else if (content.audio) {
        await this.sock.sendMessage(to, { audio: content.audio, mimetype: 'audio/mp4', ptt: true });
      } else {
        await this.sock.sendMessage(to, { text: content.text });
      }
      return true;
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      return false;
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      qrAvailable: !!this.qrCodeDataUrl,
      qrCodeDataUrl: this.qrCodeDataUrl,
      authDir: this.authDir,
    };
  }
}

export const whatsappService = WhatsAppService.getInstance();
