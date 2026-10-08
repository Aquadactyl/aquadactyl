# Developing Aquadactyl addons and themes

For installing and maintaining extensions, use the
[Blueprint guide](https://aquadactyl.uk/docs/blueprint). This document covers
development against the panel's shared libraries.

Blueprint addons compile into the panel's React application. The packages below
are direct dependencies of Aquadactyl, so extensions can import them without
installing their own copies. Assets include a library when an extension uses it;
adding a dependency alone does not include it in the panel's browser bundle.

## Shared frontend libraries

| Package | Use |
| --- | --- |
| `axios` | HTTP requests; prefer `@/api/http` for panel API calls |
| `lucide-react` | SVG icons through named component imports |
| `react-hook-form`, `@hookform/resolvers` | Forms and schema validation adapters |
| `zod` | Typed validation of forms, settings and API responses |
| `zustand` | Small extension-specific state stores |
| `react-select` | Searchable and multi-value selects |
| `lodash-es` | Utility functions with ES module imports |
| `date-fns` | Date formatting and arithmetic |
| `framer-motion` | Animation |
| `chart.js`, `react-chartjs-2` | Charts |
| `@headlessui/react`, `@floating-ui/react-dom-interactions` | Accessible UI behaviour and positioning |
| `styled-components`, `tailwindcss`, `classnames` | Styling and conditional classes |
| `formik`, `yup` | The panel's existing form and validation libraries |
| `swr`, `easy-peasy` | The panel's existing fetching and state tools |
| `i18next`, `react-i18next` | Translation |

React and React DOM remain on 16.14 for compatibility with this panel and Blueprint.
Zod uses the 3.x API, Zustand the 4.x API, and Hook Form resolvers the 3.x API.
These versions work with the existing React and TypeScript toolchain. Use the
panel's React installation so extension hooks share the same runtime.

## Imports

```tsx
import http from '@/api/http';
import { Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const settingsSchema = z.object({ label: z.string().trim().min(1).max(80) });
type SettingsValues = z.infer<typeof settingsSchema>;

export default function ExtensionSettings() {
    const { register, handleSubmit } = useForm<SettingsValues>({
        resolver: zodResolver(settingsSchema),
    });

    return (
        <form onSubmit={handleSubmit(async (values) => {
            await http.put('/api/client/extensions/myextension/settings', values);
        })}>
            <input {...register('label')} aria-label="Label" />
            <button type="submit"><Settings size={16} /> Save</button>
        </form>
    );
}
```

The example API route must be implemented by your extension. The shared Axios
client applies the panel's request headers, credentials, timeout and progress
handling. Server routes must still validate input and enforce authorization.

## Building and adding dependencies

```bash
pnpm install --frozen-lockfile
pnpm run tsc
pnpm run lint
pnpm run build:production
```

For a library outside the shared catalogue, maintainers can use
`pnpm add --save-prod package-name` or `pnpm add --save-dev package-name`, review
the resulting `package.json` and `pnpm-lock.yaml`, and test before publishing a
release. Extension install scripts should not rewrite the panel's lockfile or
download floating dependency versions during deployment. Declare any additional
requirements in the extension's documentation.

`pnpm-workspace.yaml` retains a flat dependency layout for Blueprint and explicitly
blocks unnecessary dependency postinstall scripts. Dependencies requiring builds
need a reviewed `allowBuilds` entry. See the
[pnpm build settings](https://pnpm.io/settings/build) for that policy.

Backend addons use PHP 8.4 or 8.5, Laravel 12, Guzzle, Flysystem, Symfony HTTP
Client and the other packages already declared in `composer.json`. Add PHP
dependencies through Composer and commit the lockfile as part of a tested panel
release. See [building](../BUILDING.md) and [deployment](DEPLOYMENT.md).
