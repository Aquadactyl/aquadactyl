# Default Aquadactyl theme

The default theme uses charcoal backgrounds, soft grey text and muted aqua
accents across the client dashboard, authentication pages, console and admin
area. Inputs, menus and dialogs use dark surfaces. Keyboard focus remains
visible, and animations respect the browser's reduced motion preference.

## Palette

| Role                          | Colour    | Client token                | Admin CSS variable      |
| ----------------------------- | --------- | --------------------------- | ----------------------- |
| Page background               | `#171c21` | `gray.800`                  | `--aqua-background`     |
| Navigation and inset controls | `#11161b` | `gray.900`                  | `--aqua-chrome`         |
| Interface cards               | `#1c232a` | `--panel-surface`           | `--aqua-surface`        |
| Raised surfaces               | `#272e35` | `gray.700`                  | `--aqua-raised`         |
| Subtle borders                | `#303942` | `--panel-border`            | `--aqua-border`         |
| Body text                     | `#d7dce1` | `gray.200`                  | `--aqua-text`           |
| Headings                      | `#f5f6f7` | `gray.50`                   | `--aqua-heading`        |
| Secondary text                | `#9ca5af` | `gray.400`, `--panel-muted` | `--aqua-muted`          |
| Control borders               | `#39424b` | `gray.600`                  | `--aqua-control-border` |
| Links and focus outlines      | `#78d4cc` | `blue.300`                  | `--aqua-accent`         |
| Primary buttons               | `#237c7f` | `blue.500`                  | `--aqua-primary`        |
| Primary button hover          | `#20696d` | `blue.600`                  | `--aqua-primary-hover`  |
| Primary button text           | `#effcfa` | `blue.50`                   | `--aqua-on-primary`     |
| Terminal background           | `#0c1116` | `black`, `gray.950`         | None                    |

`neutral` aliases `gray`; `primary` and `cyan` alias `blue` for existing panel
components and Blueprint addons. Status colours retain their meaning: green
for success, amber for warnings and red for errors or destructive actions.

## Customising the theme

### Brand assets

The supplied Aquadactyl artwork is used across login, navigation, the admin
header, browser favicons, Apple touch icons and Windows tiles. Narrow client
headers and the collapsed admin sidebar use the emblem. Custom panel names
remain visible alongside it.

| Asset                        | File                                      |
| ---------------------------- | ----------------------------------------- |
| Transparent emblem           | `public/branding/aquadactyl-emblem.png`   |
| Transparent wordmark         | `public/branding/aquadactyl-wordmark.png` |
| Banner with background       | `public/branding/aquadactyl-banner.png`   |
| Supplied vector emblem       | `public/favicons/aquadactyl.svg`          |
| Original PNG and SVG sources | `resources/branding/`                     |

To regenerate the trimmed PNG logos and square PNG/ICO icons after replacing the
source PNGs, use PHP with the GD extension:

```bash
php scripts/build/branding.php
```

The generator preserves the artwork's colours and proportions, trims transparent
canvas padding, centres the emblem and adds a dark background to Apple icons.
PNG and ICO browser icons preserve the supplied emblem's colour gradient. The
coloured vector emblem is copied unchanged from the supplied SVG. Its original
canvas and path coordinates are also retained in the monochrome Safari mask.
SVG viewports must come from the SVG source, not from cropped PNG coordinates.
Keep the vector files aligned with any new artwork.
The icon metadata is shared in `resources/views/partials/favicons.blade.php`.
Update the icon URLs' version query when replacing existing browser icons so
browsers fetch the new files.

### Colours and layouts

Client dropdowns use the shared `Select` component with the charcoal and aqua
styles in `interface.css`. Admin selects use Select2, including fields added by
Blueprint; existing AJAX and dependent selectors keep their page-specific setup.
The server creation form uses a two-column grid with 32px column gutters and
24px field gaps, switching to one column on phone screens.

The console displays the Aquadactyl prompt for startup messages from Yolks
images as well as panel status messages. ANSI colours, game output and image
registry references retain their original content.

Client utility colours are defined in `tailwind.config.ts`. Interface cards,
navigation, authentication and server rows use `resources/scripts/assets/css/interface.css`;
browser defaults and fonts use `resources/scripts/assets/css/GlobalStylesheet.ts`.
The runtime theme helper in `resources/scripts/lib/theme.ts` and the terminal
palette should stay aligned with these colours. The admin palette lives
in `public/themes/pterodactyl/css/palette.css`, imported by `pterodactyl.css`.
Keep both palettes aligned when changing the default theme.

Rebuild client assets after changing Tailwind tokens or React styles:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Admin CSS is served directly, so CSS-only changes need a browser refresh.
Blueprint's bundled admin styles use these variables with fallbacks for other
themes. Addon authors can use the existing client tokens and shared components,
or reference the admin variables in their extension stylesheet. See the
[addon development guide](ADDONS.md) for imports and build conventions.

Review long server names, narrow screens, form errors, menus, keyboard focus and
text contrast when overriding colours. Use `gray.400` for secondary text on
dark surfaces. The darker `gray.600` and `gray.700` values are surface colours;
check text contrast against the particular surface an addon uses.
