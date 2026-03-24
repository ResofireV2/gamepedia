<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Genre;

class ListGenresController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $genres = Genre::withCount('games')
            ->orderBy('name')
            ->get()
            ->map(fn($g) => [
                'id'         => $g->id,
                'name'       => $g->name,
                'slug'       => $g->slug,
                'igdb_id'    => $g->igdb_id,
                'game_count' => $g->games_count,
            ]);

        return new JsonResponse(['data' => $genres]);
    }
}
