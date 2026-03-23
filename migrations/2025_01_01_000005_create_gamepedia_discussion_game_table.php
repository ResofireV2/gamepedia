<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->create('gamepedia_discussion_game', function (Blueprint $table) {
            // This pivot gets its own id because we may want to reference
            // individual links (e.g. for deletion via API) without
            // passing both foreign keys in the URL.
            $table->increments('id');

            // References Flarum's core discussions table
            $table->unsignedInteger('discussion_id');
            $table->foreign('discussion_id')
                  ->references('id')
                  ->on('discussions')
                  ->onDelete('cascade');

            $table->unsignedInteger('game_id');
            $table->foreign('game_id')
                  ->references('id')
                  ->on('gamepedia_games')
                  ->onDelete('cascade');

            // Prevent the same game being linked to the same discussion twice
            $table->unique(['discussion_id', 'game_id']);

            // Track when the link was created so we can sort/audit
            $table->timestamp('created_at')->nullable();
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('gamepedia_discussion_game');
    },
];
