<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Illuminate\Support\Str;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Genre;

class CreateGenreController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $body = $request->getParsedBody();
        $name = trim($body['name'] ?? '');

        if (!$name) {
            return new JsonResponse(['error' => 'Name is required.'], 422);
        }

        $slug = Str::slug($name);

        if (Genre::where('slug', $slug)->exists()) {
            return new JsonResponse(['error' => 'A genre with this name already exists.'], 422);
        }

        $genre = Genre::create([
            'name'    => $name,
            'slug'    => $slug,
            'igdb_id' => null,
        ]);

        return new JsonResponse([
            'data'  => [
                'id'         => $genre->id,
                'name'       => $genre->name,
                'slug'       => $genre->slug,
                'game_count' => 0,
            ],
            'error' => null,
        ]);
    }
}
