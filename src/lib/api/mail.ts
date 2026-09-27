import { api } from "./client";

export const OTP_EMAIL_TEMPLATE_KEY = "otp_password_reset";

export interface EmailTemplate {
  key: string;
  subject: string;
  html_body: string;
  updated_at: string | null;
  is_default?: boolean;
}

export interface UpdateEmailTemplateDto {
  subject: string;
  html_body: string;
}

export const mailApi = {
  getTemplate: (key: string) => api.getOne<EmailTemplate>(`email-templates/${key}`),
  updateTemplate: (key: string, dto: UpdateEmailTemplateDto) =>
    api.put<EmailTemplate>(`email-templates/${key}`, dto),
};
