import { api, apiPostForm } from "./client";

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string | null;
  category: string | null;
  image_url: string | null;
  link: string | null;
  published_at: string | null;
  created_at: string;
}

export interface CreateNewsItemDto {
  title: string;
  summary: string;
  content?: string | null;
  category?: string | null;
  image_url?: string | null;
  link?: string | null;
  published_at?: string | null;
}

export interface BroadcastEmailResult {
  key: string;
  subject: string;
  recipients: number;
  sent: number;
  failed: number;
  errors?: string[];
}

export const newsApi = {
  getNews: (limit?: number) => {
    const endpoint = limit ? `news?limit=${limit}` : "news";
    return api.get<NewsItem[]>(endpoint);
  },

  getById: (id: number) => api.getOne<NewsItem>(`news/${id}`),

  create: (dto: CreateNewsItemDto) =>
    apiPostForm<NewsItem>("news", dto as unknown as Record<string, unknown>),

  update: (id: number, dto: Partial<CreateNewsItemDto>) =>
    api.patch<NewsItem>(`news/${id}`, dto as Record<string, unknown>),

  delete: (id: number) => api.delete(`news/${id}`),

  broadcast: (subject: string, htmlBody: string) =>
    api.post<BroadcastEmailResult>("broadcast-email", { subject, html_body: htmlBody }),
};
