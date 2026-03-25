<?php

namespace Resofire\Gamepedia\Api\Serializers;

use Flarum\Api\Context;
use Flarum\Api\Schema;

/**
 * Flarum 2.x: Invokable fields class for Extend\ApiResource(ForumResource::class)->fields().
 *
 * Only actor-aware permission fields go here — plain settings are handled via
 * Extend\Settings()->serializeToForum() in extend.php, which is the correct 2.x pattern.
 *
 * Field names must be camelCase with no dots — dots are not valid in JSON:API field names.
 * The JS reads these as app.forum.attribute('gamepediaCanView') etc.
 */
class ForumGamepediaAttributes
{
    public function __invoke(): array
    {
        return [
            Schema\Boolean::make('gamepediaCanView')
                ->get(fn (object $model, Context $context) =>
                    $context->getActor()->hasPermission('gamepedia.view')
                ),

            Schema\Boolean::make('gamepediaCanLinkGame')
                ->get(fn (object $model, Context $context) =>
                    $context->getActor()->hasPermission('gamepedia.linkGame')
                ),
        ];
    }
}
