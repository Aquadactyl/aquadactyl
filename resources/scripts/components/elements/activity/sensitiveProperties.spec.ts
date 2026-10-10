import { isSensitiveProperty } from "./sensitiveProperties";

describe("activity sensitive properties", () => {
  it.each([
    "email",
    "ip",
    "ip_address",
    "password",
    "token",
    "api_token",
    "totpSecret",
    "connectionString",
    "credentials.password",
    "sftp_domain",
    "fqdn",
  ])("recognizes the %s property", (key) =>
    expect(isSensitiveProperty(key, "example")).toBe(true),
  );
  it.each(["user@example.com", "192.0.2.10", "2001:db8::1", "ptlc_example"])(
    "recognizes sensitive data in unlabeled properties",
    (value) => {
      expect(isSensitiveProperty("old", value)).toBe(true);
    },
  );
  it("leaves ordinary filenames and counts visible", () => {
    expect(isSensitiveProperty("file", "/server.properties")).toBe(false);
    expect(isSensitiveProperty("count", 5)).toBe(false);
    expect(isSensitiveProperty("command", "say hello")).toBe(false);
  });
});
