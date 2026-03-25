<?php

use Flarum\Extend;
use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Flarum\Discussion\Event\Started as DiscussionStarted;
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

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less')
        ->route('/gamepedia', 'gamepedia')
        ->route('/gamepedia/{slug}', 'gamepedia.game'),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\Routes('api'))
        ->get('/gamepedia/games',              'gamepedia.games.index',           ListGamesPublicController::class)
        ->get('/gamepedia/games/{slug}',       'gamepedia.games.show',            ShowGameController::class)
        ->get('/gamepedia/admin/igdb-search',  'gamepedia.admin.igdb-search',     IgdbSearchController::class)
        ->get('/gamepedia/admin/games',        'gamepedia.admin.games.index',     ListGamesController::class)
        ->post('/gamepedia/admin/import',      'gamepedia.admin.import',          ImportGameController::class)
        ->delete('/gamepedia/admin/games/{id}','gamepedia.admin.games.delete',    DeleteGameController::class)
        ->post('/gamepedia/admin/games/{id}/refresh', 'gamepedia.admin.games.refresh', RefreshGameController::class)
        ->post('/gamepedia/admin/games/{id}/genres',  'gamepedia.admin.games.genres',  UpdateGameGenresController::class)
        ->get('/gamepedia/admin/genres',        'gamepedia.admin.genres.index',   ListGenresController::class)
        ->post('/gamepedia/admin/genres',        'gamepedia.admin.genres.create',  CreateGenreController::class)
        ->post('/gamepedia/admin/genres/{id}',   'gamepedia.admin.genres.update',  UpdateGenreController::class)
        ->delete('/gamepedia/admin/genres/{id}','gamepedia.admin.genres.delete',  DeleteGenreController::class),

    (new Extend\Model(Discussion::class))
        ->belongsToMany('gamepediaGames', Game::class, 'gamepedia_discussion_game', 'discussion_id', 'game_id'),

    // Flarum 2.x: Event::listen() requires callable|string, not an array.
    // Listeners are invokable classes with a handle() method.
    (new Extend\Event())
        ->listen(DiscussionSaving::class,  SaveGameLinks::class)
        ->listen(DiscussionStarted::class, SaveGameLinksAfterCreate::class),
];
