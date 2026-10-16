import { rateLimiter } from '../src/utils/rate-limiter';
import { whatsappService } from '../src/services/whatsapp';

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

async function runWhatsAppTests() {
  console.log('\n📱 Running WhatsApp Integration & Rate Limiter Tests...\n');

  // Test 1: Service Status Check
  const status = whatsappService.getStatus();
  assert(typeof status.connected === 'boolean', 'WhatsApp service exposes connected state');
  assert(status.authDir.length > 0, 'WhatsApp auth directory configured');

  // Test 2: Rate Limiter
  const user = '919800000001@s.whatsapp.net';
  const check1 = rateLimiter.isAllowed(user);
  assert(check1.allowed === true, 'First message permitted');

  const check2 = rateLimiter.isAllowed(user);
  assert(check2.allowed === false, 'Sub-2-second burst message throttled for anti-ban');
  assert(check2.retryAfterMs > 0, 'Returns non-zero retryAfterMs wait duration');

  console.log(`\n========================================`);
  console.log(`WhatsApp Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runWhatsAppTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
