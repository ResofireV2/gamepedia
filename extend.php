<?php

use Flarum\Extend;
use Flarum\Discussion\Discussion;
use Resofire\Gamepedia\Models\Game;
use Resofire\Gamepedia\GamepediaServiceProvider;
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
use Flarum\Api\Resource;
use Resofire\Gamepedia\Api\Serializers\ForumGamepediaAttributes;
use Resofire\Gamepedia\Api\Serializers\DiscussionGameSerializer;
use Resofire\Gamepedia\Api\Controllers\LinkGamesToDiscussionController;
use Resofire\Gamepedia\Api\Controllers\Admin\UpdateGameGenresController;
use Resofire\Gamepedia\Api\Controllers\Admin\ListAwardsController;
use Resofire\Gamepedia\Api\Controllers\Admin\SaveAwardController;
use Resofire\Gamepedia\Api\Controllers\Admin\DeleteAwardController;

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

    // Flarum 2.x: Plain settings serialized to forum JS.
    // Field names are camelCase — dots are not valid in JSON:API field names.
    (new Extend\Settings())
        ->serializeToForum('gamepediaSubtitle',              'gamepedia.subtitle')
        ->default('gamepedia.subtitle', 'Browse the game library')
        ->serializeToForum('gamepediaMaxGamesPerDiscussion', 'gamepedia.max_games_per_discussion')
        ->default('gamepedia.max_games_per_discussion', 3)
        ->serializeToForum('gamepediaSlideshowInterval',     'gamepedia.slideshow_interval')
        ->default('gamepedia.slideshow_interval', 4),

    // Actor-aware permission fields — require ApiResource with Context.
    (new Extend\ApiResource(Resource\ForumResource::class))
        ->fields(ForumGamepediaAttributes::class),

    // gamepediaGames array on every discussion API response.
    (new Extend\ApiResource(Resource\DiscussionResource::class))
        ->fields(DiscussionGameSerializer::class),

    (new Extend\Routes('api'))
        ->get('/gamepedia/games',              'gamepedia.games.index',           ListGamesPublicController::class)
        ->get('/gamepedia/games/{slug}',       'gamepedia.games.show',            ShowGameController::class)
        ->post('/gamepedia/discussions/{id}/games', 'gamepedia.discussions.games', LinkGamesToDiscussionController::class)
        ->get('/gamepedia/admin/igdb-search',  'gamepedia.admin.igdb-search',     IgdbSearchController::class)
        ->get('/gamepedia/admin/games',        'gamepedia.admin.games.index',     ListGamesController::class)
        ->post('/gamepedia/admin/import',      'gamepedia.admin.import',          ImportGameController::class)
        ->delete('/gamepedia/admin/games/{id}','gamepedia.admin.games.delete',    DeleteGameController::class)
        ->post('/gamepedia/admin/games/{id}/refresh', 'gamepedia.admin.games.refresh', RefreshGameController::class)
        ->post('/gamepedia/admin/games/{id}/genres',  'gamepedia.admin.games.genres',  UpdateGameGenresController::class)
        ->get('/gamepedia/admin/genres',        'gamepedia.admin.genres.index',   ListGenresController::class)
        ->post('/gamepedia/admin/genres',        'gamepedia.admin.genres.create',  CreateGenreController::class)
        ->post('/gamepedia/admin/genres/{id}',   'gamepedia.admin.genres.update',  UpdateGenreController::class)
        ->delete('/gamepedia/admin/genres/{id}','gamepedia.admin.genres.delete',  DeleteGenreController::class)
        ->get('/gamepedia/admin/games/{game_id}/awards',    'gamepedia.admin.awards.index',  ListAwardsController::class)
        ->post('/gamepedia/admin/games/{game_id}/awards',   'gamepedia.admin.awards.save',   SaveAwardController::class)
        ->delete('/gamepedia/admin/awards/{id}',            'gamepedia.admin.awards.delete', DeleteAwardController::class),

    (new Extend\Model(Discussion::class))
        ->belongsToMany('gamepediaGames', Game::class, 'gamepedia_discussion_game', 'discussion_id', 'game_id'),

];
