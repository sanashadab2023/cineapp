import { runConcurrencyTest } from "./concurrency.test";
import { runHoldExpirationTest } from "./hold-expiration.test";
import { runPaymentIdempotencyTest } from "./payment-idempotency.test";
import { runAuthIsolationTest } from "./auth-isolation.test";

async function main() {
  console.log("\n=======================================================");
  console.log("🎬 CINEBOOK COMPREHENSIVE QA AUTOMATION SUITE");
  console.log("=======================================================");

  const startTime = Date.now();
  let passedCount = 0;
  const totalSuites = 4;

  try {
    // Suite 1: Concurrency Race Condition
    await runConcurrencyTest();
    passedCount++;

    // Suite 2: Hold Expiration & Cron Release
    await runHoldExpirationTest();
    passedCount++;

    // Suite 3: Payment Idempotency & Webhook Retries
    await runPaymentIdempotencyTest();
    passedCount++;

    // Suite 4: Auth Boundaries & User Isolation
    await runAuthIsolationTest();
    passedCount++;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n=======================================================");
    console.log(`🎉 ALL ${passedCount}/${totalSuites} QA TEST SUITES PASSED SUCCESSFULLY! (${duration}s)`);
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ QA TEST SUITE FAILED:", err.message);
    process.exit(1);
  }
}

main();
