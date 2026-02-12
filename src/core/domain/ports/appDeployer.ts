/**
 * Port for deploying app settings to the production environment.
 *
 * The `deploy()` method triggers a deployment and waits for it to complete.
 * Polling and retry logic are implementation details of the adapter.
 * The app ID is injected via the adapter constructor.
 */
export interface AppDeployer {
  deploy(): Promise<void>;
}
