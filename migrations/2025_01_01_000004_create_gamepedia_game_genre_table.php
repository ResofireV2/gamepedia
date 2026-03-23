<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->create('gamepedia_game_genre', function (Blueprint $table) {
            // No auto-increment id needed on a pure pivot table
            $table->unsignedInteger('game_id');
            $table->unsignedInteger('genre_id');

            // Composite primary key prevents duplicate pairings
            $table->primary(['game_id', 'genre_id']);

            $table->foreign('game_id')
                  ->references('id')
                  ->on('gamepedia_games')
                  ->onDelete('cascade');

            $table->foreign('genre_id')
                  ->references('id')
                  ->on('gamepedia_genres')
                  ->onDelete('cascade');
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('gamepedia_game_genre');
    },
];
