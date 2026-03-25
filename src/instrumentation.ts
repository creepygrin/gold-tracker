export async function register() {
  // Only run in Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { refreshPrices } = await import("./lib/price-cache");
    const cron = await import("node-cron");

    // Initial fetch on server start
    await refreshPrices();

    // Refresh every hour at :00
    cron.default.schedule("0 * * * *", async () => {
      await refreshPrices();
    });

    console.log("[instrumentation] Gold price scraper scheduled (every hour)");
  }
}
