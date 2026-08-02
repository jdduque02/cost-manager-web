import { api } from "./client";

export type AssetType =
  | "acciones"
  | "acciones_fraccion"
  | "ahorro_alto_rendimiento"
  | "bienes_raices"
  | "bienes_materiales"
  | "vehiculos"
  | "joyas_metales"
  | "arte_colecciones"
  | "propiedad_intelectual"
  | "fondos_inversion"
  | "cryptomonedas"
  | "efectivo"
  | "otro";
export type LiabilityType =
  | "credito_hipotecario"
  | "credito_consumo"
  | "tarjeta_credito"
  | "prestamo_personal"
  | "otro";
export type AccountType =
  | "ahorros"
  | "corriente"
  | "inversion"
  | "fna"
  | "aporte_pension_voluntaria"
  | "otro";

export interface BankAccount {
  id: number;
  user_id: number;
  bank_name: string;
  account_type: AccountType;
  masked_account_number: string;
  display_balance: string;
  currency: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateBankAccountDto {
  bank_name: string;
  account_type: AccountType;
  account_number: string;
  balance: number;
  currency?: string;
  is_primary?: boolean;
}

export interface FinancialAsset {
  id: number;
  user_id: number;
  asset_type: AssetType;
  name: string;
  current_value: number;
  current_yield?: number | null;
  currency: string;
  symbol?: string | null;
  quote_source?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateFinancialAssetDto {
  asset_type: AssetType;
  name: string;
  current_value: number;
  current_yield?: number;
  currency?: string;
  symbol?: string;
  quote_source?: string;
}

export interface AssetQuote {
  asset_id: number;
  name: string;
  symbol: string;
  price: number;
  currency: string;
  success: boolean;
}

export interface FinancialLiability {
  id: number;
  user_id: number;
  liability_type: LiabilityType;
  name: string;
  current_balance: number;
  interest_rate?: number;
  currency: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateFinancialLiabilityDto {
  liability_type: LiabilityType;
  name: string;
  current_balance: number;
  interest_rate?: number;
  currency?: string;
}

export const bankingApi = {
  getAccounts: (userId: string) => api.get<BankAccount[]>(`users/${userId}/bank-accounts`),
  createAccount: (userId: string, dto: CreateBankAccountDto) =>
    api.post<BankAccount>(`users/${userId}/bank-accounts`, dto),
  updateAccount: (userId: string, id: string, dto: Partial<CreateBankAccountDto>) =>
    api.patch<BankAccount>(`users/${userId}/bank-accounts/${id}`, dto),
  deleteAccount: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/bank-accounts/${id}`),

  getAssets: (userId: string) =>
    api.get<FinancialAsset[]>(`users/${userId}/financial-assets`).then((assets) =>
      assets.map((a) => ({
        ...a,
        current_value: Number(a.current_value ?? 0),
        current_yield: a.current_yield != null ? Number(a.current_yield) : null,
      })),
    ),
  getAssetQuotes: (userId: string) =>
    api.get<AssetQuote[]>(`users/${userId}/financial-assets/quotes`),
  createAsset: (userId: string, dto: CreateFinancialAssetDto) =>
    api.post<FinancialAsset>(`users/${userId}/financial-assets`, dto),
  updateAsset: (userId: string, id: string, dto: Partial<CreateFinancialAssetDto>) =>
    api.patch<FinancialAsset>(`users/${userId}/financial-assets/${id}`, dto),
  deleteAsset: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/financial-assets/${id}`),

  getLiabilities: (userId: string) =>
    api
      .get<FinancialLiability[]>(`users/${userId}/financial-liabilities`)
      .then((liabilities) =>
        liabilities.map((l) => ({ ...l, current_balance: Number(l.current_balance ?? 0) })),
      ),
  createLiability: (userId: string, dto: CreateFinancialLiabilityDto) =>
    api.post<FinancialLiability>(`users/${userId}/financial-liabilities`, dto),
  updateLiability: (userId: string, id: string, dto: Partial<CreateFinancialLiabilityDto>) =>
    api.patch<FinancialLiability>(`users/${userId}/financial-liabilities/${id}`, dto),
  deleteLiability: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/financial-liabilities/${id}`),

  computeNetWorth(
    assets: FinancialAsset[],
    liabilities: FinancialLiability[],
    bankAccounts: BankAccount[],
  ) {
    const totalAssets =
      assets.reduce((s, a) => s + Number(a.current_value ?? 0), 0) +
      bankAccounts.reduce((s, a) => s + Number(a.display_balance ?? 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.current_balance ?? 0), 0);
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  },
};
