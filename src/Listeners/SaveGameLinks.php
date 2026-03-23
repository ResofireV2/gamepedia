<?php

namespace Resofire\Gamepedia\Listeners;

use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Flarum\Post\Event\Saving as PostSaving;
use Resofire\Gamepedia\Models\Game;

class SaveGameLinks
{
    /**
     * When a new discussion is saved, link any gamepediaGameIds from the request.
     */
    public function onDiscussionSaving(DiscussionSaving $event): void
    {
        $ids = $event->data['attributes']['gamepediaGameIds'] ?? null;
        if (!is_array($ids) || empty($ids)) return;

        // Only link on creation, not edits
        if ($event->discussion->exists) return;

        // We can't sync yet — discussion doesn't have an ID before save.
        // Store on the model for SaveGameLinksAfterCreate to pick up.
        $event->discussion->gamepediaGameIds = array_map('intval', $ids);
    }

    /**
     * When a new reply post is saved, link games to its discussion.
     */
    public function onPostSaving(PostSaving $event): void
    {
        $ids = $event->data['attributes']['gamepediaGameIds'] ?? null;
        if (!is_array($ids) || empty($ids)) return;

        $post = $event->post;
        if ($post->exists || $post->type !== 'comment') return;

        $post->gamepediaGameIds = array_map('intval', $ids);
    }
}
