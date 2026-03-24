<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Game;
use Resofire\Gamepedia\Models\Genre;

class ListGamesController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $params = $request->getQueryParams();
        $search = trim($params['search'] ?? '');
        $genre  = trim($params['genre']  ?? '');
        $year   = trim($params['year']   ?? '');
        $sort   = $params['sort'] ?? 'newest';
        $page   = max(1, (int) ($params['page'] ?? 1));
        $limit  = 16;

        $query = Game::with('genres');

        match($sort) {
            'az'     => $query->orderBy('name', 'asc'),
            'za'     => $query->orderBy('name', 'desc'),
            'oldest' => $query->orderBy('created_at', 'asc'),
            default  => $query->orderBy('created_at', 'desc'),
        };

        if ($search !== '') {
            $query->where('name', 'like', '%' . $search . '%');
        }

        if ($genre !== '') {
            $query->whereHas('genres', fn($q) => $q->where('slug', $genre));
        }

        if ($year !== '' && is_numeric($year)) {
            $yearInt = (int) $year;
            $query->whereBetween('first_release_date', [
                mktime(0, 0, 0, 1, 1, $yearInt),
                mktime(23, 59, 59, 12, 31, $yearInt),
            ]);
        }

        $total = $query->count();
        $games = $query->skip(($page - 1) * $limit)->take($limit)->get();

        $genres = Genre::orderBy('name')->get()->map(fn($g) => [
            'id'   => $g->id,
            'name' => $g->name,
            'slug' => $g->slug,
        ]);

        $years = Game::selectRaw('DISTINCT YEAR(FROM_UNIXTIME(first_release_date)) as year')
            ->whereNotNull('first_release_date')
            ->orderByRaw('year DESC')
            ->pluck('year')
            ->filter()
            ->values();

        return new JsonResponse([
            'data' => $games->map(fn(Game $game) => [
                'id'              => $game->id,
                'igdb_id'         => $game->igdb_id,
                'name'            => $game->name,
                'slug'            => $game->slug,
                'cover_image_url' => $game->cover_image_url,
                'developer'       => $game->developer,
                'release_year'    => $game->release_year,
                'genres'          => $game->genres->map(fn($g) => [
                    'id'   => $g->id,
                    'name' => $g->name,
                    'slug' => $g->slug,
                ]),
            ]),
            'meta' => [
                'total'        => $total,
                'per_page'     => $limit,
                'current_page' => $page,
                'last_page'    => (int) ceil($total / $limit),
                'has_more'     => ($page * $limit) < $total,
            ],
            'filters' => [
                'genres' => $genres,
                'years'  => $years,
            ],
            'error' => null,
        ]);
    }
}
