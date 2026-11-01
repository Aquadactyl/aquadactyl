# Appearance and mail settings

Set `APP_ENVIRONMENT_ONLY=false` to manage these settings in the admin interface.
Changes apply after reloading the panel. Background images live on the public
storage disk, so keep the `storage` directory persistent when updating Docker.

## Appearance

Open **Admin → Settings → Appearance**:

- Choose a primary colour. Buttons, links and focus highlights in the admin and
  client interfaces use its generated palette; primary button text uses black or
  white for contrast. Blueprint addons that use the panel colour variables inherit
  the palette. Addons with their own hardcoded colours need their own styling.
- Choose **Centre screen**, **Left half** or **Right half** for the login form.
  The diagrams and interactive preview show the selected arrangement.
- Put the logo above the form, inside it, or on the opposite half. Opposite-half
  logos appear above the form on centre layouts and small screens. Upload the logo
  from **General** settings. These options also apply to password reset and 2FA.
- Upload separate login and client backgrounds. Each supports PNG, JPEG and WebP,
  up to 8 MB and 4096 × 4096 pixels. The server re-encodes uploads as PNG, removes
  metadata and scales them within 2560 × 1440 pixels. SVG and GIF images are
  not accepted. Replacements and removals clean up the old managed file.
- Adjust blur (0–30 px) and dimming (0–95%) independently for each background.
  Text and controls remain sharp. The preview updates before saving; selecting a
  local file previews it before uploading. Images and effect settings save separately.

Removing a background restores the charcoal page background. It retains the saved
blur/dimming values for a future upload. No asset rebuild is required to change
appearance settings after this feature has been deployed.

## Mail services

Open **Admin → Settings → Mail** and choose SMTP, Mailgun, Postmark or Amazon SES.
The API transports use the panel's installed Laravel/Symfony/AWS libraries.
See the [Laravel mail documentation](https://laravel.com/framework/docs/13.x/mail).

| Service    | Required configuration                                                                   |
| ---------- | ---------------------------------------------------------------------------------------- |
| SMTP       | Host, port, encryption, sender; username/password if your server requires authentication |
| Mailgun    | Sending domain, API key, US/EU region, verified sender                                   |
| Postmark   | Server token, message stream (usually `outbound`), verified sender                       |
| Amazon SES | Access key ID, secret access key, AWS region, verified sender                            |

SendGrid, Brevo and other SMTP services can use the SMTP option with the credentials
provided by that service. **Log only** is for development and does not deliver mail.
Amazon SES sandbox accounts may also require a verified recipient.

Blank credential fields keep the saved credential. API keys, AWS access credentials
and SMTP passwords are encrypted with `APP_KEY`; they never appear in the rendered
form or validation session data. Keep the existing application key when updating.
Mailgun endpoints are restricted to its US/EU hosts. Test failures return a generic
message so provider exceptions cannot expose credentials.

**Save** stores settings and restarts the queue worker. **Test** saves the selected
settings first, then sends a test message to the administrator's account email.
Saved mail settings override initial environment defaults in database settings mode.
Environment-only deployments still use their environment configuration.

## Profile picture moderation

Open **Admin → Users → View user**. The **Profile picture** card shows an uploaded
image and a **Remove profile picture** button. Removing it restores the default
avatar, deletes the stored upload and records an admin activity event. It is available
even when user uploads are disabled; only administrators can perform this action.
