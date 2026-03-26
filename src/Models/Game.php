<?php

namespace Resofire\Gamepedia\Models;

use Illuminate\Database\Eloquent\Model;
use Flarum\Discussion\Discussion;

class Game extends Model
{
    protected $table = 'gamepedia_games';

    protected $fillable = [
        'igdb_id',
        'name',
        'slug',
        'summary',
        'cover_image_url',
        'trailer_youtube_id',
        'developer',
        'publisher',
        'first_release_date',
        'raw_igdb_data',
    ];

    /**
     * Store raw_igdb_data as a PHP array, not a raw JSON string.
     */
    protected $casts = [
        'raw_igdb_data' => 'array',
    ];

    /**
     * A game has many screenshots, ordered as IGDB returned them.
     */
    public function screenshots()
    {
        return $this->hasMany(Screenshot::class, 'game_id')->orderBy('order');
    }

    /**
     * A game belongs to many genres.
     */
    public function genres()
    {
        return $this->belongsToMany(
            Genre::class,
            'gamepedia_game_genre',
            'game_id',
            'genre_id'
        );
    }

    /**
     * A game can be linked to many discussions.
     */
    public function discussions()
    {
        return $this->belongsToMany(
            Discussion::class,
            'gamepedia_discussion_game',
            'game_id',
            'discussion_id'
        )->withPivot('created_at');
    }

    /**
     * A game has many awards.
     */
    public function awards()
    {
        return $this->hasMany(Award::class, 'game_id')->orderBy('year', 'desc');
    }

    /**
     * Helper: return the release year as an integer, or null.
     * first_release_date is stored as a Unix timestamp.
     */
    public function getReleaseYearAttribute(): ?int
    {
        return $this->first_release_date
            ? (int) date('Y', $this->first_release_date)
            : null;
    }

    /**
     * Helper: return a formatted release date string, or null.
     */
    public function getFormattedReleaseDateAttribute(): ?string
    {
        return $this->first_release_date
            ? date('F j, Y', $this->first_release_date)
            : null;
    }
}
