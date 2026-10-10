const names: Record<string, string> = {
  auth: "Sign-in",
  user: "User accounts",
  account: "Account",
  "api-key": "API keys",
  "ssh-key": "SSH keys",
  "two-factor": "Two-step verification",
  server: "Server",
  power: "Power",
  console: "Console",
  file: "Files",
  sftp: "SFTP",
  backup: "Backups",
  database: "Databases",
  allocation: "Network",
  schedule: "Schedules",
  task: "Schedule tasks",
  settings: "Settings",
  startup: "Startup",
  subuser: "Users and permissions",
};
const labels: Record<string, string> = {
  "auth:success": "Successful sign-in",
  "auth:fail": "Failed sign-in",
  "auth:password-reset": "Password reset",
  "auth:reset-password": "Password reset requested",
  "auth:checkpoint": "Two-step challenge requested",
  "auth:token": "Two-step challenge completed",
  "auth:recovery-token": "Recovery code used",
  "auth:sftp.fail": "Failed SFTP sign-in",
  "user:account.avatar-updated": "Profile picture updated",
  "user:account.avatar-removed": "Profile picture removed",
  "user:account.privacy-updated": "Privacy settings updated",
  "user:account.password-changed": "Password changed",
  "user:account.email-changed": "Email address changed",
  "user:user.create": "User account created",
  "server:power.start": "Server started",
  "server:power.stop": "Server stopped",
  "server:power.restart": "Server restarted",
  "server:power.kill": "Server process killed",
  "server:reinstall": "Server reinstalled",
};
const humanize = (value: string) =>
  value
    .replace(/[_:.-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
export const activityCategory = (
  event: string,
): { prefix: string; label: string } => {
  const colon = event.indexOf(":");
  const dot = event.indexOf(".", colon + 1);
  const prefix = event.slice(
    0,
    dot === -1 ? colon + 1 || event.length : dot + 1,
  );
  const category =
    dot === -1
      ? event.slice(0, colon === -1 ? event.length : colon)
      : event.slice(colon + 1, dot);
  return { prefix, label: names[category] || humanize(category) };
};
export const activityEventLabel = (event: string): string => {
  if (labels[event]) return labels[event];
  const action = event.slice(
    Math.max(event.lastIndexOf("."), event.lastIndexOf(":")) + 1,
  );
  return `${activityCategory(event).label} · ${humanize(action)}`;
};
