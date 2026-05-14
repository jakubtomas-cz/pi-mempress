import { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function getColorStatus(pressure: number): ThemeColor {
  if (pressure < 70) return "success";
  if (pressure < 80) return "warning";
  return "error";
}

export async function measurePressure(): Promise<number> {
  try {
    const { stdout } = await execAsync("memory_pressure");

    const trimmedOutput = stdout.trim();
    if (!trimmedOutput) {
      throw new Error("empty output from memory_pressure");
    }
    const lines = trimmedOutput.split("\n");

    if (lines.length === 0) {
      throw new Error("empty output from memory_ pressure");
    }

    const lastLine = lines[lines.length - 1].trim();

    const match = lastLine.match(/(\d+)%/);

    if (!match || match.length < 2) {
      throw new Error(`unable to parse last line: ${lastLine}`);
    }

    const freeMem = parseInt(match[1], 10);

    if (isNaN(freeMem)) {
      throw new Error("parsing free memory percentage failed");
    }

    return 100 - freeMem;
  } catch (err: any) {
    throw new Error(`executing memory_pressure: ${err.message}`);
  }
}

export async function memoryUsageGB(): Promise<number> {
  const cmd = `vm_stat | python3 -c "import sys, re; out = sys.stdin.read(); ps = 16384; d = {m.group(1).strip(): int(m.group(2)) for m in re.finditer(r'([^:]+):\\s+(\\d+)\\.', out)}; used = (d.get('Anonymous pages',0) + d.get('Pages wired down',0) + d.get('Pages occupied by compressor',0) - d.get('Pages purgeable',0)) * ps / 1024**3; print(f'{used:.2f}')"`;

  try {
    const { stdout } = await execAsync(cmd);

    const trimmedOutput = stdout.trim();
    const usage = parseFloat(trimmedOutput);

    if (isNaN(usage)) {
      console.error("[mempress] parsing memory usage failed");
      return 0;
    }

    return usage;
  } catch (err: any) {
    console.error(`[mempress] memory usage measurement failed: ${err.message}`);
    return 0;
  }
}

export async function getTotalMemory(): Promise<number> {
  const cmd = `sysctl -n hw.memsize | awk '{print $1 / 1024^3}'`;

  try {
    const { stdout } = await execAsync(cmd);

    const trimmedOutput = stdout.trim();
    const total = parseFloat(trimmedOutput);

    if (isNaN(total)) {
      throw new Error("parsing total memory failed");
    }

    return total;
  } catch (err: any) {
    throw new Error(`reading total memory: ${err.message}`);
  }
}

export const getMemoryInfo = async (totalMemory: number, theme: Theme) => {
  const pressure = await measurePressure();
  const pressureColor = getColorStatus(pressure);

  const currentUsage = await memoryUsageGB();
  const usageColor = getColorStatus(currentUsage / (totalMemory / 100));

  const linesAmount = Math.ceil(pressure / 10);
  const linesRenderer = Array.from({ length: linesAmount }).fill("|");
  const spacesRenderer = Array.from({ length: 10 - linesAmount }).fill(
    "\u00A0",
  );

  const pressurePart = theme.fg(
    "dim",
    `[Pressure: ${theme.fg(pressureColor, `${linesRenderer.join("")}${spacesRenderer.join("")}`)} ${pressure < 10 ? "\u00A0" : ""}${theme.fg(pressureColor, String(pressure) + "%")}${theme.fg("dim", "]")}`,
  );
  const usagePart = theme.fg(
    "dim",
    `[Usage: ${theme.fg(usageColor, currentUsage.toFixed(2))} ${theme.fg("dim", `/ ${totalMemory.toFixed(2)} GB]`)}`,
  );

  return `${pressurePart} ${usagePart}`;
};
