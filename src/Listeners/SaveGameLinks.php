<?php

namespace Resofire\Gamepedia\Listeners;

use Flarum\Discussion\Event\Saving as DiscussionSaving;

/**
 * Flarum 2.x: Extend\Event->listen() requires a callable|string, not an array.
 * This class is now invokable — passed as SaveGameLinks::class to listen().
 * It handles DiscussionSaving and stores pending game IDs for after-create linking.
 */
class SaveGameLinks
{
    public static array $pendingDiscussionGames = [];

    public function handle(DiscussionSaving $event): void
    {
        $ids = $event->data['attributes']['gamepediaGameIds'] ?? null;
        if (!is_array($ids) || empty($ids)) return;

        // Only on creation, not edits
        if ($event->discussion->exists) return;

        // Check permission
        if (!$event->actor->hasPermission('gamepedia.linkGame')) return;

        self::$pendingDiscussionGames[spl_object_id($event->discussion)] = array_map('intval', $ids);
    }
}
