export const AppRevisionErrorCode = {
  ArInvalidStructure: "AR_INVALID_STRUCTURE",
} as const;

export type AppRevisionErrorCode =
  (typeof AppRevisionErrorCode)[keyof typeof AppRevisionErrorCode];
