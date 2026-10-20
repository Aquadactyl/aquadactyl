<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

beforeEach(function () {
    $this->account = (new User())->forceFill(['id' => 123, 'password' => Hash::make('CorrectPassword123!')]);
    $this->confirmation = app(ConfirmAccountPassword::class);
    $this->confirm = function (string $password, ?User $user = null): User {
        $request = Request::create('/account/security', 'POST', ['current_password' => $password]);
        $request->setUserResolver(fn () => $user ?? $this->account);

        return $this->confirmation->handle($request);
    };
});

test('exhausted confirmation attempts block further password checks until cooldown expires', function () {
    for ($attempt = 0; $attempt < 10; ++$attempt) {
        expect(fn () => ($this->confirm)('wrong'))->toThrow(ValidationException::class);
    }
    expect(fn () => ($this->confirm)('CorrectPassword123!'))->toThrow(TooManyRequestsHttpException::class);
    $this->travel(61)->seconds();
    expect(($this->confirm)('CorrectPassword123!'))->toBe($this->account);
});

test('a successful confirmation resets previous failed attempts', function () {
    for ($round = 0; $round < 2; ++$round) {
        for ($attempt = 0; $attempt < 9; ++$attempt) {
            expect(fn () => ($this->confirm)('wrong'))->toThrow(ValidationException::class);
        }
        expect(($this->confirm)('CorrectPassword123!'))->toBe($this->account);
    }
});

test('one account exhausting its confirmation limit does not block a different account', function () {
    for ($attempt = 0; $attempt < 10; ++$attempt) {
        expect(fn () => ($this->confirm)('wrong'))->toThrow(ValidationException::class);
    }
    $other = (new User())->forceFill(['id' => 124, 'password' => $this->account->password]);
    expect(($this->confirm)('CorrectPassword123!', $other))->toBe($other);
});
