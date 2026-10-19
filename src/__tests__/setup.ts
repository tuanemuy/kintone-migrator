import { isCliEnvVar } from "./cliEnv";

// Removes the CLI's variables inherited from the host shell (e.g. a `.env`
// loaded by direnv) so that tests only see the values they stub. Deleted
// directly rather than via `vi.stubEnv`, because `vi.unstubAllEnvs()` would
// restore the host values.
for (const name of Object.keys(process.env)) {
  if (isCliEnvVar(name)) {
    delete process.env[name];
  }
}
