import http from "@/api/http";

export default (
  server: string,
  file: string,
  signal?: AbortSignal,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${server}/files/contents`, {
        params: { file },
        transformResponse: (res) => res,
        responseType: "text",
        ...(signal ? { signal } : {}),
      })
      .then(({ data }) => resolve(data))
      .catch(reject);
  });
};
