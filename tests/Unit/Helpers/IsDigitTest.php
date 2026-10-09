<?php

test('is_digit helper', function ($value, $response) {
    expect(is_digit($value))->toBe($response);
})->with([
    [true, false],
    [false, false],
    [12.3, false],
    ['12.3', false],
    ['string', false],
    [-1, false],
    ['-1', false],
    [1, true],
    [0, true],
    [12345, true],
    ['12345', true],
    ['true', false],
    ['false', false],
    ['123_test', false],
    ['123.test', false],
    ['123test', false],
    ['test123', false],
    ['0x00000003', false],
    [00000011, true],
    ['00000011', true],
    ['AD9C', false],
]);
