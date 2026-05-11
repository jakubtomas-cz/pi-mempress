import { measurePressure, memoryUsageGB, getTotalMemory } from "./service";

async function main() {
  try {
    const pressure = await measurePressure();
    const usage = await memoryUsageGB();
    const total = await getTotalMemory();

    console.log(
      `[Pressure: ${pressure}%] [Usage: ${usage.toFixed(2)} / ${total.toFixed(2)} GB]`,
    );
  } catch (error) {
    console.error("Failed to print memory information:", error);
    process.exit(1);
  }
}

main();
