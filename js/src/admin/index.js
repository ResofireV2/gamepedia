import app from 'flarum/admin/app';

app.initializers.add('resofire-gamepedia', function () {
  app.extensionData
    .for('resofire-gamepedia')

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
    .registerSetting({
      setting: 'gamepedia.max_games_per_discussion',
      type: 'number',
      label: 'Max Games Per Discussion',
      help: 'Maximum number of games a user can link to a single discussion. Default: 3.',
      min: 1,
      max: 10,
    })

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
    )

    .registerPage(GameImportPage);
});

// ─── Game Import Page Component ──────────────────────────────────────────────

class GameImportPage {
  oninit() {
    this.query       = '';
    this.results     = [];
    this.loading     = false;
    this.error       = null;
    this.importing   = {};
    this.imported    = {};
    this.searchTimer = null;
  }

  view() {
    const m = window.m;
    return m('.GameImportPage', [
      m('h3', 'Import Games from IGDB'),
      m('p.helpText', 'Search for a game and click Import to add it to your Gamepedia.'),

      m('.Form-group', [
        m('input.FormControl', {
          type: 'text',
          placeholder: 'Search IGDB...',
          value: this.query,
          oninput: (e) => {
            this.query = e.target.value;
            this.error = null;
            clearTimeout(this.searchTimer);
            if (this.query.length < 2) {
              this.results = [];
              return;
            }
            this.searchTimer = setTimeout(() => this.search(), 500);
          },
        }),
      ]),

      this.loading && m('.GameImport-loading', [
        m('i.fas.fa-spinner.fa-spin'), ' Searching IGDB...'
      ]),

      this.error && m('.Alert.Alert--error', this.error),

      this.results.length > 0 && m('.GameImport-results',
        this.results.map((game) => this.viewResult(game))
      ),
    ]);
  }

  viewResult(game) {
    const m = window.m;
    const igdbId      = game.igdb_id;
    const isImporting = !!this.importing[igdbId];
    const isImported  = !!this.imported[igdbId];

    return m('.GameImport-result', { key: igdbId }, [
      m('.GameImport-cover', [
        game.cover_image_url
          ? m('img', { src: game.cover_image_url, alt: game.name })
          : m('.GameImport-noCover', m('i.fas.fa-gamepad')),
      ]),
      m('.GameImport-info', [
        m('strong', game.name),
        game.release_year ? m('span.GameImport-year', ' (' + game.release_year + ')') : null,
        game.developer    ? m('div', m('small', 'Dev: ' + game.developer)) : null,
      ]),
      m('.GameImport-action', [
        isImported
          ? m('span.GameImport-done', [m('i.fas.fa-check'), ' Imported'])
          : m('button.Button.Button--primary', {
              disabled: isImporting,
              onclick: () => this.importGame(game),
            }, isImporting ? [m('i.fas.fa-spinner.fa-spin'), ' Importing...'] : 'Import'),
      ]),
    ]);
  }

  search() {
    this.loading = true;
    this.results = [];
    m.redraw();

    app.request({
      method: 'GET',
      url: app.forum.attribute('apiUrl') + '/gamepedia/admin/igdb-search',
      params: { q: this.query },
    }).then((response) => {
      this.loading = false;
      this.error   = response.error || null;
      this.results = response.data  || [];
      m.redraw();
    }).catch((e) => {
      this.loading = false;
      this.error   = (e.response && e.response.json && e.response.json.error) || 'Search failed. Check your IGDB credentials.';
      m.redraw();
    });
  }

  importGame(game) {
    this.importing[game.igdb_id] = true;
    m.redraw();

    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/gamepedia/admin/import',
      body: { igdb_id: game.igdb_id },
    }).then((response) => {
      this.importing[game.igdb_id] = false;
      this.error = response.error || null;
      if (!response.error) {
        this.imported[game.igdb_id] = true;
      }
      m.redraw();
    }).catch((e) => {
      this.importing[game.igdb_id] = false;
      this.error = (e.response && e.response.json && e.response.json.error) || 'Import failed.';
      m.redraw();
    });
  }
}
