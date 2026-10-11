import http from "@/api/http";

export default async (password: string): Promise<string[]> => {
  const { data } = await http.post(
    "/api/client/account/two-factor/regenerate-tokens",
    { password },
  );

  return data.attributes.tokens;
};
