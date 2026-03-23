<?php

namespace Resofire\Gamepedia\Models;

use Illuminate\Database\Eloquent\Model;

class Screenshot extends Model
{
    protected $table = 'gamepedia_screenshots';

    protected $fillable = [
        'game_id',
        'igdb_image_id',
        'url',
        'order',
    ];

    /**
     * A screenshot belongs to one game.
     */
    public function game()
    {
        return $this->belongsTo(Game::class, 'game_id');
    }
}
