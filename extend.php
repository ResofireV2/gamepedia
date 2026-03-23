<?php

use Flarum\Extend;
use Resofire\Gamepedia\GamepediaServiceProvider;
use Resofire\Gamepedia\Api\Controllers\ListGamesPublicController;
use Resofire\Gamepedia\Api\Controllers\ShowGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\IgdbSearchController;
use Resofire\Gamepedia\Api\Controllers\Admin\ImportGameController;
use Resofire\Gamepedia\Api\Controllers\Admin\ListGamesController;
use Resofire\Gamepedia\Api\Controllers\Admin\DeleteGameController;

return [
    (new Extend\ServiceProvider())
        ->register(GamepediaServiceProvider::class),

    // Admin panel — settings, permissions
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    // Forum frontend — placeholder for later stages
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less')
        ->route('/gamepedia', 'gamepedia')
        ->route('/gamepedia/{slug}', 'gamepedia.game'),

    // Locale
    new Extend\Locales(__DIR__ . '/locale'),

    // Admin API routes
    (new Extend\Routes('api'))
        ->get('/gamepedia/games', 'gamepedia.games.index', ListGamesPublicController::class)
        ->get('/gamepedia/games/{slug}', 'gamepedia.games.show', ShowGameController::class)
        ->get('/gamepedia/admin/igdb-search', 'gamepedia.admin.igdb-search', IgdbSearchController::class)
        ->get('/gamepedia/admin/games', 'gamepedia.admin.games.index', ListGamesController::class)
        ->post('/gamepedia/admin/import', 'gamepedia.admin.import', ImportGameController::class)
        ->delete('/gamepedia/admin/games/{id}', 'gamepedia.admin.games.delete', DeleteGameController::class),
];
