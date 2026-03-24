<?php

namespace Resofire\Gamepedia\Api\Serializers;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

class ForumGamepediaAttributes
{
    protected SettingsRepositoryInterface $settings;

    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
    }

    public function __invoke(ForumSerializer $serializer): array
    {
        $actor = $serializer->getActor();

        return [
            'gamepedia.canView'               => $actor->hasPermission('gamepedia.view'),
            'gamepedia.canLinkGame'           => $actor->hasPermission('gamepedia.linkGame'),
            'gamepedia.maxGamesPerDiscussion' => (int) $this->settings->get('gamepedia.max_games_per_discussion', 3),
            'gamepedia.subtitle'              => $this->settings->get('gamepedia.subtitle', 'Browse the game library'),
            'gamepedia.slideshow_interval'    => (int) $this->settings->get('gamepedia.slideshow_interval', 4),
        ];
    }
}
