<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        $schema->create('gamepedia_games', function (Blueprint $table) {
            $table->increments('id');

            // IGDB's own numeric ID — kept for refresh operations
            $table->unsignedInteger('igdb_id')->unique();

            // Display name exactly as returned by IGDB
            $table->string('name');

            // URL slug, e.g. "elden-ring" or "star-wars-1983"
            $table->string('slug')->unique();

            // Long-form summary from IGDB
            $table->text('summary')->nullable();

            // Full URL to the IGDB cover image (we store the URL, not the file)
            $table->string('cover_image_url')->nullable();

            // YouTube video ID only (e.g. "dQw4w9WgXcQ"), not a full URL
            // Extracted from IGDB's videos data during import
            $table->string('trailer_youtube_id')->nullable();

            // Developer and publisher as plain strings.
            // IGDB returns involved_companies with role flags; we resolve
            // developer and publisher at import time and store as text.
            $table->string('developer')->nullable();
            $table->string('publisher')->nullable();

            // Unix timestamp of first release date from IGDB.
            // Stored as integer so we can filter by year without date parsing.
            $table->unsignedInteger('first_release_date')->nullable();

            // The full raw IGDB API response stored as JSON.
            // This lets us re-map fields in the future without re-fetching.
            $table->json('raw_igdb_data')->nullable();

            $table->timestamps();
        });
    },

    'down' => function (Builder $schema) {
        $schema->dropIfExists('gamepedia_games');
    },
];
