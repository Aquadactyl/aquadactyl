# Panel languages

Aquadactyl ships with English, French (**Français**), and German (**Deutsch**).
Users choose **Account → Language → Panel
language** to save a preference for their own account. **Automatic (browser
language)** follows the browser's ordered `Accept-Language` preferences on each
request. It supports regional tags such as `fr-CA`, `pt-BR`, and `zh-Hant` and
falls back to the configured site language when nothing installed matches.
Language choices never change another user's preference or the global setting.

New accounts default to automatic selection. Existing accounts keep their saved
preference. Automatic selection maps French regional preferences such as `fr-CA`
to French, and German preferences such as `de-DE` or `de-AT` to German. An explicit
account choice overrides the browser language. No IP lookup, location permission,
geolocation service, or new frontend
dependency is required.

## Installing a language pack

1. Add a directory such as `resources/lang/es` or `resources/lang/pt-BR`.
2. Copy `resources/lang/en/panel.php` into the directory, preserve its keys, and
   translate the values. Copy and translate other English PHP files if the pack
   also translates Laravel validation, activity messages, and backend notices.
3. Add `locale.json` with the language's display names:

   ```json
   {
     "name": "Spanish",
     "nativeName": "Español",
     "direction": "ltr"
   }
   ```

4. Deploy the directory, run `php artisan optimize:clear`, and reload the panel.
   The language appears in the account dropdown and administrator user forms
   automatically. No JavaScript rebuild is required to add or edit translations.

Use `"direction": "rtl"` for a pack requiring right-to-left text; test the layout
with that pack. Metadata is optional, so existing Pterodactyl language folders
also work. Laravel's `pt_BR` directory naming is supported alongside `pt-BR`;
choose one spelling for each installed locale. Translation files are executable
PHP, so administrators should install trusted packs.

For Docker deployments, include packs in the image source and rebuild the image,
or manage them in an explicit volume mounted at `/app/resources/lang`. Changes
copied into a running container are lost when that container is replaced.

## Translation keys and fallbacks

Core React translations use the `panel` namespace and the catalog in
`resources/lang/en/panel.php`. The initial catalog covers account settings and
sign-in screens, navigation, dashboard controls and server statuses, and the
main server page headings and descriptions. Some detailed server forms
and addon-specific text still have their own English strings; adding
a pack does not automatically translate text that has no translation key.
The bundled French and German packs include every key in the English catalogs,
including validation errors, authentication notices, activity messages, and
existing backend/admin translation strings.

The administration area uses Laravel translations in
`resources/lang/en/admin/ui.php` and `admin/custom.php`, with matching French and
German catalogs. The latter contains appearance, mail service and avatar moderation
controls.
It follows the same account preference and browser selection as the client area.
Navigation, settings, management forms, help text, validation labels, confirmation
dialogs, and dropdown messages are translated on the server. Names and descriptions
entered by users or supplied by eggs and addons retain their original text.
Copy and translate both `admin/ui.php` and `admin/custom.php` when creating a language pack that covers
administration; missing entries fall back to English.

Missing keys fall back to English. Core components also provide inline English
defaults so a failed translation request leaves readable controls. Existing
Blueprint addon namespaces and translation components remain available; addon
authors can supply their own locale files and use `useTranslation("my_addon")`.

In a core component, use the shared hook and a stable key:

```tsx
const { t } = usePanelTranslation();
return <h1>{t("navigation.servers", "Servers")}</h1>;
```

Keep whole sentences together and interpolate user values:

```php
'current' => 'Currently using :language.',
```

```tsx
t("language.current", "Currently using {{language}}.", { language: "English" });
```

The locale endpoint converts Laravel placeholders to i18next placeholders.
React escapes interpolated values; translators should use text, not raw HTML.
Language-pack file changes update the cache version provided to the browser on
page reload. Translation responses are cached per locale and namespace, rather
than per user's account preference.

When adding English keys, add corresponding French and German translations.
`tests/Unit/Services/Users/BundledLanguagePacksTest.php` checks catalog coverage,
UTF-8 text, interpolation placeholders, and existing markup for both packs.

Run `php artisan migrate --force` when deploying the preference feature: its
migration expands the user language column to support regional and script tags.

The underlying systems are documented in [Laravel localization](https://laravel.com/framework/docs/13.x/localization)
and [i18next fallbacks](https://www.i18next.com/principles/fallback).
