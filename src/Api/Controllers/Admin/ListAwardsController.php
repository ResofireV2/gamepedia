<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Award;

class ListAwardsController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $gameId = (int) ($request->getQueryParams()['game_id'] ?? 0);

        $awards = Award::where('game_id', $gameId)
            ->orderBy('year', 'desc')
            ->get()
            ->map(fn($a) => [
                'id'    => $a->id,
                'year'  => $a->year,
                'title' => $a->title,
            ]);

        return new JsonResponse(['data' => $awards]);
    }
}
