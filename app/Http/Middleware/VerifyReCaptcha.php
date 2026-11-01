<?php

namespace Pterodactyl\Http\Middleware;

use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use GuzzleHttp\Exception\GuzzleException;
use Pterodactyl\Events\Auth\FailedCaptcha;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Events\Dispatcher;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VerifyReCaptcha
{
    /**
     * VerifyReCaptcha constructor.
     */
    public function __construct(private Dispatcher $dispatcher, private Repository $config, private ?Client $client = null)
    {
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, \Closure $next): mixed
    {
        if (!$this->config->get('recaptcha.enabled')) {
            return $next($request);
        }

        $responseToken = $request->input('g-recaptcha-response')
            ?? $request->input('h-captcha-response')
            ?? $request->input('cf-turnstile-response');

        $result = null;
        if (is_string($responseToken) && $responseToken !== '' && strlen($responseToken) <= 8192) {
            $provider = $this->config->get('recaptcha.provider', 'recaptcha');
            $endpoints = $this->config->get('recaptcha.endpoints', []);
            $endpoint = $endpoints[$provider] ?? $this->config->get('recaptcha.domain');

            $client = $this->client ?? new Client();
            try {
                $res = $client->post($endpoint, [
                    'connect_timeout' => 3, 'timeout' => 8, 'allow_redirects' => false, 'http_errors' => false,
                    'form_params' => [
                        'secret' => $this->config->get('recaptcha.secret_key'),
                        'response' => $responseToken,
                        'remoteip' => $request->ip(),
                    ],
                ]);
                if ($res->getStatusCode() === 200) {
                    $result = json_decode($res->getBody());
                }
            } catch (GuzzleException) {
                // Fail closed without logging provider request bodies containing the secret.
            }
            if ($result instanceof \stdClass && ($result->success ?? false) === true
                && (!$this->config->get('recaptcha.verify_domain') || $this->isResponseVerified($result, $request))) {
                return $next($request);
            }
        }

        $this->dispatcher->dispatch(
            new FailedCaptcha(
                $request->ip(),
                is_string($result->hostname ?? null) ? $result->hostname : null
            )
        );

        throw new HttpException(Response::HTTP_BAD_REQUEST, 'Failed to validate captcha data.');
    }

    /**
     * Determine if the response from the recaptcha servers was valid.
     */
    private function isResponseVerified(\stdClass $result, Request $request): bool
    {
        $url = parse_url($request->url());

        return ($result->hostname ?? null) === array_get($url, 'host');
    }
}
