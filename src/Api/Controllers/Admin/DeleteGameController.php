<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;

class DeleteGameController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $id   = $request->getAttribute('id');
        $game = Game::find($id);

        if (!$game) {
            return new JsonResponse(['error' => 'Game not found.'], 404);
        }

        // Cascade delete handles screenshots and pivot tables
        // via the foreign key onDelete('cascade') in migrations
        $game->delete();

        return new JsonResponse(['error' => null]);
    }
}
