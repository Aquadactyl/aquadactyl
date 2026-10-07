# Default Aquadactyl theme

The default theme uses charcoal backgrounds, soft grey text and muted aqua
accents across the client dashboard, authentication pages, console and admin
area. Inputs, menus and dialogs use dark surfaces. Keyboard focus remains
visible, and animations respect the browser's reduced motion preference.

## Palette

| Role | Colour | Client token | Admin CSS variable |
| --- | --- | --- | --- |
| Page background | `#232428` | `gray.800` | `--aqua-background` |
| Navigation and inset controls | `#1e1f22` | `gray.900` | `--aqua-chrome` |
| Cards and dialogs | `#313338` | `gray.700` | `--aqua-surface` |
| Raised surfaces and subtle borders | `#41444c` | `gray.600` | `--aqua-raised`, `--aqua-border` |
| Body text | `#d6d9df` | `gray.200` | `--aqua-text` |
| Headings | `#f2f3f5` | `gray.50` | `--aqua-heading` |
| Secondary text | `#b0b5bf` | `gray.400` | `--aqua-muted` |
| Control borders | `#8a909d` | `gray.500` | `--aqua-control-border` |
| Links and focus outlines | `#78d4cc` | `blue.300` | `--aqua-accent` |
| Primary buttons | `#237c7f` | `blue.500` | `--aqua-primary` |
| Primary button hover | `#20696d` | `blue.600` | `--aqua-primary-hover` |
| Primary button text | `#effcfa` | `blue.50` | `--aqua-on-primary` |
| Terminal background | `#18191c` | `black`, `gray.950` | — |

`neutral` aliases `gray`; `primary` and `cyan` alias `blue` for existing panel
components and Blueprint addons. Status colours retain their meaning: green
for success, amber for warnings and red for errors or destructive actions.

## Customising the theme

Client colours are defined in `tailwind.config.js`, with shared browser styles
in `resources/scripts/assets/css/GlobalStylesheet.ts`. The admin palette lives
in `public/themes/pterodactyl/css/palette.css`, imported by `pterodactyl.css`.
Keep both palettes aligned when changing the default theme.

Rebuild client assets after changing Tailwind tokens or React styles:

```bash
pnpm install --frozen-lockfile
pnpm run build:production
```

Admin CSS is served directly, so CSS-only changes need a browser refresh.
Blueprint's bundled admin styles use these variables with fallbacks for other
themes. Addon authors can use the existing client tokens and shared components,
or reference the admin variables in their extension stylesheet. See the
[addon development guide](ADDONS.md) for imports and build conventions.

Review long server names, narrow screens, form errors, menus, keyboard focus and
text contrast when overriding colours. Use `gray.400` for secondary text on
dark surfaces; the darker `gray.600` and `gray.700` values are surface colours.
