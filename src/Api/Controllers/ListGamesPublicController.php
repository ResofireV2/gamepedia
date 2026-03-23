<?php

namespace Resofire\Gamepedia\Api\Controllers;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;
use Resofire\Gamepedia\Models\Genre;

class ListGamesPublicController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // Respect the gamepedia.view permission
        $actor = RequestUtil::getActor($request);
        $actor->assertCan('gamepedia.view');

        $params = $request->getQueryParams();
        $search = trim($params['search'] ?? '');
        $genre  = trim($params['genre']  ?? '');
        $year   = trim($params['year']   ?? '');
        $page   = max(1, (int) ($params['page'] ?? 1));
        $limit  = 24; // games per page

        $query = Game::with('genres')->orderBy('name');

        // Search by name
        if ($search !== '') {
            $query->where('name', 'like', '%' . $search . '%');
        }

        // Filter by genre slug
        if ($genre !== '') {
            $query->whereHas('genres', function ($q) use ($genre) {
                $q->where('slug', $genre);
            });
        }

        // Filter by release year
        if ($year !== '' && is_numeric($year)) {
            $yearInt   = (int) $year;
            $startTime = mktime(0, 0, 0, 1, 1, $yearInt);
            $endTime   = mktime(23, 59, 59, 12, 31, $yearInt);
            $query->whereBetween('first_release_date', [$startTime, $endTime]);
        }

        $total  = $query->count();
        $games  = $query->skip(($page - 1) * $limit)->take($limit)->get();

        // Build genre list for filter dropdown
        $genres = Genre::orderBy('name')->get()->map(function (Genre $genre) {
            return [
                'id'   => $genre->id,
                'name' => $genre->name,
                'slug' => $genre->slug,
            ];
        });

        // Build year list for filter dropdown (distinct years from imported games)
        $years = Game::selectRaw('DISTINCT YEAR(FROM_UNIXTIME(first_release_date)) as year')
            ->whereNotNull('first_release_date')
            ->orderByRaw('year DESC')
            ->pluck('year')
            ->filter()
            ->values();

        return new JsonResponse([
            'data' => $games->map(function (Game $game) {
                return [
                    'id'              => $game->id,
                    'name'            => $game->name,
                    'slug'            => $game->slug,
                    'cover_image_url' => $game->cover_image_url,
                    'release_year'    => $game->release_year,
                    'developer'       => $game->developer,
                    'genres'          => $game->genres->map(fn($g) => [
                        'id'   => $g->id,
                        'name' => $g->name,
                        'slug' => $g->slug,
                    ]),
                ];
            }),
            'meta' => [
                'total'        => $total,
                'per_page'     => $limit,
                'current_page' => $page,
                'last_page'    => (int) ceil($total / $limit),
            ],
            'filters' => [
                'genres' => $genres,
                'years'  => $years,
            ],
            'error' => null,
        ]);
    }
}
