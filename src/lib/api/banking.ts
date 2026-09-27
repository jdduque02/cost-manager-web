import { api } from "./client";
import { buildQueryString } from "./finance";

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
  "credito_hipotecario" | "credito_consumo" | "tarjeta_credito" | "prestamo_personal" | "otro";
export type AccountType =
  | "ahorros"
  | "corriente"
  | "inversion"
  | "cdt"
  | "ahorro_alto_rendimiento"
  | "fna"
  | "aporte_pension_voluntaria"
  | "otro";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ahorros: "Ahorros",
  corriente: "Corriente",
  inversion: "Inversión",
  cdt: "CDT / Inversión",
  ahorro_alto_rendimiento: "Cuenta de ahorro de alto rendimiento",
  fna: "FNA - Fondo Nacional del Ahorro",
  aporte_pension_voluntaria: "Aporte Pensión Voluntaria",
  otro: "Otro",
};

export function accountTypeLabel(type: string): string {
  return ACCOUNT_TYPE_LABELS[type as AccountType] ?? type.replace(/_/g, " ");
}

export interface BankAccount {
  id: number;
  user_id: number;
  bank_name: string;
  account_type: AccountType;
  masked_account_number: string;
  display_balance: string;
  currency: string;
  annual_interest_rate?: number | null;
  yield_frequency: string;
  rate_type: string;
  interest_enabled: boolean;
  last_interest_applied_at: string | null;
  interest_start_date: string | null;
  term_days: number | null;
  start_date: string | null;
  maturity_date: string | null;
  maturity_action: string;
  auto_renew: boolean;
  is_primary: boolean;
  exempt_4x1000: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateBankAccountDto {
  bank_name: string;
  account_type: AccountType;
  account_number: string;
  balance: number;
  currency?: string;
  annual_interest_rate?: number;
  yield_frequency?: string;
  rate_type?: string;
  interest_enabled?: boolean;
  interest_start_date?: string;
  term_days?: number;
  start_date?: string;
  maturity_action?: string;
  auto_renew?: boolean;
  is_primary?: boolean;
  exempt_4x1000?: boolean;
}

export interface FxRates {
  cop_per_usd: number;
  usd_per_cop: number;
  source: string;
  updated_at: string;
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
  /** Solo tarjetas de crédito. El API lo manda como string decimal: se convierte a number. */
  credit_limit?: number | null;
  statement_day?: number | null;
  payment_due_day?: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateFinancialLiabilityDto {
  liability_type: LiabilityType;
  name: string;
  current_balance: number;
  interest_rate?: number;
  currency?: string;
  /** Solo si `liability_type` es `tarjeta_credito`; en otro tipo el API responde 400. */
  credit_limit?: number | null;
  statement_day?: number | null;
  payment_due_day?: number | null;
}

/** Cupo disponible de una tarjeta (cupo − saldo actual); null si no tiene cupo registrado. */
export function availableCredit(l: FinancialLiability): number | null {
  return l.credit_limit == null ? null : l.credit_limit - Number(l.current_balance ?? 0);
}

export type ProductKind = "account" | "liability";
export type ProductClosureStatus = "pending" | "reconciled" | "skipped";

/** Cierre de una cuenta o tarjeta por periodo. Montos en la moneda del producto. */
export interface ProductClosure {
  id: number;
  product_kind: ProductKind;
  product_id: number;
  period_start: string;
  period_end: string;
  currency: string;
  expected_balance: number;
  /** null hasta conciliar. */
  reported_balance: number | null;
  /** real − esperado; null hasta conciliar. */
  difference: number | null;
  minimum_payment: number | null;
  total_payment: number | null;
  status: ProductClosureStatus;
  adjustment_tx_id: number | null;
}

export interface ProductClosureQuery {
  product_kind?: ProductKind;
  product_id?: number;
  status?: ProductClosureStatus;
}

export interface ReconcileProductClosureDto {
  reported_balance: number;
  /** Solo tarjetas. */
  minimum_payment?: number;
  total_payment?: number;
}

const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

// El numeric de Postgres puede llegar como string: todo monto pasa por Number(...).
function toClosure(c: ProductClosure): ProductClosure {
  return {
    ...c,
    expected_balance: Number(c.expected_balance ?? 0),
    reported_balance: numOrNull(c.reported_balance),
    difference: numOrNull(c.difference),
    minimum_payment: numOrNull(c.minimum_payment),
    total_payment: numOrNull(c.total_payment),
  };
}

export const bankingApi = {
  getAccounts: (userId: string) => api.get<BankAccount[]>(`users/${userId}/bank-accounts`),
  createAccount: (userId: string, dto: CreateBankAccountDto) =>
    api.post<BankAccount>(`users/${userId}/bank-accounts`, dto),
  updateAccount: (userId: string, id: string, dto: Partial<CreateBankAccountDto>) =>
    api.patch<BankAccount>(`users/${userId}/bank-accounts/${id}`, dto),
  deleteAccount: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/bank-accounts/${id}`),

  getCurrencyRates: () => api.get<FxRates>(`currency/rates`),

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
    api.get<FinancialLiability[]>(`users/${userId}/financial-liabilities`).then((liabilities) =>
      liabilities.map((l) => ({
        ...l,
        current_balance: Number(l.current_balance ?? 0),
        credit_limit: numOrNull(l.credit_limit),
      })),
    ),
  createLiability: (userId: string, dto: CreateFinancialLiabilityDto) =>
    api.post<FinancialLiability>(`users/${userId}/financial-liabilities`, dto),
  updateLiability: (userId: string, id: string, dto: Partial<CreateFinancialLiabilityDto>) =>
    api.patch<FinancialLiability>(`users/${userId}/financial-liabilities/${id}`, dto),
  deleteLiability: (userId: string, id: string) =>
    api.delete<void>(`users/${userId}/financial-liabilities/${id}`),

  // El API devuelve `data` siempre como array, también en detalle, reconcile y skip.
  getProductClosures: (userId: string, params: ProductClosureQuery = {}) =>
    api
      .get<ProductClosure[]>(`users/${userId}/product-closures${buildQueryString(params)}`)
      .then((closures) => closures.map(toClosure)),
  getProductClosure: (userId: string, id: number) =>
    api.getOne<ProductClosure>(`users/${userId}/product-closures/${id}`).then(toClosure),
  reconcileProductClosure: (userId: string, id: number, dto: ReconcileProductClosureDto) =>
    api
      .post<ProductClosure[]>(`users/${userId}/product-closures/${id}/reconcile`, dto)
      .then(([c]) => toClosure(c)),
  skipProductClosure: (userId: string, id: number) =>
    api
      .post<ProductClosure[]>(`users/${userId}/product-closures/${id}/skip`, undefined)
      .then(([c]) => toClosure(c)),

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
