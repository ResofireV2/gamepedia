<?php

namespace Resofire\Gamepedia\Listeners;

use Flarum\Discussion\Event\Started as DiscussionStarted;
use Flarum\Post\Event\Posted;
use Resofire\Gamepedia\Models\Game;

class SaveGameLinksAfterCreate
{
    public function onDiscussionStarted(DiscussionStarted $event): void
    {
        $discussion = $event->discussion;
        $key  = spl_object_id($discussion);
        $ids  = SaveGameLinks::$pendingDiscussionGames[$key] ?? null;

        if (!$ids) return;

        unset(SaveGameLinks::$pendingDiscussionGames[$key]);
        $this->linkGames($discussion, $ids);
    }

    public function onPosted(Posted $event): void
    {
        $post = $event->post;
        $key  = spl_object_id($post);
        $ids  = SaveGameLinks::$pendingPostGames[$key] ?? null;

        if (!$ids) return;

        unset(SaveGameLinks::$pendingPostGames[$key]);

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
