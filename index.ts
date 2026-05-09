import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getTotalMemory, getMemoryInfo } from "./service";

export default function (pi: ExtensionAPI) {
  let totalMemory = 0;

  pi.on("session_start", async (_event, ctx) => {
    const theme = ctx.ui.theme;

    try {
      totalMemory = await getTotalMemory();
      console.log(`[mempress] Total memory fetched: ${totalMemory} GB`);
    } catch (err: any) {
      console.error(`[mempress] Failed to fetch total memory: ${err.message}`);
    }

    ctx.ui.setStatus("mem-pressure", await getMemoryInfo(totalMemory, theme));

    setInterval(async () => {
      try {
        ctx.ui.setStatus(
          "mem-pressure",
          await getMemoryInfo(totalMemory, theme),
        );
      } catch (err: any) {
        console.error(`[mempress] Update failed: ${err.message}`);
      }
    }, 1000);
  });
}
