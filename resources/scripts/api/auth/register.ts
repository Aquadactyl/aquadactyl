import http from "@/api/http";

export interface RegisterResponse {
  complete: boolean;
  intended?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  name_first: string;
  name_last: string;
  password: string;
  password_confirmation: string;
  recaptchaData?: string | null;
}

export default ({
  username,
  email,
  name_first,
  name_last,
  password,
  password_confirmation,
  recaptchaData,
}: RegisterData): Promise<RegisterResponse> => {
  return new Promise((resolve, reject) => {
    http
      .get("/sanctum/csrf-cookie")
      .then(() =>
        http.post("/auth/register", {
          username,
          email,
          name_first,
          name_last,
          password,
          password_confirmation,
          "g-recaptcha-response": recaptchaData,
        }),
      )
      .then((response) => {
        if (!(response.data instanceof Object)) {
          return reject(
            new Error(
              "An error occurred while processing the registration request.",
            ),
          );
        }

        return resolve({
          complete: response.data.data.complete,
          intended: response.data.data.intended || undefined,
        });
      })
      .catch(reject);
  });
};
