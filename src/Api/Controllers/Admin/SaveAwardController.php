<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Award;
use Resofire\Gamepedia\Models\Game;

class SaveAwardController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $gameId = (int) ($request->getQueryParams()['game_id'] ?? 0);
        $game   = Game::find($gameId);

        if (!$game) {
            return new JsonResponse(['error' => 'Game not found.'], 404);
        }

        $body  = $request->getParsedBody();
        $year  = trim($body['year']  ?? '');
        $title = trim($body['title'] ?? '');

        if (!$year || !$title) {
            return new JsonResponse(['error' => 'Year and title are required.'], 422);
        }

        if (!preg_match('/^\d{4}$/', $year)) {
            return new JsonResponse(['error' => 'Year must be a 4-digit number.'], 422);
        }

        $award = Award::create([
            'game_id' => $gameId,
            'year'    => $year,
            'title'   => $title,
        ]);

        return new JsonResponse([
            'data' => [
                'id'    => $award->id,
                'year'  => $award->year,
                'title' => $award->title,
            ],
            'error' => null,
        ]);
    }
}
