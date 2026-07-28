import { api } from "./client";

export interface Category {
  id: number;
  name: string;
  group_type: "income" | "expense";
  icon_key?: string | null;
  color_hex?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Subcategory {
  id: number;
  user_id: number;
  category_id: number;
  name: string;
  icon_key?: string | null;
  color_hex?: string | null;
  created_at: string;
  updated_at: string | null;
}

export type CreateCategoryDto = {
  name: string;
  group_type: "income" | "expense";
  icon_key?: string;
  color_hex?: string;
  sort_order?: number;
};

export type UpdateCategoryDto = Partial<CreateCategoryDto> & { is_active?: boolean };

export type CreateSubcategoryDto = {
  category_id: number;
  name: string;
  icon_key?: string;
  color_hex?: string;
};

export type UpdateSubcategoryDto = {
  name?: string;
  icon_key?: string;
  color_hex?: string;
};

export const catalogApi = {
  getCategories: () => api.get<Category[]>("catalog/categories"),
  getCategory: (id: number) => api.get<Category>(`catalog/categories/${id}`),
  createCategory: (dto: CreateCategoryDto) =>
    api.post<Category>("catalog/categories", dto),
  updateCategory: (id: number, dto: UpdateCategoryDto) =>
    api.patch<Category>(`catalog/categories/${id}`, dto),
  deleteCategory: (id: number) =>
    api.delete<void>(`catalog/categories/${id}`),

  getSubcategories: (userId: string, categoryId?: number) => {
    const qs = categoryId ? `?categoryId=${categoryId}` : "";
    return api.get<Subcategory[]>(`users/${userId}/catalog/subcategories${qs}`);
  },
  createSubcategory: (userId: string, dto: CreateSubcategoryDto) =>
    api.post<Subcategory>(`users/${userId}/catalog/subcategories`, dto),
  updateSubcategory: (userId: string, id: number, dto: UpdateSubcategoryDto) =>
    api.patch<Subcategory>(`users/${userId}/catalog/subcategories/${id}`, dto),
  deleteSubcategory: (userId: string, id: number) =>
    api.delete<void>(`users/${userId}/catalog/subcategories/${id}`),
};
