import { formatConsoleOutput } from "./formatConsoleOutput";

it("uses the Aquadactyl prompt for plain and ANSI-colored image startup output", () => {
  const output =
    "\u001b[1m\u001b[33mcontainer@pterodactyl~ \u001b[0mjava -version\ncontainer@pterodactyl~ java -jar server.jar";
  expect(formatConsoleOutput(output)).toBe(
    "\u001b[1m\u001b[33mcontainer@aquadactyl~ \u001b[0mjava -version\ncontainer@aquadactyl~ java -jar server.jar",
  );
});

it("preserves game messages, image references and other container names", () => {
  const output =
    "Pulling from pterodactyl/yolks\nUser says: container@pterodactyl~\ncontainer@pterodactyl-server~ hi\ncontainer@aquadactyl~ Server marked as running...";
  expect(formatConsoleOutput(output)).toBe(output);
});
