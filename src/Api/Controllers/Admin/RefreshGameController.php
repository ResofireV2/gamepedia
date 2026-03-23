<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Illuminate\Support\Str;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;
use Resofire\Gamepedia\Models\Genre;
use Resofire\Gamepedia\Models\Screenshot;
use Resofire\Gamepedia\Services\IgdbService;

class RefreshGameController implements RequestHandlerInterface
{
    protected IgdbService $igdb;

    public function __construct(IgdbService $igdb)
    {
        $this->igdb = $igdb;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $id   = (int) ($request->getQueryParams()['id'] ?? 0);
        $game = Game::find($id);

        if (!$game) {
            return new JsonResponse(['error' => 'Game not found.'], 404);
        }

        try {
            $data = $this->igdb->fetchGame($game->igdb_id);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 422);
        }

        if (!$data) {
            return new JsonResponse(['error' => 'Game not found on IGDB.'], 404);
        }

        // Update core fields — keep the existing slug
        $game->update([
            'name'               => $data['name'],
            'summary'            => $data['summary'],
            'cover_image_url'    => $data['cover_image_url'],
            'trailer_youtube_id' => $data['trailer_youtube_id'],
            'developer'          => $data['developer'],
            'publisher'          => $data['publisher'],
            'first_release_date' => $data['first_release_date'],
            'raw_igdb_data'      => $data['raw_igdb_data'],
        ]);

        // Sync genres
        $genreIds = [];
        foreach ($data['genres'] as $genreData) {
            $genre = Genre::firstOrCreate(
                ['igdb_id' => $genreData['igdb_id']],
                [
                    'name' => $genreData['name'],
                    'slug' => Str::slug($genreData['name']),
                ]
            );
            $genreIds[] = $genre->id;
        }
        $game->genres()->sync($genreIds);

        // Replace screenshots — delete old, insert new
        $game->screenshots()->delete();
        foreach ($data['screenshots'] as $screenshotData) {
            Screenshot::create([
                'game_id'       => $game->id,
                'igdb_image_id' => $screenshotData['igdb_image_id'],
                'url'           => $screenshotData['url'],
                'order'         => $screenshotData['order'],
            ]);
        }

        return new JsonResponse([
            'data' => [
                'id'              => $game->id,
                'name'            => $game->name,
                'slug'            => $game->slug,
                'cover_image_url' => $game->cover_image_url,
                'developer'       => $game->developer,
                'release_year'    => $game->release_year,
            ],
            'error' => null,
        ]);
    }
}
