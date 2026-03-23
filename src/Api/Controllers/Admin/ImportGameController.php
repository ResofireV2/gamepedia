<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;
use Resofire\Gamepedia\Models\Genre;
use Resofire\Gamepedia\Models\Screenshot;
use Resofire\Gamepedia\Services\IgdbService;

class ImportGameController implements RequestHandlerInterface
{
    protected IgdbService $igdb;

    public function __construct(IgdbService $igdb)
    {
        $this->igdb = $igdb;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // Admin only
        $actor = RequestUtil::getActor($request);
        $actor->assertAdmin();

        $body   = $request->getParsedBody();
        $igdbId = (int) Arr::get($body, 'igdb_id');

        if (!$igdbId) {
            return new JsonResponse(['error' => 'igdb_id is required.'], 422);
        }

        // Don't import duplicates
        if (Game::where('igdb_id', $igdbId)->exists()) {
            return new JsonResponse(['error' => 'This game has already been imported.'], 422);
        }

        try {
            $data = $this->igdb->fetchGame($igdbId);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 422);
        }

        if (!$data) {
            return new JsonResponse(['error' => 'Game not found on IGDB.'], 404);
        }

        // Generate a unique slug from the game name
        $slug = $this->generateSlug($data['name'], $data['first_release_date'] ?? null, $igdbId);

        // Save the game
        $game = Game::create([
            'igdb_id'            => $data['igdb_id'],
            'name'               => $data['name'],
            'slug'               => $slug,
            'summary'            => $data['summary'],
            'cover_image_url'    => $data['cover_image_url'],
            'trailer_youtube_id' => $data['trailer_youtube_id'],
            'developer'          => $data['developer'],
            'publisher'          => $data['publisher'],
            'first_release_date' => $data['first_release_date'],
            'raw_igdb_data'      => $data['raw_igdb_data'],
        ]);

        // Save genres — create if they don't exist yet
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

        if (!empty($genreIds)) {
            $game->genres()->sync($genreIds);
        }

        // Save screenshots
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
                'id'   => $game->id,
                'name' => $game->name,
                'slug' => $game->slug,
            ],
            'error' => null,
        ]);
    }

    /**
     * Generate a URL-safe slug, appending year then IGDB ID to avoid collisions.
     *
     * Examples:
     *   "Elden Ring"         → "elden-ring"
     *   "Star Wars" (1983)   → "star-wars-1983"  (if "star-wars" taken)
     *   "Star Wars" (1983)   → "star-wars-1983-119133" (if year slug also taken)
     */
    protected function generateSlug(string $name, ?int $releaseTimestamp, int $igdbId): string
    {
        $base = Str::slug($name);

        // Try plain slug first
        if (!Game::where('slug', $base)->exists()) {
            return $base;
        }

        // Try with year appended
        if ($releaseTimestamp) {
            $year      = date('Y', $releaseTimestamp);
            $withYear  = $base . '-' . $year;

            if (!Game::where('slug', $withYear)->exists()) {
                return $withYear;
            }
        }

        // Fall back to IGDB ID for guaranteed uniqueness
        return $base . '-' . $igdbId;
    }
}
