<?php

namespace Resofire\Gamepedia\Api\Controllers;

use Flarum\Discussion\Discussion;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;

/**
 * POST /api/gamepedia/discussions/{id}/games
 *
 * Links games to a discussion after it has been created.
 * Called by the JS composer after discussion creation succeeds,
 * avoiding the JSON:API attribute validation issue with gamepediaGameIds.
 *
 * Body: { game_ids: [1, 2, 3] }
 */
class LinkGamesToDiscussionController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);

        // Require gamepedia.linkGame permission
        if (!$actor->hasPermission('gamepedia.linkGame') && !$actor->isAdmin()) {
            return new JsonResponse(['error' => 'Permission denied.'], 403);
        }

        $discussionId = (int) ($request->getQueryParams()['id'] ?? 0);
        $discussion   = Discussion::find($discussionId);

        if (!$discussion) {
            return new JsonResponse(['error' => 'Discussion not found.'], 404);
        }

        $body    = $request->getParsedBody();
        $gameIds = array_map('intval', $body['game_ids'] ?? []);

        if (empty($gameIds)) {
            return new JsonResponse(['error' => null]);
        }

        $max      = (int) app('flarum.settings')->get('gamepedia.max_games_per_discussion', 3);
        $gameIds  = array_unique($gameIds);
        $gameIds  = array_slice($gameIds, 0, $max);
        $validIds = Game::whereIn('id', $gameIds)->pluck('id')->toArray();

        foreach ($validIds as $gameId) {
            $discussion->gamepediaGames()->syncWithoutDetaching([$gameId]);
        }

        return new JsonResponse(['error' => null]);
    }
}
