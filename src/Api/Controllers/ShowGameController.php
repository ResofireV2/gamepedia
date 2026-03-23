<?php

namespace Resofire\Gamepedia\Api\Controllers;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;

class ShowGameController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);

        if (!$actor->hasPermission('gamepedia.view') && !$actor->isAdmin()) {
            return new JsonResponse(['error' => 'Permission denied.'], 403);
        }

        $slug = $request->getAttribute('slug');
        $game = Game::with(['genres', 'screenshots'])
                    ->where('slug', $slug)
                    ->first();

        if (!$game) {
            return new JsonResponse(['error' => 'Game not found.'], 404);
        }

        // Load last 10 linked discussions ordered by most recent activity.
        // We only return fields safe to expose publicly.
        $discussions = $game->discussions()
            ->whereNull('hidden_at')
            ->orderBy('last_posted_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($discussion) {
                return [
                    'id'             => $discussion->id,
                    'title'          => $discussion->title,
                    'comment_count'  => $discussion->comment_count,
                    'last_posted_at' => $discussion->last_posted_at
                        ? $discussion->last_posted_at->toISOString()
                        : null,
                    'slug'           => $discussion->slug,
                ];
            });

        return new JsonResponse([
            'data' => [
                'id'                   => $game->id,
                'igdb_id'              => $game->igdb_id,
                'name'                 => $game->name,
                'slug'                 => $game->slug,
                'summary'              => $game->summary,
                'cover_image_url'      => $game->cover_image_url,
                'trailer_youtube_id'   => $game->trailer_youtube_id,
                'developer'            => $game->developer,
                'publisher'            => $game->publisher,
                'release_date'         => $game->formatted_release_date,
                'release_year'         => $game->release_year,
                'genres'               => $game->genres->map(fn($g) => [
                    'id'   => $g->id,
                    'name' => $g->name,
                    'slug' => $g->slug,
                ]),
                'screenshots'          => $game->screenshots->map(fn($s) => [
                    'id'            => $s->id,
                    'igdb_image_id' => $s->igdb_image_id,
                    'url'           => $s->url,
                    'order'         => $s->order,
                ]),
                'related_discussions'  => $discussions,
            ],
            'error' => null,
        ]);
    }
}
