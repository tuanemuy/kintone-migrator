import type { ReportsConfig } from "@/core/domain/report/entity";
import { ReportStateParser } from "@/core/domain/report/services/reportStateParser";
import type { ReportDiffContainer } from "../container/report";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseReportConfigText } from "./parseConfig";

/** Remote reports config carrying the revision it was observed at. */
export type ReportRemote = Readonly<{
  config: ReportsConfig;
  revision: string;
}>;

export type ReportThreeWayInputs = ThreeWayInputs<ReportsConfig, ReportRemote>;

/**
 * Loads the four inputs of a 3-way report sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. Report is a record-keyed domain like view: the
 * remote is fetched with a single getter that carries its own revision, so it
 * loads thinly on top of the generic helper.
 */
export async function loadReportThreeWayInputs(
  container: ReportDiffContainer,
): Promise<ReportThreeWayInputs> {
  return loadThreeWayInputs<ReportsConfig, ReportRemote>({
    codec: container.configCodec,
    stateStorage: container.reportStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => ReportStateParser.parse(parsed).config,
    stateLabel: "Report state",
    loadLocal: async () => {
      const result = await container.reportStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseReportConfigText(container.configCodec, result.content);
    },
    loadRemote: async () => {
      const { reports, revision } =
        await container.reportConfigurator.getReports();
      return { config: { reports }, revision };
    },
  });
}
