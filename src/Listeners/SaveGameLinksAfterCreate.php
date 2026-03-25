<?php

namespace Resofire\Gamepedia\Listeners;

use Flarum\Discussion\Event\Started as DiscussionStarted;
use Resofire\Gamepedia\Models\Game;

/**
 * Flarum 2.x: Invokable listener with handle() method.
 * Passed as SaveGameLinksAfterCreate::class to Extend\Event->listen().
 */
class SaveGameLinksAfterCreate
{
    public function handle(DiscussionStarted $event): void
    {
        $discussion = $event->discussion;
        $key  = spl_object_id($discussion);
        $ids  = SaveGameLinks::$pendingDiscussionGames[$key] ?? null;

        if (!$ids) return;

        unset(SaveGameLinks::$pendingDiscussionGames[$key]);

        $max      = (int) app('flarum.settings')->get('gamepedia.max_games_per_discussion', 3);
        $ids      = array_unique($ids);
        $ids      = array_slice($ids, 0, $max);
        $validIds = Game::whereIn('id', $ids)->pluck('id')->toArray();

        foreach ($validIds as $gameId) {
            $discussion->gamepediaGames()->syncWithoutDetaching([$gameId]);
        }
    }
}
