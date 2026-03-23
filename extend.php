<?php

namespace Resofire\Gamepedia;

use Flarum\Extend;

return [
    (new Extend\ServiceProvider())
        ->register(GamepediaServiceProvider::class),

    // Admin panel — settings, permissions
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    // Forum frontend — placeholder for later stages
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    // Locale
    new Extend\Locales(__DIR__ . '/locale'),
];
