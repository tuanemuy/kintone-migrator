import type { SeedServiceArgs } from "../container/seed";

export type SaveSeedInput = {
  readonly seedText: string;
};

export async function saveSeed({
  container,
  input,
}: SeedServiceArgs<SaveSeedInput>): Promise<void> {
  await container.seedStorage.update(input.seedText);
}
