<?php

namespace Resofire\Gamepedia\Api\Serializers;

use Flarum\Api\Schema;
use Flarum\Discussion\Discussion;

/**
 * Flarum 2.x: Invokable fields class for Extend\ApiResource(DiscussionResource::class)->fields().
 * Replaces the 1.x Extend\ApiSerializer(DiscussionSerializer::class)->attributes() pattern.
 *
 * Adds the gamepediaGames array attribute to every discussion serialized by the API.
 * The JS reads discussion.attribute('gamepediaGames') to render game cards and badges.
 */
class DiscussionGameSerializer
{
    public function __invoke(): array
    {
        return [
            Schema\Arr::make('gamepediaGames')
                ->get(function (Discussion $discussion) {
                    return $discussion->gamepediaGames()
                        ->select([
                            'gamepedia_games.id',
                            'gamepedia_games.name',
                            'gamepedia_games.slug',
                            'gamepedia_games.cover_image_url',
                            'gamepedia_games.first_release_date',
                        ])
                        ->get()
                        ->map(fn ($game) => [
                            'id'              => $game->id,
                            'name'            => $game->name,
                            'slug'            => $game->slug,
                            'cover_image_url' => $game->cover_image_url,
                            'release_year'    => $game->first_release_date
                                ? (int) date('Y', $game->first_release_date)
                                : null,
                        ])
                        ->values()
                        ->toArray();
                }),
        ];
    }
}
