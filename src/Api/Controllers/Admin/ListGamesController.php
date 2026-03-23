<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;

class ListGamesController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $games = Game::orderBy('name')->get()->map(function (Game $game) {
            return [
                'id'              => $game->id,
                'igdb_id'         => $game->igdb_id,
                'name'            => $game->name,
                'slug'            => $game->slug,
                'cover_image_url' => $game->cover_image_url,
                'developer'       => $game->developer,
                'release_year'    => $game->release_year,
            ];
        });

        return new JsonResponse([
            'data'  => $games,
            'error' => null,
        ]);
    }
}
