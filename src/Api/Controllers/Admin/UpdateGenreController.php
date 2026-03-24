<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Illuminate\Support\Str;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Genre;

class UpdateGenreController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $id    = (int) ($request->getQueryParams()['id'] ?? 0);
        $genre = Genre::find($id);

        if (!$genre) {
            return new JsonResponse(['error' => 'Genre not found.'], 404);
        }

        $body = $request->getParsedBody();
        $name = trim($body['name'] ?? '');

        if (!$name) {
            return new JsonResponse(['error' => 'Name is required.'], 422);
        }

        $genre->name = $name;
        $genre->slug = Str::slug($name);
        $genre->save();

        return new JsonResponse([
            'data'  => ['id' => $genre->id, 'name' => $genre->name, 'slug' => $genre->slug],
            'error' => null,
        ]);
    }
}
