<?php

namespace Resofire\Gamepedia\Api\Serializers;

use Flarum\Api\Serializer\DiscussionSerializer;
use Flarum\Discussion\Discussion;

class DiscussionGameSerializer
{
    /**
     * Add gamepediaGames attribute to every Discussion serialized by the API.
     * Returns a lightweight array of game data — just enough for the badges.
     */
    public function __invoke(DiscussionSerializer $serializer, Discussion $discussion, array $attributes): array
    {
        $attributes['gamepediaGames'] = $discussion->gamepediaGames()
            ->select(['gamepedia_games.id', 'gamepedia_games.name', 'gamepedia_games.slug', 'gamepedia_games.cover_image_url'])
            ->get()
            ->map(fn($game) => [
                'id'              => $game->id,
                'name'            => $game->name,
                'slug'            => $game->slug,
                'cover_image_url' => $game->cover_image_url,
            ])->values()->toArray();

        return $attributes;
    }
}
