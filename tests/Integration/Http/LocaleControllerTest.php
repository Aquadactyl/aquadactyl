<?php

namespace Pterodactyl\Tests\Integration\Http;

use Pterodactyl\Tests\Integration\IntegrationTestCase;

class LocaleControllerTest extends IntegrationTestCase
{
    public function testSingleNamespaceActivityDescriptionsStillLoad(): void
    {
        $this->getJson('/locales/locale.json?locale=en&namespace=activity')
            ->assertOk()->assertJsonPath('en.activity.auth.success', 'Logged in')
            ->assertJsonPath('en.activity.server.file.read', 'Viewed the contents of {{file}}');
    }

    public function testMultiloadRequestsAcceptBothQueryStringAndEncodedPlusSeparators(): void
    {
        foreach (['+', '%2B'] as $separator) {
            $this->getJson('/locales/locale.json?locale=en' . $separator . 'fr&namespace=translation' . $separator . 'activity')
                ->assertOk()->assertJsonStructure(['en' => ['translation', 'activity'], 'fr' => ['translation', 'activity']])
                ->assertJsonPath('en.activity.auth.success', 'Logged in');
        }
    }

    public function testMultiloadValidationRejectsPathsAndUnboundedGroups(): void
    {
        foreach (['locale=en&namespace=..%2Factivity', 'locale=en&namespace=activity%2B..%2Fconfig', 'locale=..%2Fen&namespace=activity', 'locale=en&namespace=' . implode('%2B', array_fill(0, 11, 'activity'))] as $query) {
            $this->getJson('/locales/locale.json?' . $query)->assertUnprocessable();
        }
    }
}
