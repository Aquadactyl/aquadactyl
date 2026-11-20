# Legacy Blueprint compatibility

Aquadactyl includes compatibility API **v1** for Blueprint addons built for
Pterodactyl 1.x. Install the original package using the normal command:

```sh
blueprint -i myaddon
blueprint -r myaddon
```

The archive and its source files are preserved. The frontend build resolves old
imports through adapters and compiles legacy styling automatically. Installation
checks the frontend before running update scripts or changing panel files.
No conversion service, network upload or additional account is required. During
preflight, both `@blueprint/extensions/{identifier}/...` and
`@/blueprint/extensions/{identifier}/...` resolve to the extracted addon's own
components. Imports using its actual identifier work too, before installation
has created any extension symlinks or replaced placeholders.

Check a package without installing it:

```sh
blueprint -check myaddon
```

Place `myaddon.blueprint` in the panel root first (`/app` in Docker or the panel
directory on Linux). The check uses a temporary extraction and an in-memory
frontend build. It does not run addon lifecycle scripts, migrations or PHP code,
and does not replace the panel's compiled assets. A failed frontend check exits
with an error and blocks installation. The existing installed version is retained.

## Supported interfaces

| Older addon interface                                                                                                   | Aquadactyl behavior                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blueprint manifests, component slots, routes and placeholders                                                           | Retained by the bundled Blueprint framework, including older dashboard slot names.                                                                                                                                                        |
| `Pterodactyl` PHP namespaces and `/themes/pterodactyl/` assets                                                          | Retained; application behavior still depends on the specific addon.                                                                                                                                                                       |
| `easy-peasy` application `useStoreState`, `useStoreActions`, `useStore`                                                 | Uses the current application store, including live updates and flash messages. Type-only `Actions`, `State`, `Action` and `Thunk` imports are available.                                                                                  |
| `ServerContext` from `@/state/server`                                                                                   | Retained and backed by the current server store.                                                                                                                                                                                          |
| `react-router-dom` v5 `useHistory`, `useRouteMatch`, `matchPath`, `Route`, `Switch`, `Redirect`, `NavLink`, `useParams` | Adapters use the current router and provide common v5 matching, navigation, route props and active link styling. Current router exports such as `Link` and `useLocation` are also available.                                              |
| `twin.macro`, `tw` props, `css` props, `tw.div`, `styled`, `css`                                                        | Compiled with a separate Tailwind 3 toolchain and styled-components 6. Babel 8 removes TypeScript before Babel 7 runs legacy styling plugins. Panel Tailwind 4 remains separate. Legacy palette colors use the live appearance variables. |
| Formik and Yup; `@/components/elements/Field`                                                                           | Formik forms continue to register fields and show validation with the panel's current input styling.                                                                                                                                      |
| `@/components/elements/FormikFieldWrapper`                                                                              | Retains custom controls, labels, descriptions, nested field errors and synchronous/asynchronous Formik field validation.                                                                                                                  |
| `react-router` v5 `useHistory` and `useRouteMatch`                                                                      | Restores the removed hooks while keeping current `Route`, `Routes` and other router exports. Use the existing `react-router-dom` adapter for legacy v5 route components.                                                                  |
| Legacy button `styles` imports from `@/components/elements/button` or `/button/index`                                   | Maps CSS-module keys to the current panel button classes and retains the current `Button` component.                                                                                                                                      |
| Slash opacity utilities such as `bg-neutral-800/40`                                                                     | Preserves opacity and live appearance palette changes in the legacy Twin/Tailwind compiler.                                                                                                                                               |
| `react-transition-group` `CSSTransition`                                                                                | Provides a React 19-safe DOM ref when omitted, preserves child refs and cleanup, and retains legacy callbacks, timeouts, CSS classes and mount/unmount behaviour. Explicit `nodeRef` is respected.                                        |
| Font Awesome solid, regular and brand icons                                                                             | Original icon imports are available to addons; the panel continues to use its current icons.                                                                                                                                              |
| `swr`, `lodash`, `styled-components`                                                                                    | Available from the compatibility package.                                                                                                                                                                                                 |
| `framer-motion`                                                                                                         | Resolves to `motion/react`. Addons using removed motion APIs may need changes.                                                                                                                                                            |
| Axios and existing panel API imports                                                                                    | Use the existing panel dependencies and API endpoints.                                                                                                                                                                                    |

Adapters apply to addon modules, including Blueprint symlinks, rather than
replacing the panel's modern components. Compatibility dependencies enter the
browser bundle only when imported. They are installed by `pnpm install` and
included in the Docker image, so runtime addon installation works there too.

The Babel, Twin and Tailwind 3 compiler packages are build dependencies, separate
from browser libraries. The legacy selector parser is pinned to a patched version;
the committed braces patch bounds parsed pattern nesting to 128 levels to address
[CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Production dependency audits pass. A full audit can still flag that upstream
braces version because it does not recognize local patches; the regression tests
check that deeply nested patterns fail safely. No advisory is suppressed.

## Limits

This is a compatibility layer, not a guarantee for every Pterodactyl modification.
These cases still need an addon-specific change:

- Shell scripts that replace or patch core files, invoke Yarn, change dependency
  versions, or depend on old Webpack build outputs.
- Themes targeting generated styled-components class names, removed DOM
  structures or old Tailwind configuration plugins.
- Addons importing removed/private core components or extra packages that are
  not installed. The frontend check reports these imports.
- Addons creating their own Easy Peasy stores with `createStore`, `action`,
  `thunk`, `StoreProvider` or `createContextStore`. Application store hooks are
  supported; a second state system is not emulated.
- Advanced React Router 5 APIs such as `withRouter`, history `block`/`listen`,
  custom routers, location overrides, optional parameter syntax or custom
  `NavLink.isActive` callbacks.
- Old React APIs removed in React 19, incompatible PHP/Laravel packages, or
  addon-specific assumptions about databases and server software.
- Transition helpers other than `CSSTransition` still need an adapter. Transition
  children must be DOM elements or forward their ref to a DOM element, unless the
  addon supplies a valid `nodeRef`. Addons remain responsible for transition CSS.

Successful compilation does not verify an addon's runtime behavior, security,
permissions, third-party services or custom scripts. Install packages from
publishers you trust and keep backups as usual. Custom lifecycle scripts are
reported for review; their effects cannot be translated safely in general.

## Addons that patch core PHP files

Some older addons copy controllers/models into `app/` and edit the panel's route
files from `private/install.sh`. Those scripts normally run as the configured
web user. On root-owned deployments they cannot change panel source. Frontend
compilation alone does not establish that these backend changes succeeded.

Lifecycle scripts now stop on failed commands/pipelines and propagate a failing
exit code to Blueprint. A failed new install is not added to the active list, and a
failed removal stops before deleting the addon. A script can still have made
partial changes before failing; inspect the output and restore a backup if needed.

After reviewing a trusted addon's install and removal scripts and backing up the
panel, a root operator can explicitly allow core modifications for one command:

```bash
sudo BLUEPRINT__ALLOW_CORE_SCRIPTS=1 blueprint -i myaddon
sudo BLUEPRINT__ALLOW_CORE_SCRIPTS=1 blueprint -r myaddon
```

This runs custom lifecycle scripts as root, with permission to change host files.
The default web-user execution and root-owned panel permissions remain in place.
The admin web installer does not enable this option automatically. The existing
`developerEscalateInstallScript` manifest flag retains its install-time behavior.

If an earlier version reported success but an addon endpoint returns 404, check
`php artisan route:list --path=domains` (substitute the addon's endpoint), the
addon's copied controller/model files and installation output. Missing backend
files require reapplying the reviewed install script; clearing caches alone does
not create them. Keep any existing addon settings/data and rebuild the route
cache as the web user after the repair.

## Stable API for new addons

New addons can use `@blueprint/compat` for the version constant, application
store hooks, common legacy routing hooks and Formik-compatible `Field`. Existing
addons do not have to switch imports to benefit from the adapters. Version 1
should gain support additively; incompatible changes require a new contract.

## Validation

Automated tests cover shared store updates, form registration and validation,
router matching/navigation, source scoping, macro compilation and unsupported
utilities. The original **MC Logs 1.6**, **Laravel Logs 1.5** and **Resource Manager
1.4.1** archives are used for local WSL installation checks. These examples are
not a blanket certification of other addons or themes.

The unchanged **MC Mods 2.1**, **MC Plugins 2.1** and **Subdomains 0.5.2** packages
also pass the frontend preflight checks. This does not run their PHP or lifecycle
scripts or certify their external services. The MC manager packages include
publisher-specific daemon modifications; those need separate review against the
installed Manta/Wings version. The frontend adapter does not apply daemon patches.
