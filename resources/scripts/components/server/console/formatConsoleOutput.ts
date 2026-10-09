// Yolks images print their own prompt independently of the panel and Wings.
// Only normalize the prompt at the start of a line, preserving ANSI styling.
export const formatConsoleOutput = (output: string): string =>
    // eslint-disable-next-line no-control-regex -- Terminal prompts include ANSI escape sequences.
    output.replace(/^((?:\u001b\[[\d;]*m)*)container@pterodactyl(?=~(?:\s|\u001b|$))/gm, '$1container@aquadactyl');
