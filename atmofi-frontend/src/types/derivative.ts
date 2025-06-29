export type Derivative = {
  insurer: `0x${string}`;
  beverageCompany: `0x${string}`;
  premiumAmount: bigint;
  payoutAmount: bigint;
  strikeTemperature: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  state: number;
  insurerFunded: boolean;
  beverageCompanyFunded: boolean;
  settledTemperature: bigint;
};
