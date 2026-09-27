import { api } from "./client";

export interface Empresa {
  id: number;
  user_id: number;
  name: string;
  default_category_id?: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateEmpresaDto {
  name: string;
  default_category_id?: number;
}

export const empresaApi = {
  getEmpresas: (userId: string) => api.get<Empresa[]>(`users/${userId}/empresas`),

  createEmpresa: (userId: string, dto: CreateEmpresaDto) =>
    api.post<Empresa>(`users/${userId}/empresas`, dto),

  updateEmpresa: (userId: string, id: number, dto: Partial<CreateEmpresaDto>) =>
    api.patch<Empresa>(`users/${userId}/empresas/${id}`, dto),

  deleteEmpresa: (userId: string, id: number) => api.delete<void>(`users/${userId}/empresas/${id}`),
};
