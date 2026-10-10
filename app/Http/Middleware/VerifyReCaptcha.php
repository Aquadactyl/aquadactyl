<?php

namespace Pterodactyl\Http\Middleware;

use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Pterodactyl\Events\Auth\FailedCaptcha;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Events\Dispatcher;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VerifyReCaptcha
{
    /**
     * VerifyReCaptcha constructor.
     */
    public function __construct(private Dispatcher $dispatcher, private Repository $config)
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

        if (!empty($responseToken)) {
            $provider = $this->config->get('recaptcha.provider', 'recaptcha');
            $endpoints = $this->config->get('recaptcha.endpoints', []);
            $endpoint = $endpoints[$provider] ?? $this->config->get('recaptcha.domain');

            $client = new Client();
            $res = $client->post($endpoint, [
                'form_params' => [
                    'secret' => $this->config->get('recaptcha.secret_key'),
                    'response' => $responseToken,
                    'remoteip' => $request->ip(),
                ],
            ]);

            if ($res->getStatusCode() === 200) {
                $result = json_decode($res->getBody());

                if (!empty($result?->success) && (!$this->config->get('recaptcha.verify_domain') || $this->isResponseVerified($result, $request))) {
                    return $next($request);
                }
            }
        }

        $this->dispatcher->dispatch(
            new FailedCaptcha(
                $request->ip(),
                !empty($result) ? ($result->hostname ?? null) : null
            )
        );

        throw new HttpException(Response::HTTP_BAD_REQUEST, 'Failed to validate captcha data.');
    }

    /**
     * Determine if the response from the recaptcha servers was valid.
     */
    private function isResponseVerified(\stdClass $result, Request $request): bool
    {
        if (!$this->config->get('recaptcha.verify_domain')) {
            return false;
        }

        $url = parse_url($request->url());

        return $result->hostname === array_get($url, 'host');
    }
}
