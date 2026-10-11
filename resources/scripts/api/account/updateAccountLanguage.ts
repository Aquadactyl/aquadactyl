import http from "@/api/http";

export interface LanguagePreference {
  language: string;
  locale: string;
}

export default async (language: string): Promise<LanguagePreference> => {
  const { data } = await http.put<LanguagePreference>(
    "/api/client/account/language",
    {
      language,
    },
  );
  return data;
};
