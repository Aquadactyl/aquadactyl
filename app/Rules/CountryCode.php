<?php

namespace Pterodactyl\Rules;

use Pterodactyl\Support\Countries;
use Illuminate\Contracts\Validation\ValidationRule;

class CountryCode implements ValidationRule
{
    public function validate(string $attribute, mixed $value, \Closure $fail): void
    {
        if (!is_string($value) || !Countries::name($value)) {
            $fail('Select a valid country.');
        }
    }
}
