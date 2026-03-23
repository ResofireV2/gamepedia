<?php

namespace Resofire\Gamepedia\Services;

use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Cache\Repository as Cache;

class IgdbService
{
    // Base URLs
    const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
    const IGDB_BASE_URL    = 'https://api.igdb.com/v4';

    // IGDB image URL template — {size} and {id} are replaced at runtime.
    // Available sizes: cover_small, cover_big, screenshot_med,
    //                  screenshot_big, screenshot_huge, thumb, micro, 720p, 1080p
    const IMAGE_URL = 'https://images.igdb.com/igdb/image/upload/t_{size}/{id}.jpg';

    // Cache key for the Twitch access token
    const TOKEN_CACHE_KEY = 'gamepedia.igdb_token';

    protected SettingsRepositoryInterface $settings;
    protected Cache $cache;

    public function __construct(SettingsRepositoryInterface $settings, Cache $cache)
    {
        $this->settings = $settings;
        $this->cache    = $cache;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Search IGDB for games matching a query string.
     * Returns an array of simplified game objects suitable for the admin
     * search results panel (not full game data).
     *
     * @param  string $query  The search term typed by the admin
     * @param  int    $limit  Max results to return (default 10)
     * @return array
     */
    public function searchGames(string $query, int $limit = 10): array
    {
        // Escape any double quotes in the query to avoid breaking the
        // Apicalypse string literal
        $safeQuery = str_replace('"', '\"', $query);

        $body = <<<APICALYPSE
        search "{$safeQuery}";
        fields id, name, cover.image_id, first_release_date,
               involved_companies.company.name, involved_companies.developer,
               involved_companies.publisher;
        limit {$limit};
        APICALYPSE;

        // Note: IGDB's search keyword does not work reliably with where filters
        // so we let IGDB return its best matches and the admin picks what to add.

        $results = $this->request('/games', $body);

        return array_map([$this, 'mapToSearchResult'], $results);
    }

    /**
     * Fetch full details for a single game by its IGDB ID.
     * Returns a fully-mapped array ready to be saved to our database.
     *
     * @param  int $igdbId
     * @return array|null  Returns null if the game was not found
     */
    public function fetchGame(int $igdbId): ?array
    {
        $body = <<<APICALYPSE
        fields id, name, summary,
               cover.image_id,
               screenshots.image_id,
               videos.video_id,
               genres.id, genres.name,
               involved_companies.company.name,
               involved_companies.developer,
               involved_companies.publisher,
               first_release_date;
        where id = {$igdbId};
        limit 1;
        APICALYPSE;

        $results = $this->request('/games', $body);

        if (empty($results)) {
            return null;
        }

        return $this->mapToSchema($results[0]);
    }

    // -------------------------------------------------------------------------
    // Mapping helpers
    // -------------------------------------------------------------------------

    /**
     * Map a raw IGDB game object to a lightweight search result array.
     * Used in the admin search panel — no screenshots, no full summary.
     */
    protected function mapToSearchResult(array $game): array
    {
        return [
            'igdb_id'            => $game['id'],
            'name'               => $game['name'] ?? 'Unknown',
            'cover_image_url'    => $this->buildImageUrl($game['cover']['image_id'] ?? null, 'cover_big'),
            'first_release_date' => $game['first_release_date'] ?? null,
            'release_year'       => isset($game['first_release_date'])
                                        ? (int) date('Y', $game['first_release_date'])
                                        : null,
            'developer'          => $this->extractCompany($game, 'developer'),
            'publisher'          => $this->extractCompany($game, 'publisher'),
        ];
    }

    /**
     * Map a full raw IGDB game object to our database schema.
     * This is what gets saved when an admin imports a game.
     */
    public function mapToSchema(array $game): array
    {
        return [
            // Core fields
            'igdb_id'            => $game['id'],
            'name'               => $game['name'] ?? 'Unknown',
            'summary'            => $game['summary'] ?? null,
            'cover_image_url'    => $this->buildImageUrl($game['cover']['image_id'] ?? null, 'cover_big'),
            'first_release_date' => $game['first_release_date'] ?? null,
            'developer'          => $this->extractCompany($game, 'developer'),
            'publisher'          => $this->extractCompany($game, 'publisher'),

            // YouTube trailer — take the first video IGDB returns
            'trailer_youtube_id' => $game['videos'][0]['video_id'] ?? null,

            // Genres — array of ['igdb_id' => x, 'name' => y]
            'genres'             => $this->extractGenres($game),

            // Screenshots — array of ['igdb_image_id' => x, 'url' => y, 'order' => z]
            'screenshots'        => $this->extractScreenshots($game),

            // Keep the raw response so we can re-map without re-fetching
            'raw_igdb_data'      => $game,
        ];
    }

    /**
     * Extract developer or publisher name from involved_companies.
     * IGDB returns an array of company objects each with a boolean
     * 'developer' and 'publisher' flag.
     *
     * @param  array  $game
     * @param  string $role  'developer' or 'publisher'
     * @return string|null
     */
    protected function extractCompany(array $game, string $role): ?string
    {
        if (empty($game['involved_companies'])) {
            return null;
        }

        foreach ($game['involved_companies'] as $entry) {
            if (!empty($entry[$role]) && isset($entry['company']['name'])) {
                return $entry['company']['name'];
            }
        }

        return null;
    }

    /**
     * Extract genres as a simple array of id/name pairs.
     */
    protected function extractGenres(array $game): array
    {
        if (empty($game['genres'])) {
            return [];
        }

        return array_map(function (array $genre) {
            return [
                'igdb_id' => $genre['id'],
                'name'    => $genre['name'],
            ];
        }, $game['genres']);
    }

    /**
     * Extract screenshots as ordered image data.
     * We store both the raw IGDB image ID (for future resizing)
     * and a pre-built URL at screenshot_big size.
     */
    protected function extractScreenshots(array $game): array
    {
        if (empty($game['screenshots'])) {
            return [];
        }

        $screenshots = [];
        foreach ($game['screenshots'] as $index => $screenshot) {
            if (empty($screenshot['image_id'])) {
                continue;
            }
            $screenshots[] = [
                'igdb_image_id' => $screenshot['image_id'],
                'url'           => $this->buildImageUrl($screenshot['image_id'], 'screenshot_big'),
                'order'         => $index,
            ];
        }

        return $screenshots;
    }

    /**
     * Build a full IGDB image URL from an image ID and size string.
     * Returns null if no image ID is provided.
     */
    protected function buildImageUrl(?string $imageId, string $size): ?string
    {
        if (!$imageId) {
            return null;
        }

        return str_replace(
            ['{size}', '{id}'],
            [$size, $imageId],
            self::IMAGE_URL
        );
    }

    // -------------------------------------------------------------------------
    // HTTP layer
    // -------------------------------------------------------------------------

    /**
     * Make an authenticated POST request to the IGDB API.
     *
     * @param  string $endpoint  e.g. '/games'
     * @param  string $body      Apicalypse query string
     * @return array             Decoded JSON response as PHP array
     *
     * @throws \RuntimeException on HTTP or auth errors
     */
    protected function request(string $endpoint, string $body): array
    {
        $token    = $this->getAccessToken();
        $clientId = $this->settings->get('gamepedia.igdb_client_id');

        if (!$clientId) {
            throw new \RuntimeException('IGDB Client ID is not configured.');
        }

        $url = self::IGDB_BASE_URL . $endpoint;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => trim($body),
            CURLOPT_HTTPHEADER     => [
                'Client-ID: ' . $clientId,
                'Authorization: Bearer ' . $token,
                'Accept: application/json',
            ],
            CURLOPT_TIMEOUT        => 10,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \RuntimeException('IGDB request failed: ' . $curlError);
        }

        if ($httpCode === 401) {
            // Token may have expired — clear cache and retry once
            $this->cache->forget(self::TOKEN_CACHE_KEY);
            return $this->request($endpoint, $body);
        }

        if ($httpCode !== 200) {
            throw new \RuntimeException("IGDB returned HTTP {$httpCode} for {$endpoint}");
        }

        $decoded = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('IGDB response was not valid JSON.');
        }

        return $decoded ?? [];
    }

    /**
     * Get a valid Twitch OAuth access token.
     * Fetches a new one if none is cached, then caches it for slightly
     * less than its actual expiry to avoid using a token right as it expires.
     *
     * @return string
     * @throws \RuntimeException if credentials are missing or the request fails
     */
    protected function getAccessToken(): string
    {
        // Return cached token if we have one
        $cached = $this->cache->get(self::TOKEN_CACHE_KEY);
        if ($cached) {
            return $cached;
        }

        $clientId     = $this->settings->get('gamepedia.igdb_client_id');
        $clientSecret = $this->settings->get('gamepedia.igdb_client_secret');

        if (!$clientId || !$clientSecret) {
            throw new \RuntimeException(
                'IGDB credentials are not configured. Please add your Client ID and Client Secret in the Gamepedia admin settings.'
            );
        }

        $ch = curl_init(self::TWITCH_TOKEN_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'client_id'     => $clientId,
                'client_secret' => $clientSecret,
                'grant_type'    => 'client_credentials',
            ]),
            CURLOPT_TIMEOUT        => 10,
        ]);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \RuntimeException('Twitch token request failed: ' . $curlError);
        }

        if ($httpCode !== 200) {
            throw new \RuntimeException(
                "Twitch token endpoint returned HTTP {$httpCode}. Check your Client ID and Secret."
            );
        }

        $data = json_decode($response, true);

        if (empty($data['access_token'])) {
            throw new \RuntimeException('Twitch token response did not contain an access_token.');
        }

        // Cache the token for 90% of its actual lifetime to give a safe buffer.
        // Twitch tokens typically expire after ~60 days (5,184,000 seconds).
        $ttlSeconds = (int) (($data['expires_in'] ?? 5184000) * 0.9);
        $this->cache->put(self::TOKEN_CACHE_KEY, $data['access_token'], $ttlSeconds);

        return $data['access_token'];
    }
}
