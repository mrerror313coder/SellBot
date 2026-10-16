import { LanguageDetectorTool } from '../src/tools/language-detector';
import { IntentClassifierTool } from '../src/tools/intent-classifier';
import { PriceCalculatorTool } from '../src/tools/price-calculator';
import { PaymentQRTool } from '../src/tools/payment-qr';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runToolsTests() {
  console.log('\n🧪 Running Unit Tests: SellBot Commerce Tools...\n');

  // Test 1: Language Detection
  console.log('--- 1. Language Detector ---');
  assert(LanguageDetectorTool.detect('I need a birthday cake').language === 'en', 'Detects English');
  assert(LanguageDetectorTool.detect('Mujhe kal ke liye chocolate cake chahiye').language === 'hi-en', 'Detects Hinglish');
  assert(LanguageDetectorTool.detect('नमस्ते मुझे केक चाहिए').language === 'hi', 'Detects Devanagari Hindi');
  assert(LanguageDetectorTool.detect('Hola necesito un pastel').language === 'es', 'Detects Spanish');
  assert(LanguageDetectorTool.detect('أريد كعكة عيد ميلاد').language === 'ar', 'Detects Arabic');
  assert(LanguageDetectorTool.detect('Olá, preciso de um bolo').language === 'pt', 'Detects Portuguese');

  // Test 2: Intent Classification & Entity Extraction
  console.log('\n--- 2. Intent Classifier ---');
  const greeting = IntentClassifierTool.classify('Hi, good morning!');
  assert(greeting.intent === 'greeting', 'Classifies greeting');

  const browse = IntentClassifierTool.classify('I need a gift for mom under 500');
  assert(browse.intent === 'browse', 'Classifies browse');
  assert(browse.entities.recipient === 'mom', 'Extracts recipient=mom');
  assert(browse.entities.budget === 500, 'Extracts budget=500');

  const buy = IntentClassifierTool.classify('I want to buy this, send UPI QR code');
  assert(buy.intent === 'buy', 'Classifies purchase intent');

  const complaint = IntentClassifierTool.classify('The cake was damaged during delivery, refund please');
  assert(complaint.intent === 'complain', 'Classifies complaint / damaged return');

  // Test 3: Price Calculator
  console.log('\n--- 3. Price Calculator ---');
  const items = [
    { name: 'Chocolate Truffle Cake', price: 750, quantity: 1 },
    { name: 'Birthday Candles', price: 30, quantity: 1 },
  ];
  const pricing1 = PriceCalculatorTool.calculate(items, undefined, 1000);
  assert(pricing1.subtotal === 780, 'Calculates correct subtotal (₹780)');
  assert(pricing1.shipping === 50, 'Applies shipping when below ₹1000');
  assert(pricing1.total === 830, 'Total equals ₹830');
  assert(pricing1.upsellSuggestion !== undefined, 'Suggests upsell to unlock free shipping');

  const pricing2 = PriceCalculatorTool.calculate(items, 'WELCOME10', 500);
  assert(pricing2.discount === 78, 'Applies 10% discount');
  assert(pricing2.freeShippingQualified === true, 'Free delivery applied over threshold');

  // Test 4: Payment QR Generator
  console.log('\n--- 4. Payment QR Generator ---');
  const qr = await PaymentQRTool.generate({
    amount: 450,
    upiId: 'priya@paytm',
    orderId: 'ORD-12345',
    storeName: "Priya's Cakes",
  });
  assert(qr.orderId === 'ORD-12345', 'Preserves orderId');
  assert(qr.upiLink.includes('pa=priya%40paytm'), 'Generates valid UPI protocol link');
  assert(qr.qrDataUrl.startsWith('data:image/png;base64,'), 'Produces valid base64 PNG data URL');

  console.log(`\n========================================`);
  console.log(`Tool Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runToolsTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
