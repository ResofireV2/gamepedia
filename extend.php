<?php

use Flarum\Extend;
use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Flarum\Discussion\Event\Started as DiscussionStarted;
use Flarum\Post\Event\Saving as PostSaving;
use Flarum\Post\Event\Posted;
use Flarum\Api\Serializer\DiscussionSerializer;
use Resofire\Gamepedia\Api\Serializers\DiscussionGameSerializer;
use Flarum\Discussion\Discussion;
use Resofire\Gamepedia\Models\Game;
use Resofire\Gamepedia\GamepediaServiceProvider;
use Resofire\Gamepedia\Listeners\SaveGameLinks;
use Resofire\Gamepedia\Listeners\SaveGameLinksAfterCreate;
use Resofire\Gamepedia\Api\Controllers\ListGamesPublicController;
use Resofire\Gamepedia\Api\Controllers\ShowGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\IgdbSearchController;
use Resofire\Gamepedia\Api\Controllers\Admin\ImportGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\ListGamesController;
use Resofire\Gamepedia\Api\Controllers\Admin\RefreshGameController;

return [
    (new Extend\ServiceProvider())
        ->register(GamepediaServiceProvider::class),

    // Admin panel — settings, permissions
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    // Forum frontend
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less')
        ->route('/gamepedia', 'gamepedia')
        ->route('/gamepedia/{slug}', 'gamepedia.game'),

    // Locale
    new Extend\Locales(__DIR__ . '/locale'),

    // API routes
    (new Extend\Routes('api'))
        ->get('/gamepedia/games', 'gamepedia.games.index', ListGamesPublicController::class)
        ->get('/gamepedia/games/{slug}', 'gamepedia.games.show', ShowGameController::class)
        ->get('/gamepedia/admin/igdb-search', 'gamepedia.admin.igdb-search', IgdbSearchController::class)
        ->get('/gamepedia/admin/games', 'gamepedia.admin.games.index', ListGamesController::class)
        ->post('/gamepedia/admin/import', 'gamepedia.admin.import', ImportGameController::class)
        ->delete('/gamepedia/admin/games/{id}', 'gamepedia.admin.games.delete', DeleteGameController::class)
        ->post('/gamepedia/admin/games/{id}/refresh', 'gamepedia.admin.games.refresh', RefreshGameController::class),

    // Inject gamepediaGames into every discussion API response
    (new Extend\ApiSerializer(DiscussionSerializer::class))
        ->attributes(DiscussionGameSerializer::class),

    // Register gamepediaGames relationship on Flarum's Discussion model
    (new Extend\Model(Discussion::class))
        ->belongsToMany('gamepediaGames', Game::class, 'gamepedia_discussion_game', 'discussion_id', 'game_id'),

    // Game linking — save IDs from composer to pivot table
    (new Extend\Event())
        ->listen(DiscussionSaving::class, [SaveGameLinks::class, 'onDiscussionSaving'])
        ->listen(PostSaving::class,       [SaveGameLinks::class, 'onPostSaving'])
        ->listen(DiscussionStarted::class, [SaveGameLinksAfterCreate::class, 'onDiscussionStarted'])
        ->listen(Posted::class,            [SaveGameLinksAfterCreate::class, 'onPosted']),
];
