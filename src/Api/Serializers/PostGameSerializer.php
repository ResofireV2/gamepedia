<?php

namespace Resofire\Gamepedia\Api\Serializers;

use Flarum\Api\Schema;

/**
 * Fields for PostResource:
 *
 * Registers gamepediaGameIds as a writable no-op field on PostResource.
 *
 * This is required because DiscussionResource::saveModel() internally creates
 * the first post by calling PostResource::create via JsonApi::process(), which
 * merges the original HTTP request body into the internal PostResource request.
 * The original body contains gamepediaGameIds in data.attributes. Without this
 * registration, assertFieldsValid() throws a 400 on the unknown attribute.
 */
class PostGameSerializer
{
    public function __invoke(): array
    {
        return [
            Schema\Arr::make('gamepediaGameIds')
                ->writableOnCreate()
                ->set(fn () => null),
        ];
    }
}
