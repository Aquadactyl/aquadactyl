<?php

use Pterodactyl\Traits\Commands\EnvironmentWriterTrait;

class FooClass
{
    use EnvironmentWriterTrait;
}

test('variable is escaped properly', function (string $input, string $expected) {
    expect((new FooClass())->escapeEnvironmentValue($input))->toBe($expected);
})->with([
    ['foo', 'foo'],
    ['abc123', 'abc123'],
    ['val"ue', '"val\"ue"'],
    ['my test value', '"my test value"'],
    ['mysql_p@assword', '"mysql_p@assword"'],
    ['mysql_p#assword', '"mysql_p#assword"'],
    ['mysql p@$$word', '"mysql p@$$word"'],
    ['mysql p%word', '"mysql p%word"'],
    ['mysql p#word', '"mysql p#word"'],
    ['abc_@#test', '"abc_@#test"'],
    ['test 123 $$$', '"test 123 $$$"'],
    ['#password%', '"#password%"'],
    ['$pass ', '"$pass "'],
]);
