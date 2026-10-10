<?php

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(Pterodactyl\Tests\TestCase::class)->in('Unit');
pest()->extend(Pterodactyl\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase::class)->in('Integration/Api/Application');
pest()->extend(Pterodactyl\Tests\Integration\Api\Client\ClientApiIntegrationTestCase::class)->in('Integration/Api/Client');
pest()->extend(Pterodactyl\Tests\Integration\IntegrationTestCase::class)->in(
    'Integration/Blueprint',
    'Integration/Http',
    'Integration/Jobs',
    'Integration/Providers',
    'Integration/Services',
    'Integration/Api/Remote'
);

uses(
    Pterodactyl\Tests\Traits\Http\MocksMiddlewareClosure::class,
    Pterodactyl\Tests\Traits\Http\RequestMockHelpers::class
)->beforeEach(function () {
    if (method_exists($this, 'buildRequestMock')) {
        $this->buildRequestMock();
    }
})->in('Unit/Http/Middleware');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you with this.
|
*/
