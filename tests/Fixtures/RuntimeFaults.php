<?php

namespace Pterodactyl\Tests\Fixtures {
    final class RuntimeFaults
    {
        /** Faults are enabled only by the test that owns them and reset in afterEach. */
        public static array $enabled = [];
    }
}

namespace Pterodactyl\Services\Accounts\OAuth {
    function hrtime(bool $asNumber = false): array|int|float|false
    {
        return \Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['oidc.time'] ?? \hrtime($asNumber);
    }
}

namespace Pterodactyl\Services\Users {
    function random_int(int $minimum, int $maximum): int
    {
        if (isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['users.entropy'])) {
            throw new \RuntimeException('Entropy source unavailable');
        }

        return \random_int($minimum, $maximum);
    }
}

namespace Pterodactyl\Helpers {
    function random_int(int $minimum, int $maximum): int
    {
        if (isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['utilities.entropy'])) {
            throw new \RuntimeException('Entropy source unavailable');
        }

        return \random_int($minimum, $maximum);
    }
}

namespace Pterodactyl\Console\Commands\Maintenance {
    function fopen(string $path, string $mode)
    {
        if (isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['backup.open'])) {
            return false;
        }

        return \fopen($path, $mode);
    }

    function fwrite($handle, string $buffer): int|false
    {
        if (isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['backup.before_write'])) {
            $beforeWrite = \Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['backup.before_write'];
            unset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['backup.before_write']);
            $beforeWrite();
        }
        if (isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['backup.write'])) {
            return max(0, strlen($buffer) - 1);
        }

        return \fwrite($handle, $buffer);
    }
}

namespace Pterodactyl\Services\Debug {
    function preg_replace(string|array $pattern, string|array $replacement, string|array $subject, int $limit = -1, ?int &$count = null): string|array|null
    {
        if (isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['console.regex_fail_on'])) {
            $attempt = ++\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['console.regex_calls'];
            if ($attempt === \Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['console.regex_fail_on']) {
                return null;
            }
        }

        return \preg_replace($pattern, $replacement, $subject, $limit, $count);
    }

    function preg_replace_callback(string|array $pattern, callable $callback, string|array $subject, int $limit = -1, ?int &$count = null): string|array|null
    {
        if (isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['console.regex_fail_on'])) {
            $attempt = ++\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['console.regex_calls'];
            if ($attempt === \Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['console.regex_fail_on']) {
                return null;
            }
        }

        return \preg_replace_callback($pattern, $callback, $subject, $limit, $count);
    }
    function fopen(string $path, string $mode)
    {
        return isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['debug.open']) ? false : \fopen($path, $mode);
    }

    function stream_get_contents($handle): string|false
    {
        return isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['debug.read']) ? false : \stream_get_contents($handle);
    }
}

namespace Pterodactyl\Services\Helpers {
    function fopen(string $path, string $mode)
    {
        return isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['logs.open']) ? false : \fopen($path, $mode);
    }

    function stream_get_contents($handle): string|false
    {
        return isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['logs.read']) ? false : \stream_get_contents($handle);
    }
}

namespace Pterodactyl\Services\Allocations {
    function gethostbyname(string $host): string
    {
        return \Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['allocations.ipv4'][$host] ?? \gethostbyname($host);
    }

    function dns_get_record(string $host, int $type): array|false
    {
        if (array_key_exists($host, \Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['allocations.ipv6'] ?? [])) {
            return \Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['allocations.ipv6'][$host];
        }

        return \dns_get_record($host, $type);
    }
}

namespace Pterodactyl\Http\Controllers\Admin {
    function tmpfile()
    {
        return isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['eggs.open']) ? false : \tmpfile();
    }

    function fwrite($handle, string $buffer): int|false
    {
        return isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['eggs.write']) ? 0 : \fwrite($handle, $buffer);
    }
}

namespace Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary {
    function is_readable(string $path): bool
    {
        return isset(\Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['blueprint.unreadable'][$path]) ? false : \is_readable($path);
    }
}
