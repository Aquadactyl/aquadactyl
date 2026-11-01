<?php

use Illuminate\Support\Js;
use Illuminate\Support\Str;
use Illuminate\Contracts\Support\Jsonable;
use Laracasts\Utilities\JavaScript\ViewBinder;
use Pterodactyl\Extensions\JavaScript\SafeJavascriptTransformer;

test('legacy JavaScript injection serializes strings and property names instead of executing them', function () {
    $binder = Mockery::mock(ViewBinder::class);
    $binder->shouldReceive('bind')->once()->with(Mockery::on(fn ($script) => !str_contains($script, '</script>')));
    $transformer = new SafeJavascriptTransformer($binder, 'Pterodactyl');
    $payload = "';window.untrusted=true;//</script><script>untrusted()</script>";
    $script = $transformer->put([$payload => Str::of($payload), '__proto__' => ['is_admin' => true], 'ordinary' => collect(['name' => $payload])]);
    expect($script)->toContain('Object.defineProperty(Pterodactyl, ', Js::encode($payload), 'JSON.parse(')
        ->not->toContain($payload, '<script>', '</script>');
});

test('legacy JSON objects are decoded and safely reencoded even when addons ignore encoder flags', function () {
    $payload = '</script><img src=x onerror=untrusted()>';
    $value = new class($payload) implements Jsonable {
        public function __construct(private string $payload)
        {
        }

        public function toJson($options = 0)
        {
            return json_encode(['name' => $this->payload, 'empty' => (object) [], 'indexed' => (object) [0 => 'zero', 1 => 'one']], JSON_UNESCAPED_SLASHES);
        }
    };
    $transformer = new SafeJavascriptTransformer(Mockery::mock(ViewBinder::class), 'window');
    expect($transformer->constructJavaScript(['json' => $value, 'plain' => (object) ['name' => $payload]]))
        ->toContain('Object.defineProperty(window, "json"', 'JSON.parse(', '\\u0022empty\\u0022:{}', '\\u0022indexed\\u0022:{')
        ->not->toContain('</script>', '<img');
});

test('legacy toJson compatibility preserves data and malformed JSON fails closed', function () {
    $value = new class {
        public function toJson()
        {
            return '{"name":"</script>"}';
        }
    };
    $invalid = new class {
        public function toJson()
        {
            return 'window.untrusted=true';
        }
    };
    $transformer = new SafeJavascriptTransformer(Mockery::mock(ViewBinder::class), 'window');
    expect($transformer->constructJavaScript(['data' => $value]))->not->toContain('</script>');
    expect(fn () => $transformer->constructJavaScript(['data' => $invalid]))->toThrow(JsonException::class);
});

test('stringable addon objects are encoded as strings without executing their contents', function () {
    $value = new class implements Stringable {
        public function __toString(): string
        {
            return "';window.untrusted=true;//";
        }
    };
    $transformer = new SafeJavascriptTransformer(Mockery::mock(ViewBinder::class), 'window');
    expect($transformer->constructJavaScript(['value' => $value]))->toContain('\\u0027')->not->toContain("value: '';window.untrusted");
});

test('the application binds the safe transformer for controllers and Blueprint extensions', function () {
    expect(app('JavaScript'))->toBeInstanceOf(SafeJavascriptTransformer::class);
});
