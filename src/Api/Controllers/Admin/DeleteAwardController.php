<?php

namespace Resofire\Gamepedia\Api\Controllers\Admin;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Resofire\Gamepedia\Models\Award;

class DeleteAwardController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $id    = (int) ($request->getQueryParams()['id'] ?? 0);
        $award = Award::find($id);

        if (!$award) {
            return new JsonResponse(['error' => 'Award not found.'], 404);
        }

        $award->delete();

        return new JsonResponse(['error' => null]);
    }
}
