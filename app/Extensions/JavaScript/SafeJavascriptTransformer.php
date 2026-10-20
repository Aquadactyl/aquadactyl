<?php

namespace Pterodactyl\Extensions\JavaScript;

use Illuminate\Support\Js;
use Illuminate\Contracts\Support\Jsonable;
use Laracasts\Utilities\JavaScript\Transformers\Transformer;

/** Keep the legacy JavaScript::put API while treating every value and key as data. */
class SafeJavascriptTransformer extends Transformer
{
    /** @phpstan-param mixed $value */
    protected function initializeVariable($key, $value): string
    {
        // Defining a property also avoids invoking the __proto__ setter.
        return 'Object.defineProperty(' . $this->namespace . ', ' . Js::encode((string) $key)
            . ', {value: ' . $this->convertToJavaScript($value) . ', writable: true, enumerable: true, configurable: true});';
    }

    /** @phpstan-param mixed $value */
    protected function convertToJavaScript($value): string
    {
        if (is_object($value) && ($value instanceof Jsonable || method_exists($value, 'toJson'))) {
            // Addons may implement toJson without respecting encoder flags.
            $value = json_decode($value->toJson(), false, 512, JSON_THROW_ON_ERROR);
        } elseif ($value instanceof \Stringable && !$value instanceof \JsonSerializable) {
            $value = (string) $value;
        }

        return (string) Js::from($value);
    }
}
