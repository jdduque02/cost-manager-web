import { api } from "./client";

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  image_url?: string;
  link?: string;
  published_at: string;
}

export const newsApi = {
  getNews: (limit?: number) => api.get<NewsItem[]>(`news${limit ? `?limit=${limit}` : ""}`),
};
