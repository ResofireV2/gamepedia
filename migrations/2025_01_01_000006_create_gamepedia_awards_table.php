<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->create('gamepedia_awards', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('game_id');
            $table->string('year', 4);
            $table->string('title', 100);
            $table->timestamps();

            $table->foreign('game_id')
                  ->references('id')
                  ->on('gamepedia_games')
                  ->onDelete('cascade');
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('gamepedia_awards');
    },
];
