<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Genre;

class DeleteGenreController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $id    = (int) ($request->getQueryParams()['id'] ?? 0);
        $genre = Genre::find($id);

        if (!$genre) {
            return new JsonResponse(['error' => 'Genre not found.'], 404);
        }

        // Detach from all games first, then delete
        $genre->games()->detach();
        $genre->delete();

        return new JsonResponse(['error' => null]);
    }
}
