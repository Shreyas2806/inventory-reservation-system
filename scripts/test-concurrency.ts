/**
 * Concurrency Test Script
 *
 * Fires N simultaneous POST /api/reservations requests for the same
 * product/warehouse that has exactly 1 unit available.
 *
 * EXPECTED RESULT (stock = 1, requests = 5):
 *   ✅  1 → HTTP 201 (reserved)
 *   ❌  4 → HTTP 409 (insufficient stock)
 *   💥  0 → HTTP 500 (must never happen)
 *
 * Run: npm run test:concurrency
 * (Make sure `npm run dev` is running in another terminal)
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// iPhone 16 Pro @ Bangalore Tech Park — seeded with exactly 1 unit
const PRODUCT_ID   = "prod-iphone";
const WAREHOUSE_ID = "wh-bangalore";
const QUANTITY     = 1;
const CONCURRENCY  = 5;

interface Result {
  index:      number;
  status:     number;
  body:       unknown;
  durationMs: number;
}

async function request(index: number): Promise<Result> {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/reservations`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ productId: PRODUCT_ID, warehouseId: WAREHOUSE_ID, quantity: QUANTITY }),
  });
  return { index, status: res.status, body: await res.json(), durationMs: Date.now() - t0 };
}

async function run() {
  console.log("─".repeat(60));
  console.log("⚡ CONCURRENCY TEST — Inventory Reservation System");
  console.log("─".repeat(60));
  console.log(`   Product:    ${PRODUCT_ID}`);
  console.log(`   Warehouse:  ${WAREHOUSE_ID}`);
  console.log(`   Quantity:   ${QUANTITY}`);
  console.log(`   Concurrent: ${CONCURRENCY} simultaneous requests`);
  console.log("─".repeat(60));

  // Fire all requests at exactly the same moment
  const settled = await Promise.allSettled(
    Array.from({ length: CONCURRENCY }, (_, i) => request(i + 1))
  );

  const results: Result[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") results.push(s.value);
    else console.error("  Network error:", s.reason);
  }

  console.log("\nRESULTS:");
  for (const r of results) {
    const icon = r.status === 201 ? "✅" : r.status === 409 ? "❌" : "💥";
    const body = r.body as Record<string, unknown>;
    console.log(`  ${icon} Request #${r.index} → HTTP ${r.status} (${r.durationMs}ms)`);
    if (r.status === 201) {
      const d = body.data as { id: string };
      console.log(`     Reservation ID: ${d.id}`);
    } else {
      console.log(`     Reason: ${body.error}`);
    }
  }

  const succeeded  = results.filter((r) => r.status === 201);
  const conflicted = results.filter((r) => r.status === 409);
  const errors     = results.filter((r) => r.status >= 500);

  console.log("\n" + "─".repeat(60));
  console.log("SUMMARY:");
  console.log(`  ✅ Succeeded  (HTTP 201): ${succeeded.length}`);
  console.log(`  ❌ Conflict   (HTTP 409): ${conflicted.length}`);
  console.log(`  💥 Errors     (HTTP 5xx): ${errors.length}`);
  console.log("─".repeat(60));

  const pass = succeeded.length === 1 && conflicted.length === CONCURRENCY - 1 && errors.length === 0;

  if (pass) {
    console.log("\n🎉 PASS — Exactly 1 success, no oversell, no 500 errors!\n");
  } else {
    console.log("\n⚠️  FAIL — Unexpected result distribution.");
    if (errors.length > 0) console.log("   500 errors indicate a bug in concurrency handling.");
    if (succeeded.length > 1) console.log("   Multiple successes = OVERSELL DETECTED!");
    process.exit(1);
  }

  // Cleanup: release the winning reservation so the test can be re-run
  if (succeeded.length > 0) {
    const winId = (succeeded[0].body as { data: { id: string } }).data.id;
    console.log(`🧹 Releasing reservation ${winId} (restores stock for next run)...`);
    const rel = await fetch(`${BASE_URL}/api/reservations/${winId}/release`, { method: "POST" });
    console.log(rel.ok ? "   Stock restored ✓\n" : "   Could not release — check manually\n");
  }
}

run().catch(console.error);
