# Contributing

Aquadactyl is an independent community fork of Pterodactyl Panel with Blueprint bundled.
Contributions to this panel are welcome, including features, fixes and documentation.
Operator documentation is hosted at [aquadactyl.uk/docs](https://aquadactyl.uk/docs)
and maintained in the [website repository](https://github.com/Aquadactyl/website).
Keep its command snippets and guides aligned with changes to the panel's deployment tools.
Changes to our server daemon belong in [Aquadactyl/Manta](https://github.com/Aquadactyl/manta).

## Responsible Disclosure

This is an in-depth project making use of many moving pieces. While we strive to keep everything as secure as possible
and welcome you to take a look at the code provided in this project yourself. We do ask that you be considerate of
others who are using the software and not publicly disclose security issues. Please see [`SECURITY.md`](/SECURITY.md)
for information on how to report security issues to the team.

## Contact Us

You can find us in a couple places online. First and foremost, we're active right here on GitHub. If you encounter a
bug or other problems, open an issue on here for us to take a look at it. Please make use of
our [Aquadactyl issue tracker](https://github.com/Aquadactyl/aquadactyl/issues)
for feature requests, general questions, or help with the software.

Keep upstream copyright and license notices intact. PHP namespaces, integration
keys and protocol identifiers remain compatible with Pterodactyl and Blueprint;
see [branding and licensing](docs/BRANDING.md) before changing them.

## Bugs, requests and pull requests

Use the [issue chooser](https://github.com/Aquadactyl/aquadactyl/issues/new/choose)
for bugs, feature requests or help after checking
[common issues](https://aquadactyl.uk/docs/common-issues). Feature requests are
welcome without prior approval. Discuss substantial changes in an issue first.

1. Fork this repository and create a focused branch from `main`.
2. Explain the problem, resulting behaviour and related issue in the PR template.
3. Add regression coverage for behaviour changes and update relevant documentation.
4. Run the applicable checks in [docs/TESTING.md](docs/TESTING.md). Use the runtimes
   in `composer.json` and `package.json`; preserve lockfiles and coverage gates.
5. Respond to review, resolve conversations and keep your branch current with `main`.

Merging into `main` requires at least one approval from a maintainer listed in
[CODEOWNERS](.github/CODEOWNERS), all required CI checks and resolved review
conversations. New changes invalidate previous approvals, and the latest push
must be approved by someone other than its pusher. These requirements also apply
to administrators; direct pushes, force pushes and branch deletion are blocked.

Workflows from external forks require maintainer approval before running. That
permission starts CI; it does not approve the code or bypass merge review. CI
uses GitHub-hosted runners and read-only default tokens. Never add secrets to a
PR or switch untrusted builds to `pull_request_target`.

Published `v*` release tags cannot be moved or deleted. New versions get new tags.
When changing a CI matrix or job name, coordinate the corresponding required
status-check names in the repository rules before merging.

## AI-assisted contributions

You remain responsible for every contribution, including work prepared with AI.
Understand and review the code, verify its behaviour, and write descriptions in
your own voice. Remove claims you cannot substantiate. AI-assisted changes follow
the same review, testing and documentation requirements as other contributions.
