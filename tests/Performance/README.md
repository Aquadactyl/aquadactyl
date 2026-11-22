# Locale-selection component measurement

This standalone CLI benchmark compares the current language service with trusted
baseline source. Run it only inside an isolated test environment configured like
`compose.tests.yaml`, with the repository's development dependencies installed.
It boots Laravel but excludes application boot and request construction from
timing. It is not part of the coverage suite or an HTTP benchmark.

From the panel checkout, prepare the baseline from the recorded revision:

```bash
git show 1399df4b4903f08ad6f8a7059bfee431a63adb29:app/Services/Users/LanguageService.php \
  | sed 's/class LanguageService/class BaselineLanguageService/' \
  > /tmp/BaselineLanguageService.php
```

Make that file available inside the isolated PHP test container, then run there:

```bash
APP_ENV=testing php -d opcache.enable_cli=1 -d pcov.enabled=0 \
  tests/Performance/locale-selection.php /tmp/BaselineLanguageService.php
```

The argument is executed as PHP: accept only source you have reviewed. Do not
point this command at downloaded addons or run it with a production environment.

The benchmark checks catalogue and selection parity, discards a warm-up, then
alternates five 5,000-operation batches for each variant. Each operation creates
a fresh service. Real bundled English, French and German directories and metadata
are used with warm filesystem/opcode caches. The request and Filesystem object
are reused; no competing test/build jobs ran during the recorded measurement.
Unrelated workstation services remained running. The container used PHP 8.5.13
on Linux/WSL2 with two CPUs and 2 GiB of memory.

Medians on 22 November 2026, against `1399df4b4903f08ad6f8a7059bfee431a63adb29`:

| Selection | Before | After | Time reduction |
| --- | ---: | ---: | ---: |
| Explicit English preference | 43.95 microseconds | 15.13 microseconds | 65.6% |
| Automatic, French browser preference | 44.67 microseconds | 25.85 microseconds | 42.1% |

These are small pieces of request processing, not equivalent improvements to
page loading or API throughput. Both variants still enumerate language
directories. Regression tests separately verify that selection performs no
metadata existence/read calls, and that requesting the catalogue later still
returns the same labels and direction. Requests which also need that catalogue
still pay its metadata cost.

All samples, the baseline revision and implementation patch hash are retained in
[locale-selection-20261122.json](results/locale-selection-20261122.json).
