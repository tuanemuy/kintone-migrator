import type { AppRevisionGenerations, DeployState } from "../valueObject";

export const DeployStateEvaluator = {
  /** Derives the {@link DeployState} from the revisions of both generations. */
  evaluate: ({ preview, published }: AppRevisionGenerations): DeployState => {
    if (published.kind === "neverDeployed") {
      return { kind: "neverDeployed", previewRevision: preview };
    }
    if (published.revision === preview) {
      return { kind: "upToDate", revision: preview };
    }
    return {
      kind: "pending",
      previewRevision: preview,
      publishedRevision: published.revision,
    };
  },

  /** True when a deploy would publish something that is waiting in preview. */
  hasUndeployedChanges: (state: DeployState): boolean =>
    state.kind !== "upToDate",
};
