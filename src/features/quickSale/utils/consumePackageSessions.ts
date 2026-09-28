import type { PackageSessionConsumption } from "./packageCoverage";

export async function consumePackageSessions(
  consumptions: PackageSessionConsumption[],
  complete: (consumption: PackageSessionConsumption) => Promise<unknown>,
): Promise<string | null> {
  const total = consumptions.reduce((sum, consumption) => sum + consumption.quantity, 0);
  let confirmed = 0;
  for (const consumption of consumptions) {
    for (let session = 0; session < consumption.quantity; session += 1) {
      try {
        await complete(consumption);
        confirmed += 1;
      } catch {
        return `Payment and checkout were saved, but only ${confirmed} of ${total} package-session deductions were confirmed. Check the client's package history for package ${consumption.clientPackageId} before adjusting sessions. The last request may have reached the server. Do not repeat checkout or collect payment again.`;
      }
    }
  }
  return null;
}
