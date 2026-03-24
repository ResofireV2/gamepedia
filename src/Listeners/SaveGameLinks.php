<?php

namespace Resofire\Gamepedia\Listeners;

use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Flarum\Post\Event\Saving as PostSaving;
use Resofire\Gamepedia\Models\Game;

class SaveGameLinks
{
    /**
     * When a new discussion is being saved, stash the game IDs in a static
     * registry keyed by object hash. We cannot set them on the model itself
     * because Eloquent will try to INSERT any public property that looks like
     * an attribute, which causes a "Column not found" error.
     */
    public static array $pendingDiscussionGames = [];
    public static array $pendingPostGames       = [];

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

    public function onPostSaving(PostSaving $event): void
    {
        $ids = $event->data['attributes']['gamepediaGameIds'] ?? null;
        if (!is_array($ids) || empty($ids)) return;

        $post = $event->post;
        if ($post->exists || $post->type !== 'comment') return;

        // Check permission
        if (!$event->actor->hasPermission('gamepedia.linkGame')) return;

        self::$pendingPostGames[spl_object_id($post)] = array_map('intval', $ids);
    }
}
