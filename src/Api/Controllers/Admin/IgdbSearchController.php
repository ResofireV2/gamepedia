<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Services\IgdbService;

class IgdbSearchController implements RequestHandlerInterface
{
    protected IgdbService $igdb;

    public function __construct(IgdbService $igdb)
    {
        $this->igdb = $igdb;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // Admin only
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $query = trim($request->getQueryParams()['q'] ?? '');

        if (empty($query)) {
            return new JsonResponse([
                'data' => [],
                'error' => null,
            ]);
        }

        try {
            $results = $this->igdb->searchGames($query);

            return new JsonResponse([
                'data'  => $results,
                'error' => null,
            ]);
        } catch (\RuntimeException $e) {
            return new JsonResponse([
                'data'  => [],
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
