import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import dotenv from 'dotenv';
dotenv.config();

import { dbService, localDb } from '../src/services/database';
import { aiService } from '../src/services/ai';
import { Product } from '../src/models/product';
import { Conversation } from '../src/models/conversation';
import { Customer } from '../src/models/customer';
import { Order } from '../src/models/order';

async function seed() {
  console.log('🌱 Starting SellBot Database Seeding...');
  await dbService.connect();

  const csvPath = path.join(__dirname, 'sample-products.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const rows: any[] = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📦 Found ${rows.length} products in CSV. Generating 768-dim embeddings...`);

  let count = 0;
  for (const row of rows) {
    const name = row.name;
    const description = row.description;
    const category = (row.category || 'general').split(',').map((c: string) => c.trim().toLowerCase());
    const price = parseFloat(row.price);
    const sku = row.sku;
    const quantity = parseInt(row.quantity || '15', 10);
    const rating = parseFloat(row.rating || '4.8');
    const tags = (row.tags || '').split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);

    const embedding = await aiService.generateEmbedding(`${name} ${description} ${tags.join(' ')} ${category.join(' ')}`);

    const productDoc = {
      storeId: 'store_priya_001',
      name,
      description,
      category,
      price,
      currency: 'INR',
      sku,
      inventory: {
        inStock: quantity > 0,
        quantity,
        lowStockThreshold: 5,
      },
      attributes: {
        weight: row.weight || '500g',
        material: row.material || 'Artisan',
        occasion: row.occasion ? row.occasion.split(',') : ['celebration'],
      },
      images: ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'],
      rating,
      reviewCount: Math.floor(Math.random() * 150) + 20,
      tags,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbService.isConnected) {
      await Product.findOneAndUpdate({ sku }, { $set: productDoc }, { upsert: true });
    } else {
      localDb.products.set(sku, { _id: sku, ...productDoc });
    }
    count++;
  }

  console.log(`✅ Loaded ${count} products with vector embeddings.`);

  // Seed sample customers & conversations from PRD Section 14.2
  const sampleConversations = [
    {
      channelId: 'whatsapp:919876543210@s.whatsapp.net',
      customerName: 'Rahul Sharma',
      status: 'sold',
      messages: [
        {
          role: 'customer',
          content: 'Mujhe kuch gift chahiye girlfriend ke liye, budget 500',
          language: 'hi-en',
          timestamp: new Date(Date.now() - 3600000 * 2),
        },
        {
          role: 'agent',
          content: "Zaroor! Priya's Cakes mein girlfriend ke liye hamara *Assorted Cupcake Box (Pack of 6)* (₹450) ekdum perfect hai! 🧁 Romantic packaging aur 6 luxury flavors ke sath aata hai. Kya gift wrapping add karein?",
          language: 'hi-en',
          toolsUsed: ['language_detector', 'intent_classifier', 'catalog_search'],
          reasoning: 'Detected gift intent for girlfriend, budget 500 INR. Recommended Cupcake Box (₹450)',
          tokensUsed: 145,
          latencyMs: 2340,
          timestamp: new Date(Date.now() - 3600000 * 2 + 3000),
        },
        {
          role: 'customer',
          content: 'Haan, please book it and send UPI QR',
          language: 'hi-en',
          timestamp: new Date(Date.now() - 3600000 * 2 + 60000),
        },
        {
          role: 'agent',
          content: '🎉 Order Confirmed! Total Payable: ₹450. Scan the UPI QR below or use UPI ID: priya@paytm',
          language: 'hi-en',
          toolsUsed: ['price_calculator', 'payment_qr', 'order_creator'],
          reasoning: 'Customer confirmed purchase. Generated order and UPI QR.',
          tokensUsed: 160,
          latencyMs: 1800,
          timestamp: new Date(Date.now() - 3600000 * 2 + 62000),
        },
      ],
      context: {
        detectedIntent: 'buy',
        extractedEntities: { recipient: 'girlfriend', budget: 500, currency: 'INR' },
        cartItems: [{ name: 'Assorted Cupcake Box (Pack of 6)', quantity: 1, price: 450, sku: 'CUP-ASS-001' }],
        totalValue: 450,
      },
    },
    {
      channelId: 'whatsapp:919811223344@s.whatsapp.net',
      customerName: 'Priya Patel',
      status: 'active',
      messages: [
        {
          role: 'customer',
          content: 'Mujhe kal ke liye 2kg chocolate cake chahiye, budget 800 hai',
          language: 'hi-en',
          timestamp: new Date(Date.now() - 1800000),
        },
        {
          role: 'agent',
          content: 'Kal ke liye chocolate cake — bilkul! 🎂\n\nYeh raha best option:\n• *Choco Truffle Cake* (₹750, 4.8 ⭐)\n• Eggless available!\n• Delivery: Kal 10am\n\nBudget mein fit hai! ₹50 bachega. Kya candles (+₹30) ya balloon decor (+₹50) add karna hai?',
          language: 'hi-en',
          toolsUsed: ['language_detector', 'intent_classifier', 'catalog_search'],
          reasoning: 'Detected chocolate cake query, kal delivery, budget 800 INR',
          tokensUsed: 180,
          latencyMs: 2100,
          timestamp: new Date(Date.now() - 1797000),
        },
      ],
      context: {
        detectedIntent: 'browse',
        extractedEntities: { occasion: 'tomorrow', budget: 800, currency: 'INR' },
        cartItems: [{ name: 'Chocolate Truffle Cake', quantity: 1, price: 750, sku: 'CAKE-CHO-001' }],
        totalValue: 750,
      },
    },
    {
      channelId: 'whatsapp:919955443322@s.whatsapp.net',
      customerName: 'Amit Verma',
      status: 'sold',
      messages: [
        {
          role: 'customer',
          content: 'Eggless options available hai?',
          language: 'hi-en',
          timestamp: new Date(Date.now() - 5400000),
        },
        {
          role: 'agent',
          content: 'Haan ji! Hamare paas 100% pure vegetarian Eggless options hain: *Eggless Vanilla Cake* (₹600) aur *Eggless Chocolate Truffle* (₹750). Dono super soft and freshly baked!',
          language: 'hi-en',
          toolsUsed: ['catalog_search'],
          reasoning: 'Filter eggless items and explain vegetarian preparation',
          tokensUsed: 130,
          latencyMs: 1900,
          timestamp: new Date(Date.now() - 5397000),
        },
      ],
      context: {
        detectedIntent: 'buy',
        extractedEntities: { productKeyword: 'eggless' },
        cartItems: [{ name: 'Eggless Vanilla Cake', quantity: 1, price: 600, sku: 'CAKE-VAN-001' }],
        totalValue: 600,
      },
    },
    {
      channelId: 'whatsapp:919777888999@s.whatsapp.net',
      customerName: 'Sneha Roy',
      status: 'escalated',
      messages: [
        {
          role: 'customer',
          content: 'The cake delivered was damaged and smudged in transport. Refund please!',
          language: 'en',
          timestamp: new Date(Date.now() - 7200000),
        },
        {
          role: 'agent',
          content: 'We are truly sorry for this! 🙏 We have escalated this directly to Priya (Owner) for an immediate replacement or full refund. A human representative will assist you in 5 minutes.',
          language: 'en',
          toolsUsed: ['intent_classifier'],
          reasoning: 'Complaint detected: damaged item. Escalated to human handoff.',
          tokensUsed: 110,
          latencyMs: 1500,
          timestamp: new Date(Date.now() - 7198000),
        },
      ],
      context: {
        detectedIntent: 'complain',
        extractedEntities: {},
        cartItems: [],
        totalValue: 0,
      },
    },
  ];

  for (const conv of sampleConversations) {
    if (dbService.isConnected) {
      await Conversation.findOneAndUpdate(
        { channelId: conv.channelId },
        { $set: { ...conv, lastMessageAt: new Date() } },
        { upsert: true }
      );
    } else {
      localDb.conversations.set(conv.channelId, { _id: `conv_${Date.now()}_${conv.channelId}`, ...conv, lastMessageAt: new Date(), createdAt: new Date() });
    }
  }

  // Seed sample orders
  const sampleOrder = {
    _id: 'ORD-882194',
    storeId: 'store_priya_001',
    customerName: 'Rahul Sharma',
    customerPhone: 'whatsapp:919876543210@s.whatsapp.net',
    items: [{ name: 'Assorted Cupcake Box (Pack of 6)', quantity: 1, price: 450, sku: 'CUP-ASS-001' }],
    subtotal: 450,
    discount: 0,
    shipping: 0,
    total: 450,
    currency: 'INR',
    paymentStatus: 'completed',
    paymentMethod: 'upi',
    orderStatus: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (dbService.isConnected) {
    await Order.findOneAndUpdate({ _id: sampleOrder._id }, { $set: sampleOrder }, { upsert: true });
  } else {
    localDb.orders.set(sampleOrder._id, sampleOrder);
  }

  if (!dbService.isConnected) {
    dbService.saveLocalBackup();
  }

  console.log('🎉 Seeding completed successfully! 50 products and sample conversations are ready.');
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  });
