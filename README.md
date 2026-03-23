# Gamepedia for Flarum

A game database extension for Flarum powered by IGDB. Browse games, view game details, and link discussions to games.

## Features

- Browse a paginated game library with cover art
- Individual game pages with description, trailer, screenshots, developer, publisher, genres, and release date
- Link discussions to games via `Ctrl+Shift+G` in the composer
- Related discussions shown on each game page
- Admin panel for importing games from IGDB
- Genre management

## Requirements

- Flarum 1.8+
- A free [Twitch Developer](https://dev.twitch.tv) account for IGDB API access

## Installation

```bash
composer require resofire/gamepedia
```

## Configuration

1. Go to your Flarum admin panel
2. Click on **Gamepedia** in the extensions list
3. Enter your IGDB **Client ID** and **Client Secret**
4. Save settings

## IGDB Credentials

1. Visit [dev.twitch.tv](https://dev.twitch.tv) and log in with your Twitch account
2. Go to **Console → Applications → Register Your Application**
3. Set the OAuth Redirect URL to `localhost`
4. Set Client Type to **Confidential**
5. Copy the **Client ID** and generate a **Client Secret**

## License

MIT
