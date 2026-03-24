<?php

namespace Resofire\Gamepedia\Listeners;

use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Resofire\Gamepedia\Models\Game;

class SaveGameLinks
{
    public static array $pendingDiscussionGames = [];

    public function onDiscussionSaving(DiscussionSaving $event): void
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
