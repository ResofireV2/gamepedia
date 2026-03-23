<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->create('gamepedia_genres', function (Blueprint $table) {
            // Auto-incrementing primary key
            $table->increments('id');

            // Nullable because admin-created genres won't have an IGDB ID
            $table->unsignedInteger('igdb_id')->nullable()->unique();

            // Genre name as stored/edited, e.g. "Role-playing (RPG)"
            $table->string('name');

            // URL-safe slug, e.g. "role-playing-rpg"
            $table->string('slug')->unique();

            $table->timestamps();
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('gamepedia_genres');
    },
];
