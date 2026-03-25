<?php

use Flarum\Api\Resource;
use Flarum\Extend;
use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Flarum\Discussion\Event\Started as DiscussionStarted;
use Flarum\Discussion\Discussion;
use Resofire\Gamepedia\Models\Game;
use Resofire\Gamepedia\GamepediaServiceProvider;
use Resofire\Gamepedia\Listeners\SaveGameLinks;
use Resofire\Gamepedia\Listeners\SaveGameLinksAfterCreate;
use Resofire\Gamepedia\Api\Serializers\ForumGamepediaAttributes;
use Resofire\Gamepedia\Api\Serializers\DiscussionGameSerializer;
use Resofire\Gamepedia\Api\Controllers\ListGamesPublicController;
use Resofire\Gamepedia\Api\Controllers\ShowGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\IgdbSearchController;
use Resofire\Gamepedia\Api\Controllers\Admin\ImportGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\ListGamesController;
use Resofire\Gamepedia\Api\Controllers\Admin\DeleteGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\RefreshGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\ListGenresController;
use Resofire\Gamepedia\Api\Controllers\Admin\CreateGenreController;
use Resofire\Gamepedia\Api\Controllers\Admin\UpdateGenreController;
use Resofire\Gamepedia\Api\Controllers\Admin\DeleteGenreController;
use Resofire\Gamepedia\Api\Controllers\Admin\UpdateGameGenresController;

return [
    (new Extend\ServiceProvider())
        ->register(GamepediaServiceProvider::class),

    // Admin panel
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

    // API routes — all custom RequestHandlerInterface controllers, unchanged from 1.x
    (new Extend\Routes('api'))
        // Public
        ->get('/gamepedia/games',              'gamepedia.games.index',           ListGamesPublicController::class)
        ->get('/gamepedia/games/{slug}',       'gamepedia.games.show',            ShowGameController::class)
        // Admin — games
        ->get('/gamepedia/admin/igdb-search',  'gamepedia.admin.igdb-search',     IgdbSearchController::class)
        ->get('/gamepedia/admin/games',        'gamepedia.admin.games.index',     ListGamesController::class)
        ->post('/gamepedia/admin/import',      'gamepedia.admin.import',          ImportGameController::class)
        ->delete('/gamepedia/admin/games/{id}','gamepedia.admin.games.delete',    DeleteGameController::class)
        ->post('/gamepedia/admin/games/{id}/refresh', 'gamepedia.admin.games.refresh', RefreshGameController::class)
        ->post('/gamepedia/admin/games/{id}/genres',  'gamepedia.admin.games.genres',  UpdateGameGenresController::class)
        // Admin — genres
        ->get('/gamepedia/admin/genres',        'gamepedia.admin.genres.index',   ListGenresController::class)
        ->post('/gamepedia/admin/genres',        'gamepedia.admin.genres.create',  CreateGenreController::class)
        ->post('/gamepedia/admin/genres/{id}',   'gamepedia.admin.genres.update',  UpdateGenreController::class)
        ->delete('/gamepedia/admin/genres/{id}','gamepedia.admin.genres.delete',  DeleteGenreController::class),

    // Flarum 2.x: Expose permissions + settings to the JS frontend via ApiResource.
    // Replaces the 1.x Extend\ApiSerializer(ForumSerializer::class)->attributes() pattern.
    (new Extend\ApiResource(Resource\ForumResource::class))
        ->fields(ForumGamepediaAttributes::class),

    // Flarum 2.x: Inject gamepediaGames into discussion API responses via ApiResource.
    // Replaces the 1.x Extend\ApiSerializer(DiscussionSerializer::class)->attributes() pattern.
    (new Extend\ApiResource(Resource\DiscussionResource::class))
        ->fields(DiscussionGameSerializer::class),

    // Register gamepediaGames relationship on Discussion model — unchanged from 1.x
    (new Extend\Model(Discussion::class))
        ->belongsToMany('gamepediaGames', Game::class, 'gamepedia_discussion_game', 'discussion_id', 'game_id'),

    // Game linking events — unchanged from 1.x
    (new Extend\Event())
        ->listen(DiscussionSaving::class,  [SaveGameLinks::class, 'onDiscussionSaving'])
        ->listen(DiscussionStarted::class, [SaveGameLinksAfterCreate::class, 'onDiscussionStarted']),
];
