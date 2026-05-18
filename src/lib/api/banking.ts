import { api } from "./client";

export type AssetType = "BANK" | "CASH" | "INVESTMENT" | "REAL_ESTATE" | "OTHER";
export type LiabilityType = "CREDIT_CARD" | "LOAN" | "MORTGAGE" | "OTHER";

export interface BankAccount {
  id: string;
  name: string;
  institution: string;
  type: "CHECKING" | "SAVINGS" | "INVESTMENT" | "OTHER";
  balance: number;
  currency: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAsset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  currency: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialLiability {
  id: string;
  name: string;
  type: LiabilityType;
  balance: number;
  interestRate?: number;
  currency: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const bankingApi = {
  getAccounts: (userId: string) =>
    api.get<BankAccount[]>(`users/${userId}/bank-accounts`),
  createAccount: (userId: string, dto: Partial<BankAccount>) =>
    api.post<BankAccount>(`users/${userId}/bank-accounts`, dto),
  updateAccount: (userId: string, id: string, dto: Partial<BankAccount>) =>
    api.patch<BankAccount>(`users/${userId}/bank-accounts/${id}`, dto),
  deleteAccount: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/bank-accounts/${id}`),

  getAssets: (userId: string) =>
    api.get<FinancialAsset[]>(`users/${userId}/financial-assets`),
  createAsset: (userId: string, dto: Partial<FinancialAsset>) =>
    api.post<FinancialAsset>(`users/${userId}/financial-assets`, dto),
  updateAsset: (userId: string, id: string, dto: Partial<FinancialAsset>) =>
    api.patch<FinancialAsset>(`users/${userId}/financial-assets/${id}`, dto),
  deleteAsset: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/financial-assets/${id}`),

  getLiabilities: (userId: string) =>
    api.get<FinancialLiability[]>(`users/${userId}/financial-liabilities`),
  createLiability: (userId: string, dto: Partial<FinancialLiability>) =>
    api.post<FinancialLiability>(`users/${userId}/financial-liabilities`, dto),
  updateLiability: (userId: string, id: string, dto: Partial<FinancialLiability>) =>
    api.patch<FinancialLiability>(`users/${userId}/financial-liabilities/${id}`, dto),
  deleteLiability: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/financial-liabilities/${id}`),

  computeNetWorth(
    assets: FinancialAsset[],
    liabilities: FinancialLiability[],
    bankAccounts: BankAccount[]
  ) {
    const totalAssets =
      assets.reduce((s, a) => s + a.value, 0) +
      bankAccounts.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  },
};
