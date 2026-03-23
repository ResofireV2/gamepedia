<?php

namespace Resofire\Gamepedia\Listeners;

use Flarum\Discussion\Event\Started as DiscussionStarted;
use Flarum\Post\Event\Posted;
use Resofire\Gamepedia\Models\Game;

class SaveGameLinksAfterCreate
{
    /**
     * After a discussion is created, sync the game links.
     * At this point the discussion has an ID we can use.
     */
    public function onDiscussionStarted(DiscussionStarted $event): void
    {
        $discussion = $event->discussion;
        $ids = $discussion->gamepediaGameIds ?? null;
        if (!$ids) return;

        $this->linkGames($discussion, $ids);
    }

    /**
     * After a reply is posted, sync the game links to its discussion.
     */
    public function onPosted(Posted $event): void
    {
        $post = $event->post;
        $ids  = $post->gamepediaGameIds ?? null;
        if (!$ids) return;

        $discussion = $post->discussion;
        if ($discussion) {
            $this->linkGames($discussion, $ids);
        }
    }

    private function linkGames($discussion, array $ids): void
    {
        $max      = (int) app('flarum.settings')->get('gamepedia.max_games_per_discussion', 3);
        $ids      = array_unique($ids);
        $ids      = array_slice($ids, 0, $max);
        $validIds = Game::whereIn('id', $ids)->pluck('id')->toArray();

        foreach ($validIds as $gameId) {
            $discussion->gamepediaGames()->syncWithoutDetaching([$gameId]);
        }
    }
}
