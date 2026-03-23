<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->create('gamepedia_screenshots', function (Blueprint $table) {
            $table->increments('id');

            // Foreign key to the game this screenshot belongs to
            $table->unsignedInteger('game_id');
            $table->foreign('game_id')
                  ->references('id')
                  ->on('gamepedia_games')
                  ->onDelete('cascade');

            // IGDB's image ID string, e.g. "sc7b3k"
            // Used to construct image URLs at any size:
            // https://images.igdb.com/igdb/image/upload/t_screenshot_big/{igdb_image_id}.jpg
            $table->string('igdb_image_id');

            // Pre-built full URL for the screenshot (medium size for display)
            $table->string('url');

            // Display order as returned by IGDB
            $table->unsignedSmallInteger('order')->default(0);

            $table->timestamps();
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('gamepedia_screenshots');
    },
];
