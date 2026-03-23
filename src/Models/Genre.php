<?php

namespace Resofire\Gamepedia\Models;

use Illuminate\Database\Eloquent\Model;

class Genre extends Model
{
    protected $table = 'gamepedia_genres';

    protected $fillable = [
        'igdb_id',
        'name',
        'slug',
    ];

    /**
     * A genre belongs to many games.
     */
    public function games()
    {
        return $this->belongsToMany(
            Game::class,
            'gamepedia_game_genre',
            'genre_id',
            'game_id'
        );
    }
}
