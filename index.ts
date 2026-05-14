import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getTotalMemory, getMemoryInfo } from "./service";

let interval: NodeJS.Timeout = null!;
let totalMemory = 0;

const printer = async (ctx: any) => {
  try {
    const theme = ctx.ui.theme;
    ctx.ui.setStatus("mem-pressure", await getMemoryInfo(totalMemory, theme));
  } catch (error) {}
};

export default async function (pi: ExtensionAPI) {
  totalMemory = await getTotalMemory();

  pi.on("session_start", async (_event, ctx) => {
    if (interval) clearInterval(interval);

    try {
      interval = setInterval(async () => printer(ctx), 1000);
    } catch (error) {
      console.log("[pi-mempress] error: " + error);
    }
  });
}
