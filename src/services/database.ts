import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Product, IProduct } from '../models/product';
import { Conversation, IConversation } from '../models/conversation';
import { Customer, ICustomer } from '../models/customer';
import { Order, IOrder } from '../models/order';
import { Store, IStore } from '../models/store';

// In-memory fallback stores when MongoDB is not connected
export const localDb = {
  products: new Map<string, any>(),
  conversations: new Map<string, any>(),
  customers: new Map<string, any>(),
  orders: new Map<string, any>(),
  stores: new Map<string, any>(),
};

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'local-database.json');

export class DatabaseService {
  private static instance: DatabaseService;
  public isConnected: boolean = false;
  public useLocalFallback: boolean = false;

  private constructor() {
    this.loadLocalBackup();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    const uri = process.env.MONGODB_URI;

    if (!uri || uri.includes('user:pass@cluster')) {
      console.log('ℹ️ No valid MongoDB URI configured. Running with resilient local memory/file storage fallback.');
      this.useLocalFallback = true;
      this.initDefaultStore();
      return;
    }

    try {
      mongoose.set('strictQuery', false);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      this.isConnected = true;
      this.useLocalFallback = false;
      console.log('✅ Connected to MongoDB Atlas successfully.');
      await this.initDefaultStore();
    } catch (err: any) {
      console.warn(`⚠️ MongoDB connection failed (${err.message}). Using local JSON/memory database fallback.`);
      this.isConnected = false;
      this.useLocalFallback = true;
      this.initDefaultStore();
    }
  }

  private loadLocalBackup() {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.products) Object.entries(data.products).forEach(([k, v]) => localDb.products.set(k, v));
        if (data.conversations) Object.entries(data.conversations).forEach(([k, v]) => localDb.conversations.set(k, v));
        if (data.customers) Object.entries(data.customers).forEach(([k, v]) => localDb.customers.set(k, v));
        if (data.orders) Object.entries(data.orders).forEach(([k, v]) => localDb.orders.set(k, v));
        if (data.stores) Object.entries(data.stores).forEach(([k, v]) => localDb.stores.set(k, v));
      }
    } catch (e) {
      console.warn('Could not read local backup file:', e);
    }
  }

  public saveLocalBackup() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        products: Object.fromEntries(localDb.products),
        conversations: Object.fromEntries(localDb.conversations),
        customers: Object.fromEntries(localDb.customers),
        orders: Object.fromEntries(localDb.orders),
        stores: Object.fromEntries(localDb.stores),
      };
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving local backup:', e);
    }
  }

  private async initDefaultStore() {
    const storeId = 'store_priya_001';
    const defaultData = {
      storeId,
      name: process.env.STORE_NAME || "Priya's Cakes",
      owner: 'priya@email.com',
      channels: {
        whatsapp: {
          enabled: true,
          number: process.env.STORE_PHONE || '919876543210',
        },
      },
      settings: {
        agentPersonality: 'warm, friendly, uses emojis, helpful pastry and gift consultant',
        languages: ['en', 'hi', 'hi-en', 'es', 'ar', 'pt'],
        currency: process.env.STORE_CURRENCY || 'INR',
        upsellAggressiveness: parseFloat(process.env.STORE_UPSELL_AGGRESSIVENESS || '0.5'),
        paymentUPI: process.env.STORE_UPI || 'priya@paytm',
        lowStockAlert: 5,
        freeShippingThreshold: 1000,
      },
      subscription: {
        plan: 'free',
        conversationsUsed: 0,
        conversationsLimit: 500,
      },
    };

    if (this.isConnected) {
      const exists = await Store.findOne({ storeId });
      if (!exists) {
        await Store.create(defaultData);
      }
    } else {
      if (!localDb.stores.has(storeId)) {
        localDb.stores.set(storeId, { _id: storeId, ...defaultData, createdAt: new Date(), updatedAt: new Date() });
        this.saveLocalBackup();
      }
    }
  }

  // Generic Helpers
  public async getStore(storeId: string = 'store_priya_001'): Promise<any> {
    if (this.isConnected) {
      return (await Store.findOne({ storeId }).lean()) || (await Store.findOne().lean());
    }
    return localDb.stores.get(storeId) || Array.from(localDb.stores.values())[0];
  }

  public async updateStoreSettings(storeId: string = 'store_priya_001', updates: any): Promise<any> {
    if (this.isConnected) {
      return await Store.findOneAndUpdate({ storeId }, { $set: updates }, { new: true, upsert: true });
    }
    const current = (await this.getStore(storeId)) || { storeId };
    const merged = { ...current, ...updates, updatedAt: new Date() };
    localDb.stores.set(storeId, merged);
    this.saveLocalBackup();
    return merged;
  }
}

export const dbService = DatabaseService.getInstance();
