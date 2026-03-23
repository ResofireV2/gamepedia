<?php

namespace Resofire\Gamepedia;

use Flarum\Foundation\AbstractServiceProvider;
use Resofire\Gamepedia\Services\IgdbService;

class GamepediaServiceProvider extends AbstractServiceProvider
{
    public function register(): void
    {
        // Bind IgdbService as a singleton so only one instance is created
        // per request and the cached token is reused within the request.
        $this->container->singleton(IgdbService::class, function ($container) {
            return new IgdbService(
                $container->make('flarum.settings'),
                $container->make('cache.store')
            );
        });
    }
}
