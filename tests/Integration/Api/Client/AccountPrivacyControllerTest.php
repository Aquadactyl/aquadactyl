<?php

namespace Pterodactyl\Tests\Integration\Api\Client;

use Pterodactyl\Models\User;

class AccountPrivacyControllerTest extends ClientApiIntegrationTestCase
{
    public function testBlurIsDisabledByDefaultAndCanBeEnabledAndDisabled(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.blur_sensitive_data', false);
        $this->putJson('/api/client/account/privacy', ['blur_sensitive_data' => true])
            ->assertOk()->assertJsonPath('attributes.blur_sensitive_data', true);
        $this->assertTrue($user->refresh()->blur_sensitive_data);
        $this->assertActivityFor('user:account.privacy-updated', $user, $user);
        $this->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.blur_sensitive_data', true);
        $this->putJson('/api/client/account/privacy', ['blur_sensitive_data' => false])
            ->assertOk()->assertJsonPath('attributes.blur_sensitive_data', false);
        $this->assertFalse($user->refresh()->blur_sensitive_data);
    }

    public function testTheUpdateOnlyChangesTheAuthenticatedUsersPrivacyPreference(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $originalPassword = $user->password;
        $originalEmail = $user->email;
        $this->actingAs($user)->putJson('/api/client/account/privacy', [
            'blur_sensitive_data' => true,
            'user_id' => $other->id,
            'email' => 'other@example.com',
            'password' => 'overridden-password',
            'root_admin' => true,
        ])->assertOk();
        $this->assertTrue($user->refresh()->blur_sensitive_data);
        $this->assertFalse($other->refresh()->blur_sensitive_data);
        $this->assertFalse($user->root_admin);
        $this->assertSame($originalPassword, $user->password);
        $this->assertSame($originalEmail, $user->email);
    }

    public function testInvalidPreferencesAreRejectedWithoutChangingTheSavedValue(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        foreach ([[], ['blur_sensitive_data' => 'yes'], ['blur_sensitive_data' => null], ['blur_sensitive_data' => []]] as $payload) {
            $this->putJson('/api/client/account/privacy', $payload)->assertUnprocessable();
            $this->assertFalse($user->refresh()->blur_sensitive_data);
        }
    }

    public function testUnauthenticatedUsersCannotChangePreferences(): void
    {
        $this->putJson('/api/client/account/privacy', ['blur_sensitive_data' => true])->assertUnauthorized();
    }

    public function testBothLayoutsApplyTheViewersPreferenceBeforeRendering(): void
    {
        $admin = User::factory()->create(['root_admin' => true]);
        $admin->forceFill(['blur_sensitive_data' => true])->save();
        $other = User::factory()->create();
        $this->actingAs($admin)->get('/account')->assertOk()->assertSee('<html class="privacy-mode">', false);
        $this->get('/admin/users')->assertOk()->assertSee('<html class="privacy-mode">', false);
        $this->actingAs($other)->get('/account')->assertOk()->assertSee('<html class="">', false);
    }
}
