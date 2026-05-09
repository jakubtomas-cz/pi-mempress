import { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function getPressureColor(pressure: number): ThemeColor {
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
  const currentUsage = await memoryUsageGB();
  const pColor = getPressureColor(pressure);
  const pressurePart = theme.fg(
    "dim",
    `[Pressure: ${theme.fg(pColor, String(pressure) + "%")}${theme.fg("dim", "]")}`,
  );
  const usagePart = theme.fg(
    "dim",
    `[Usage: ${currentUsage.toFixed(2)} / ${totalMemory.toFixed(2)} GB]`,
  );

  return `${pressurePart} ${usagePart}`;
};
