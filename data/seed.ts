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

const PRODUCT_IMAGES: Record<string, string> = {
  'CAKE-CHO-001': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', // Chocolate Truffle Cake
  'CAKE-RED-001': 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=600', // Red Velvet Cake
  'CAKE-VAN-001': 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600', // Vanilla Sponge Cake
  'CAKE-BLU-001': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600', // Blueberry Cheesecake
  'CAKE-PHO-001': 'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=600', // Custom Photo Cake
  'CUP-ASS-001': 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=600', // Assorted Cupcakes
  'BRW-CHO-001': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600', // Walnut Brownie
  'COO-CHI-001': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600', // Choc-Chip Cookie Jar
  'MAC-ASS-001': 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600', // French Macarons
  'CND-BIR-001': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600', // Birthday Candles
  'TOP-GLD-001': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600', // Gold Cake Topper
  'CAKE-BEN-001': 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600', // Bento Cake
  'PAS-DUT-001': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600', // Dutch Truffle Pastry
  'CAKE-FRU-001': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600', // Fruit Gateau Cake
  'DES-MOU-001': 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=600', // Chocolate Mousse
  'DES-TIR-001': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', // Tiramisu Classico
  'CAKE-PIN-001': 'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=600', // Pineapple Cake
  'BAK-CRO-001': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600', // Butter Croissant
  'TAR-ALM-001': 'https://images.unsplash.com/photo-1519915028121-7d346b720b13?w=600', // Almond Tart
  'DOU-NUT-001': 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=600', // Nutella Doughnut
  'HAM-MIN-001': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600', // Mini Hamper
  'CAKE-ROS-001': 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600', // Rose Cake
  'GIF-LAV-001': 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600', // Lavender Candle Box
  'CAKE-BLK-001': 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=600', // Black Forest Cake
  'DES-CHI-001': 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600', // Mango Chia Pudding
  'CAKE-CAR-001': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600', // Salted Caramel Popcorn Cake
  'CAKE-MAT-001': 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600', // Matcha Roll Cake
  'BAK-SOU-001': 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=600', // Artisan Sourdough
  'BAK-GAR-001': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600', // Garlic Herb Bread
  'CAKE-RAS-001': 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600', // Rasmalai Fusion Cake
  'CAKE-JAM-001': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600', // Gulab Jamun Cheesecake
  'BAK-PIST-001': 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600', // Pistachio Baklava
  'CAKE-KETO-001': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', // Keto Dark Chocolate Cake
  'CAKE-GF-001': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600', // Almond Orange Cake
  'CAKE-STR-001': 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600', // Strawberry Shortcake
  'CAKE-BIS-001': 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=600', // Biscoff Cheesecake
  'TAR-PEC-001': 'https://images.unsplash.com/photo-1519915028121-7d346b720b13?w=600', // Pecan Tart
  'BAK-BAB-001': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600', // Nutella Babka
  'ACC-BAL-001': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600', // Party Balloons
  'ACC-CRD-001': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600', // Birthday Card
  'ACC-WRP-001': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600', // Ribbon & Wrap
  'FLW-ROS-001': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600', // Red Roses
  'FLW-LIL-001': 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600', // White Lilies
  'COO-DOU-001': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600', // Double Choc Cookie
  'COO-OAT-001': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600', // Oatmeal Cookies
  'CHO-BARK-001': 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=600', // Dark Chocolate Bark
  'CHO-ROC-001': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600', // Almond Chocolate Rocks
  'BEV-COL-001': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600', // Cold Brew Coffee
  'BEV-LAT-001': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600', // Vanilla Iced Latte
  'HAM-ULT-001': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600', // Ultimate Celebration Box
};

function getProductImage(sku: string, name: string = '', category: string[] = []): string {
  if (PRODUCT_IMAGES[sku]) return PRODUCT_IMAGES[sku];
  const lower = (name + ' ' + category.join(' ')).toLowerCase();
  if (lower.includes('cupcake')) return 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=600';
  if (lower.includes('brownie')) return 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600';
  if (lower.includes('cookie')) return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600';
  if (lower.includes('macaron')) return 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600';
  if (lower.includes('cheesecake')) return 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600';
  if (lower.includes('red velvet')) return 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=600';
  if (lower.includes('bento')) return 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600';
  if (lower.includes('croissant') || lower.includes('bread') || lower.includes('sourdough')) return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600';
  if (lower.includes('candle') || lower.includes('topper') || lower.includes('sparkler') || lower.includes('balloon')) return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600';
  if (lower.includes('rose') || lower.includes('flower') || lower.includes('lily')) return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600';
  if (lower.includes('coffee') || lower.includes('brew') || lower.includes('latte')) return 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600';
  if (lower.includes('hamper') || lower.includes('gift')) return 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600';
  if (lower.includes('pastry') || lower.includes('tart')) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600';
  if (lower.includes('chocolate') || lower.includes('truffle')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600';
  return 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600';
}

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

  if (!dbService.isConnected) {
    localDb.products.clear();
  }

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
      images: [getProductImage(sku, name, category)],
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

  // Seed sample customers & conversations including Pakistan users
  const sampleConversations = [
    {
      channelId: 'whatsapp:923001234567@s.whatsapp.net',
      customerName: 'Hamza Khan (Lahore)',
      status: 'sold',
      messages: [
        {
          role: 'customer',
          content: 'AoA, kal k lye chocolate cake mil jaye ga? budget 800 hai',
          language: 'ur',
          timestamp: new Date(Date.now() - 3600000 * 3),
        },
        {
          role: 'agent',
          content: 'Walaikum Assalam Hamza bhai! 🎂 Bilkul mil jaye ga! Hamara *Choco Truffle Fudge Cake* (Rs. 750, 4.8 ⭐) best option hai. Freshly baked kal subah 10 baje tak deliver ho jaye ga. Budget mein Rs. 50 bachein gay! Kya birthday candles (+Rs. 30) add kar dein? 🍰',
          language: 'ur',
          toolsUsed: ['language_detector', 'intent_classifier', 'catalog_search'],
          reasoning: 'Pakistani Roman Urdu query, kal delivery, budget Rs. 800. Recommended Choco Truffle (Rs. 750)',
          tokensUsed: 155,
          latencyMs: 1950,
          timestamp: new Date(Date.now() - 3600000 * 3 + 2000),
        },
        {
          role: 'customer',
          content: 'Haan candles bhi add kr do, aur EasyPaisa send kro',
          language: 'ur',
          timestamp: new Date(Date.now() - 3600000 * 3 + 45000),
        },
        {
          role: 'agent',
          content: '🎉 Order Confirmed! Total Payable: Rs. 780. Aap EasyPaisa / JazzCash (0301-1234567) par pay kar saktay hain ya Cash on Delivery (COD) bhi available hai! Thank you! 🍰',
          language: 'ur',
          toolsUsed: ['price_calculator', 'payment_qr', 'order_creator'],
          reasoning: 'Customer selected EasyPaisa / COD. Generated order #ORD-921402.',
          tokensUsed: 170,
          latencyMs: 1600,
          timestamp: new Date(Date.now() - 3600000 * 3 + 47000),
        },
      ],
      context: {
        detectedIntent: 'buy',
        extractedEntities: { occasion: 'tomorrow', budget: 800, currency: 'PKR' },
        cartItems: [
          { name: 'Chocolate Truffle Cake', quantity: 1, price: 750, sku: 'CAKE-CHO-001' },
          { name: 'Birthday Candle Set', quantity: 1, price: 30, sku: 'CND-BIR-001' },
        ],
        totalValue: 780,
      },
    },
    {
      channelId: 'whatsapp:923219876543@s.whatsapp.net',
      customerName: 'Fatima Malik (Karachi)',
      status: 'active',
      messages: [
        {
          role: 'customer',
          content: 'Kasy hain aap? Mujhe ammi ke liye gift basket chahiye, budget 1000 tak hai',
          language: 'ur',
          timestamp: new Date(Date.now() - 1800000),
        },
        {
          role: 'agent',
          content: 'Alhamdulillah main theek hoon! ❤️ Ammi ke liye hamara *Lavender Candle & Treats Box* (Rs. 790) ya *Mother\'s Day Special Rose Cake* (Rs. 890) best choice hai! Hand-poured candle aur luxury gift packing shamil hai. Konsa pasand karein gi?',
          language: 'ur',
          toolsUsed: ['language_detector', 'intent_classifier', 'catalog_search'],
          reasoning: 'Pakistani user inquiry for mom gift. Budget Rs. 1000.',
          tokensUsed: 175,
          latencyMs: 2100,
          timestamp: new Date(Date.now() - 1797000),
        },
      ],
      context: {
        detectedIntent: 'browse',
        extractedEntities: { recipient: 'mom', budget: 1000, currency: 'PKR' },
        cartItems: [{ name: 'Lavender Candle & Treats Box', quantity: 1, price: 790, sku: 'GIF-LAV-001' }],
        totalValue: 790,
      },
    },
    {
      channelId: 'whatsapp:923335551234@s.whatsapp.net',
      customerName: 'Bilal Ahmed (Islamabad)',
      status: 'active',
      messages: [
        {
          role: 'customer',
          content: 'Mujhy bike leni hai',
          language: 'ur',
          timestamp: new Date(Date.now() - 900000),
        },
        {
          role: 'agent',
          content: 'Maazrat chahtay hain Bilal bhai! 🙏 Hum bikes mein deal nahi kartay, yeh bakery aur gift shop hai jahan fresh cakes, brownies aur celebration treats miltay hain. Agar celebration ke liye koi sweet treat ya birthday cake chahiye ho toh zaroor batayein! 🎂✨',
          language: 'ur',
          toolsUsed: ['language_detector', 'intent_classifier'],
          reasoning: 'Out of scope item (bike) detected. Clarified store specialization politely.',
          tokensUsed: 120,
          latencyMs: 1400,
          timestamp: new Date(Date.now() - 897000),
        },
      ],
      context: {
        detectedIntent: 'out_of_scope',
        extractedEntities: { outOfScopeItem: 'bike' },
        cartItems: [],
        totalValue: 0,
      },
    },
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
