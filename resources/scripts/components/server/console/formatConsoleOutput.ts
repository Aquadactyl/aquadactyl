// Yolks images print their own prompt independently of the panel and Wings.
// Only normalize the prompt at the start of a line, preserving ANSI styling.
const ESC = String.fromCharCode(27);
const PROMPT_REGEX = new RegExp(`^((?:${ESC}\\[[\\d;]*m)*)container@pterodactyl(?=~(?:\\s|${ESC}|$))`, 'gm');

export const formatConsoleOutput = (output: string): string => output.replace(PROMPT_REGEX, '$1container@aquadactyl');
