<?php

namespace Resofire\Gamepedia\Models;

use Illuminate\Database\Eloquent\Model;

class Award extends Model
{
    protected $table    = 'gamepedia_awards';
    protected $fillable = ['game_id', 'year', 'title'];

    public function game()
    {
        return $this->belongsTo(Game::class, 'game_id');
    }
}
