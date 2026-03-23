import app from 'flarum/admin/app';

app.initializers.add('resofire-gamepedia', function () {
  app.extensionData
    .for('resofire-gamepedia')

    // IGDB Credentials
    .registerSetting({
      setting: 'gamepedia.igdb_client_id',
      type: 'text',
      label: 'IGDB Client ID',
      help: 'Your Twitch Developer application Client ID. Required for IGDB API access.',
    })
    .registerSetting({
      setting: 'gamepedia.igdb_client_secret',
      type: 'text',
      label: 'IGDB Client Secret',
      help: 'Your Twitch Developer application Client Secret. Keep this private.',
    })

    // Game linking limit
    .registerSetting({
      setting: 'gamepedia.max_games_per_discussion',
      type: 'number',
      label: 'Max Games Per Discussion',
      help: 'Maximum number of games a user can link to a single discussion. Default: 3.',
      min: 1,
      max: 10,
    })

    // Permissions
    .registerPermission(
      {
        permission: 'gamepedia.view',
        label: 'Browse Gamepedia and view game pages',
        icon: 'fas fa-gamepad',
      },
      'view'
    )
    .registerPermission(
      {
        permission: 'gamepedia.linkGame',
        label: 'Link games to discussions',
        icon: 'fas fa-link',
      },
      'start'
    );
});
