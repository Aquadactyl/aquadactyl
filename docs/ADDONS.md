# Developing Aquadactyl addons and themes

For installing and maintaining extensions, use the
[Blueprint guide](https://aquadactyl.uk/docs/blueprint). This document covers
development against the panel's shared libraries.

Blueprint addons compile into the panel's React application. The packages below
are direct dependencies of Aquadactyl, so extensions can import them without
installing their own copies. Assets include a library when an extension uses it;
adding a dependency alone does not include it in the panel's browser bundle.

## Shared frontend libraries

| Package                                                    | Use                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `axios`                                                    | HTTP requests; prefer `@/api/http` for panel API calls |
| `lucide-react`                                             | SVG icons through named component imports              |
| `react-select`                                             | Searchable and multi-value selects                     |
| `lodash-es`                                                | Utility functions with ES module imports               |
| `date-fns`                                                 | Date formatting and arithmetic                         |
| `framer-motion`                                            | Animation                                              |
| `chart.js`, `react-chartjs-2`                              | Charts                                                 |
| `@headlessui/react`, `@floating-ui/react-dom-interactions` | Accessible UI behaviour and positioning                |
| `styled-components`, `tailwindcss`, `classnames`           | Styling and conditional classes                        |
| `formik`, `yup`                                            | The panel's existing form and validation libraries     |
| `react-hook-form`, `@hookform/resolvers`, `zod`            | Addon forms and schema validation                      |
| `zustand`                                                  | Lightweight addon state stores                         |
| `swr`, `easy-peasy`                                        | The panel's existing fetching and state tools          |
| `i18next`, `react-i18next`                                 | Translation                                            |

React and React DOM remain on 16.14 for compatibility with this panel and Blueprint.
Use the panel's React installation so extension hooks share the same runtime.
Formik and Yup support the panel's existing forms. React Hook Form, its Zod
resolver, Zod and Zustand are also shared dependencies for addons.

## Imports

```tsx
import http from '@/api/http';
import { Settings } from 'lucide-react';
import { Form, Formik } from 'formik';
import { object, string } from 'yup';
import Field from '@/components/elements/Field';
import Button from '@/components/elements/Button';

export default function ExtensionSettings() {
    return (
        <Formik
            initialValues={{ label: '' }}
            validationSchema={object({ label: string().trim().max(80).required('Enter a label.') })}
            onSubmit={async (values) => {
                await http.put('/api/client/extensions/myextension/settings', values);
            }}
        >
            {({ isSubmitting }) => (
                <Form>
                    <Field type='text' name='label' label='Label' />
                    <Button type='submit' disabled={isSubmitting}>
                        <Settings size={16} aria-hidden /> Save
                    </Button>
                </Form>
            )}
        </Formik>
    );
}
```

The example API route must be implemented by your extension. The shared Axios
client applies the panel's request headers, credentials, timeout and progress
handling. Server routes must still validate input and enforce authorization.

## Building and adding dependencies

Import `Select` from `@/components/elements/Select` for the panel's custom dark
dropdown. It accepts `<option>` and `<optgroup>` children and the existing native
select props, including `value`, `defaultValue`, `multiple`, `disabled`, `required`
and `onChange`. Change handlers receive an actual select element as both
`target` and `currentTarget`; native form values, refs and Formik fields continue
to work. Give the control an `id` with a matching label, or an `aria-label`.
Menus support search and keyboard navigation and stay within dialog focus traps.

```bash
pnpm install --frozen-lockfile
pnpm run types
pnpm run lint
pnpm run build
```

For a library outside the shared catalogue, maintainers can use
`pnpm add --save-prod package-name` or `pnpm add --save-dev package-name`, review
the resulting `package.json` and `pnpm-lock.yaml`, and test before publishing a
release. Extension install scripts should not rewrite the panel's lockfile or
download floating dependency versions during deployment. Declare any additional
requirements in the extension's documentation.

`pnpm-workspace.yaml` explicitly controls dependency postinstall scripts.
Dependencies requiring builds
need a reviewed `allowBuilds` entry. See the
[pnpm build settings](https://pnpm.io/settings/build) for that policy.

Backend addons use PHP 8.4 or 8.5, Laravel 12, Guzzle, Flysystem, Symfony HTTP
Client and the other packages already declared in `composer.json`. Add PHP
dependencies through Composer and commit the lockfile as part of a tested panel
release. See [building](../BUILDING.md) and [deployment](DEPLOYMENT.md).
