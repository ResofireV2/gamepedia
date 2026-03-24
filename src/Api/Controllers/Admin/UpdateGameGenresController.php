<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;

class UpdateGameGenresController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $id   = (int) ($request->getQueryParams()['id'] ?? 0);
        $game = Game::find($id);

        if (!$game) {
            return new JsonResponse(['error' => 'Game not found.'], 404);
        }

        $body     = $request->getParsedBody();
        $genreIds = array_map('intval', $body['genre_ids'] ?? []);

        $game->genres()->sync($genreIds);

        return new JsonResponse(['error' => null]);
    }
}
