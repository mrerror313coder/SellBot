import { orchestratorAgent } from '../src/agents/orchestrator';
import { dbService } from '../src/services/database';

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

async function runAgentTests() {
  console.log('\n🤖 Running End-to-End Tests: SellBot Agent Orchestration...\n');
  await dbService.connect();

  const testUser = `whatsapp:919999000001@s.whatsapp.net`;

  // Turn 1: Greeting
  console.log('--- Turn 1: Greeting Test ---');
  const res1 = await orchestratorAgent.processMessage({
    channelId: testUser,
    text: 'Namaste! Kaun kaun se cake hain?',
  });
  assert(res1.intent === 'greeting' || res1.intent === 'browse', 'Identifies greeting or browse intent');
  assert(res1.language === 'hi-en', 'Detects Hinglish language');
  assert(res1.text.length > 20, 'Generates helpful welcoming response');

  // Turn 2: Vague Inquiry with Budget
  console.log('\n--- Turn 2: Vague Inquiry Test ("gift for mom under 500") ---');
  const res2 = await orchestratorAgent.processMessage({
    channelId: testUser,
    text: 'Mujhe gift chahiye mom ke liye, budget 500',
  });
  assert(res2.intent === 'browse', 'Classifies browse-gift intent');
  assert(res2.metrics.toolsCalled.includes('catalog_search'), 'Calls catalog_search tool');
  assert(res2.metrics.latencyMs > 0, 'Measures response latency');

  // Turn 3: Upsell & Buy Flow
  console.log('\n--- Turn 3: Buy & Instant UPI QR Flow ---');
  const res3 = await orchestratorAgent.processMessage({
    channelId: testUser,
    text: 'I want to buy this, send me payment link and QR',
  });
  assert(res3.intent === 'buy', 'Identifies checkout/buy intent');
  assert(res3.order !== undefined, 'Creates confirmed order in database');
  assert(res3.paymentQR !== undefined, 'Generates base64 UPI QR code');
  assert(res3.paymentLink !== undefined, 'Generates UPI pay URI link');

  // Turn 4: Complaint & Human Handoff Test
  console.log('\n--- Turn 4: Complaint Escalation Test ---');
  const res4 = await orchestratorAgent.processMessage({
    channelId: `whatsapp:919999000002@s.whatsapp.net`,
    text: 'My order was completely damaged and broken. I want a refund right now!',
  });
  assert(res4.intent === 'complain', 'Identifies complaint intent');
  assert(res4.actions.includes('escalate_to_human'), 'Triggers human escalation action');

  // Turn 5: Pakistani Roman Urdu Greeting ("Kasy hain aap?")
  console.log('\n--- Turn 5: Pakistani Urdu Greeting ("Kasy hain aap?") ---');
  const pkUser = `whatsapp:923001234567@s.whatsapp.net`;
  const res5 = await orchestratorAgent.processMessage({
    channelId: pkUser,
    text: 'Kasy hain aap?',
  });
  assert(res5.language === 'ur', 'Detects Pakistani Roman Urdu');
  assert(res5.intent === 'greeting', 'Identifies greeting / well-being check');
  assert(res5.text.toLowerCase().includes('alhamdulillah'), 'Replies warmly with Alhamdulillah');

  // Turn 6: Out-of-scope Query ("Mujhy bike leni hai")
  console.log('\n--- Turn 6: Out-of-scope Query ("Mujhy bike leni hai") ---');
  const res6 = await orchestratorAgent.processMessage({
    channelId: pkUser,
    text: 'Mujhy bike leni hai',
  });
  assert(res6.intent === 'out_of_scope', 'Identifies out-of-scope item (bike)');
  assert(res6.actions.includes('clarify_inventory_scope'), 'Triggers inventory scope clarification');
  assert(res6.text.toLowerCase().includes('bike'), 'Politely addresses the requested bike');

  // Turn 7: Pakistani Order with EasyPaisa/JazzCash
  console.log('\n--- Turn 7: Pakistani Order & EasyPaisa Checkout ---');
  const res7 = await orchestratorAgent.processMessage({
    channelId: pkUser,
    text: 'AoA, kal k lye chocolate cake chahye, budget 800 hai',
  });
  assert(res7.language === 'ur', 'Detects Roman Urdu');
  assert(res7.metrics.toolsCalled.includes('catalog_search'), 'Calls catalog search for cake');

  console.log(`\n========================================`);
  console.log(`Agent Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runAgentTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
