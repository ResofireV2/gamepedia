<?php

namespace Resofire\Gamepedia\Api\Serializers;

use Flarum\Api\Context;
use Flarum\Api\Schema;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Flarum 2.x: Invokable fields class for Extend\ApiResource(ForumResource::class)->fields().
 * Replaces the 1.x Extend\ApiSerializer(ForumSerializer::class)->attributes() pattern.
 *
 * Returns an array of Schema fields that are appended to the /api forum endpoint.
 * Actor-aware fields receive ($model, Context $context) in their ->get() closures.
 */
class ForumGamepediaAttributes
{
    public function __construct(
        protected SettingsRepositoryInterface $settings
    ) {}

    public function __invoke(): array
    {
        return [
            Schema\Boolean::make('gamepedia.canView')
                ->get(fn (object $model, Context $context) =>
                    $context->getActor()->hasPermission('gamepedia.view')
                ),

            Schema\Boolean::make('gamepedia.canLinkGame')
                ->get(fn (object $model, Context $context) =>
                    $context->getActor()->hasPermission('gamepedia.linkGame')
                ),

            Schema\Integer::make('gamepedia.maxGamesPerDiscussion')
                ->get(fn () => (int) $this->settings->get('gamepedia.max_games_per_discussion', 3)),

            Schema\Str::make('gamepedia.subtitle')
                ->get(fn () => (string) $this->settings->get('gamepedia.subtitle', 'Browse the game library')),

            Schema\Integer::make('gamepedia.slideshow_interval')
                ->get(fn () => (int) $this->settings->get('gamepedia.slideshow_interval', 4)),
        ];
    }
}
