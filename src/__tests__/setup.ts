import { removeCliEnvVars } from "./cliEnv";

// Tests see only the CLI variables they set themselves, not the ones the host
// shell provides (e.g. a `.env` loaded by direnv).
removeCliEnvVars(process.env);
