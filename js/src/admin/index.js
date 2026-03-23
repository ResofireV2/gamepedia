import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';

// ─── Gamepedia Admin Page ─────────────────────────────────────────────────────
// Extends Flarum's ExtensionPage so we keep the standard header,
// enable/disable toggle, and permissions section, while adding our own
// Settings and Game Import sections.

class GamepediaPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);
    this.query       = '';
    this.results     = [];
    this.loading     = false;
    this.error       = null;
    this.adding      = {};   // igdb_id → true while adding
    this.added       = {};   // igdb_id → true when done
    this.searchTimer = null;
  }

  // Override content() to render our settings + import panel
  content() {
    const m = window.m;
    return [
      // ── Settings Section ────────────────────────────────────────────────
      m('.ExtensionPage-settings', [
        m('.container', [
          m('.Form', [
            m('.Form-group', [
              m('label', 'IGDB Client ID'),
              m('p.helpText', 'Your Twitch Developer application Client ID. Required for IGDB API access.'),
              m('input.FormControl', {
                type: 'text',
                value: app.data.settings['gamepedia.igdb_client_id'] || '',
                oninput: (e) => { app.data.settings['gamepedia.igdb_client_id'] = e.target.value; },
              }),
            ]),
            m('.Form-group', [
              m('label', 'IGDB Client Secret'),
              m('p.helpText', 'Your Twitch Developer application Client Secret. Keep this private.'),
              m('input.FormControl', {
                type: 'password',
                value: app.data.settings['gamepedia.igdb_client_secret'] || '',
                oninput: (e) => { app.data.settings['gamepedia.igdb_client_secret'] = e.target.value; },
              }),
            ]),
            m('.Form-group', [
              m('label', 'Max Games Per Discussion'),
              m('p.helpText', 'Maximum number of games a user can link to a single discussion. Default: 3.'),
              m('input.FormControl', {
                type: 'number',
                min: 1,
                max: 10,
                style: 'width: 80px',
                value: app.data.settings['gamepedia.max_games_per_discussion'] || 3,
                oninput: (e) => { app.data.settings['gamepedia.max_games_per_discussion'] = e.target.value; },
              }),
            ]),
            m('.Form-group', [
              m('button.Button.Button--primary', {
                onclick: () => this.saveSettings(),
              }, 'Save Settings'),
            ]),
          ]),
        ]),
      ]),

      // ── Game Import Section ──────────────────────────────────────────────
      m('.ExtensionPage-settings', [
        m('.container', [
          m('h3', 'Add Games from IGDB'),
          m('p.helpText', 'Search IGDB and click Add Game to import it into your Gamepedia.'),

          m('.Form-group', [
            m('input.FormControl', {
              type: 'text',
              placeholder: 'Search IGDB...',
              value: this.query,
              style: 'max-width: 400px',
              oninput: (e) => {
                this.query = e.target.value;
                this.error = null;
                clearTimeout(this.searchTimer);
                if (this.query.length < 2) {
                  this.results = [];
                  m.redraw();
                  return;
                }
                this.searchTimer = setTimeout(() => this.search(), 500);
              },
            }),
          ]),

          this.loading && m('p', [m('i.fas.fa-spinner.fa-spin'), ' Searching IGDB...']),

          this.error && m('.Alert.Alert--error', { style: 'margin-bottom: 15px' }, this.error),

          this.results.length > 0 && m('.GameImport-results',
            this.results.map((game) => this.viewResult(game))
          ),
        ]),
      ]),
    ];
  }

  viewResult(game) {
    const m        = window.m;
    const igdbId   = game.igdb_id;
    const isAdding = !!this.adding[igdbId];
    const isAdded  = !!this.added[igdbId];

    return m('.GameImport-result', { key: igdbId }, [
      m('.GameImport-cover', [
        game.cover_image_url
          ? m('img', { src: game.cover_image_url, alt: game.name })
          : m('.GameImport-noCover', m('i.fas.fa-gamepad')),
      ]),
      m('.GameImport-info', [
        m('strong', game.name),
        game.release_year ? m('span.GameImport-year', ' (' + game.release_year + ')') : null,
        game.developer    ? m('div', m('small', 'Dev: ' + game.developer))            : null,
      ]),
      m('.GameImport-action', [
        isAdded
          ? m('span.GameImport-done', [m('i.fas.fa-check'), ' Added'])
          : m('button.Button.Button--primary', {
              disabled: isAdding,
              onclick: () => this.addGame(game),
            }, isAdding ? [m('i.fas.fa-spinner.fa-spin'), ' Adding...'] : 'Add Game'),
      ]),
    ]);
  }

  saveSettings() {
    const m = window.m;
    const settings = {
      'gamepedia.igdb_client_id':             app.data.settings['gamepedia.igdb_client_id']             || '',
      'gamepedia.igdb_client_secret':          app.data.settings['gamepedia.igdb_client_secret']          || '',
      'gamepedia.max_games_per_discussion':    app.data.settings['gamepedia.max_games_per_discussion']    || 3,
    };

    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/settings',
      body: settings,
    }).then(() => {
      app.alerts.show({ type: 'success' }, 'Settings saved.');
      m.redraw();
    }).catch(() => {
      app.alerts.show({ type: 'error' }, 'Failed to save settings.');
      m.redraw();
    });
  }

  search() {
    const m = window.m;
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
      this.error   = (e.response && e.response.json && e.response.json.error) || 'Search failed. Check your IGDB credentials in settings above.';
      m.redraw();
    });
  }

  addGame(game) {
    const m = window.m;
    this.adding[game.igdb_id] = true;
    m.redraw();

    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/gamepedia/admin/import',
      body: { igdb_id: game.igdb_id },
    }).then((response) => {
      this.adding[game.igdb_id] = false;
      this.error = response.error || null;
      if (!response.error) {
        this.added[game.igdb_id] = true;
      }
      m.redraw();
    }).catch((e) => {
      this.adding[game.igdb_id] = false;
      this.error = (e.response && e.response.json && e.response.json.error) || 'Failed to add game.';
      m.redraw();
    });
  }
}

// ─── Initializer ─────────────────────────────────────────────────────────────

app.initializers.add('resofire-gamepedia', function () {
  app.extensionData
    .for('resofire-gamepedia')
    .registerPage(GamepediaPage)
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
