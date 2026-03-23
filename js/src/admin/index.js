import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Modal from 'flarum/common/components/Modal';

// ─── Add Game Modal ───────────────────────────────────────────────────────────

class AddGameModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.query       = '';
    this.results     = [];
    this.loading     = false;
    this.error       = null;
    this.adding      = {};
    this.added       = {};
    this.searchTimer = null;
  }

  className() {
    return 'AddGameModal Modal--large';
  }

  title() {
    return 'Add Game from IGDB';
  }

  content() {
    const m = window.m;
    return m('.Modal-body', [
      m('.Form-group', [
        m('input.FormControl', {
          type: 'text',
          placeholder: 'Search IGDB for a game...',
          value: this.query,
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

      this.loading && m('p.GameImport-loading', [
        m('i.fas.fa-spinner.fa-spin'), ' Searching IGDB...'
      ]),

      this.error && m('.Alert.Alert--error', { style: 'margin-bottom: 15px' }, this.error),

      this.results.length > 0
        ? m('.GameImport-results', this.results.map((game) => this.viewResult(game)))
        : !this.loading && this.query.length >= 2 && m('p.helpText', 'No results found. Try a different search term.'),
    ]);
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
      this.error   = (e.response && e.response.json && e.response.json.error)
                   || 'Search failed. Check your IGDB credentials in settings.';
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
        // Notify the page to refresh its game list
        if (this.attrs.onGameAdded) this.attrs.onGameAdded();
      }
      m.redraw();
    }).catch((e) => {
      this.adding[game.igdb_id] = false;
      this.error = (e.response && e.response.json && e.response.json.error)
                 || 'Failed to add game.';
      m.redraw();
    });
  }
}

// ─── Gamepedia Admin Page ─────────────────────────────────────────────────────

class GamepediaPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);
    this.games        = [];
    this.gamesLoading = true;
    this.gamesError   = null;
    this.deleting     = {};
    this.refreshing   = {};
    this.refreshingAll = false;
    this.loadGames();
  }

  loadGames() {
    const m = window.m;
    this.gamesLoading = true;

    app.request({
      method: 'GET',
      url: app.forum.attribute('apiUrl') + '/gamepedia/admin/games',
    }).then((response) => {
      this.gamesLoading = false;
      this.games        = response.data || [];
      m.redraw();
    }).catch(() => {
      this.gamesLoading = false;
      this.gamesError   = 'Failed to load game library.';
      m.redraw();
    });
  }

  content() {
    const m = window.m;
    return [
      // ── Settings ──────────────────────────────────────────────────────────
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

      // ── Game Library ──────────────────────────────────────────────────────
      m('.ExtensionPage-settings', [
        m('.container', [
          m('.GameLibrary-header', [
            m('h3', 'Game Library'),
            m('.GameLibrary-header-actions', [
              m('button.Button', {
                disabled: this.refreshingAll || this.games.length === 0,
                onclick:  () => this.refreshAll(),
              }, this.refreshingAll
                ? [m('i.fas.fa-spinner.fa-spin'), ' Refreshing All...']
                : [m('i.fas.fa-sync'), ' Refresh All']),
              m('button.Button.Button--primary', {
                onclick: () => app.modal.show(AddGameModal, {
                  onGameAdded: () => this.loadGames(),
                }),
              }, [m('i.fas.fa-plus'), ' Add Game']),
            ]),
          ]),

          this.gamesLoading && m('p', [m('i.fas.fa-spinner.fa-spin'), ' Loading...']),
          this.gamesError   && m('.Alert.Alert--error', this.gamesError),

          !this.gamesLoading && this.games.length === 0 && m('p.helpText', 'No games added yet. Click Add Game to get started.'),

          !this.gamesLoading && this.games.length > 0 && m('.GameLibrary-list',
            this.games.map((game) => this.viewGame(game))
          ),
        ]),
      ]),
    ];
  }

  viewGame(game) {
    const m          = window.m;
    const isDeleting  = !!this.deleting[game.id];
    const isRefreshing = !!this.refreshing[game.id];

    return m('.GameLibrary-item', { key: game.id }, [
      m('.GameLibrary-cover', [
        game.cover_image_url
          ? m('img', { src: game.cover_image_url, alt: game.name })
          : m('.GameLibrary-noCover', m('i.fas.fa-gamepad')),
      ]),
      m('.GameLibrary-info', [
        m('strong', game.name),
        game.release_year ? m('span.GameLibrary-year', ' (' + game.release_year + ')') : null,
        game.developer    ? m('div', m('small', 'Dev: ' + game.developer))             : null,
      ]),
      m('.GameLibrary-actions', [
        m('button.Button', {
          disabled: isRefreshing || isDeleting,
          onclick:  () => this.refreshGame(game),
          title:    'Re-fetch data from IGDB',
        }, isRefreshing ? [m('i.fas.fa-spinner.fa-spin'), ' Refreshing...'] : [m('i.fas.fa-sync'), ' Refresh']),
        m('button.Button.Button--danger', {
          disabled: isDeleting || isRefreshing,
          onclick:  () => this.deleteGame(game),
        }, isDeleting ? [m('i.fas.fa-spinner.fa-spin'), ' Deleting...'] : [m('i.fas.fa-trash'), ' Delete']),
      ]),
    ]);
  }

  refreshGame(game) {
    const m = window.m;
    this.refreshing[game.id] = true;
    m.redraw();

    app.request({
      method: 'POST',
      url:    app.forum.attribute('apiUrl') + '/gamepedia/admin/games/' + game.id + '/refresh',
    }).then((response) => {
      this.refreshing[game.id] = false;
      if (response.data) {
        // Update the game in our local list with fresh data
        const idx = this.games.findIndex((g) => g.id === game.id);
        if (idx > -1) Object.assign(this.games[idx], response.data);
      }
      app.alerts.show({ type: 'success' }, game.name + ' refreshed successfully.');
      m.redraw();
    }).catch(() => {
      this.refreshing[game.id] = false;
      app.alerts.show({ type: 'error' }, 'Failed to refresh ' + game.name + '.');
      m.redraw();
    });
  }

  refreshAll() {
    const m = window.m;
    if (!confirm('Refresh all ' + this.games.length + ' games from IGDB? This may take a while.')) return;

    this.refreshingAll = true;
    m.redraw();

    // Refresh games sequentially to avoid hammering the IGDB API
    const queue = [...this.games];
    const next  = () => {
      if (queue.length === 0) {
        this.refreshingAll = false;
        app.alerts.show({ type: 'success' }, 'All games refreshed successfully.');
        m.redraw();
        return;
      }

      const game = queue.shift();
      app.request({
        method: 'POST',
        url:    app.forum.attribute('apiUrl') + '/gamepedia/admin/games/' + game.id + '/refresh',
      }).then((response) => {
        if (response.data) {
          const idx = this.games.findIndex((g) => g.id === game.id);
          if (idx > -1) Object.assign(this.games[idx], response.data);
        }
        m.redraw();
        next();
      }).catch(() => {
        // Continue even if one fails
        m.redraw();
        next();
      });
    };

    next();
  }

  deleteGame(game) {
    const m = window.m;
    if (!confirm('Delete "' + game.name + '" from your Gamepedia? This cannot be undone.')) return;

    this.deleting[game.id] = true;
    m.redraw();

    app.request({
      method: 'DELETE',
      url: app.forum.attribute('apiUrl') + '/gamepedia/admin/games/' + game.id,
    }).then(() => {
      this.deleting[game.id] = false;
      this.games = this.games.filter((g) => g.id !== game.id);
      m.redraw();
    }).catch(() => {
      this.deleting[game.id] = false;
      app.alerts.show({ type: 'error' }, 'Failed to delete game.');
      m.redraw();
    });
  }

  saveSettings() {
    const m = window.m;
    const settings = {
      'gamepedia.igdb_client_id':           app.data.settings['gamepedia.igdb_client_id']           || '',
      'gamepedia.igdb_client_secret':       app.data.settings['gamepedia.igdb_client_secret']       || '',
      'gamepedia.max_games_per_discussion': app.data.settings['gamepedia.max_games_per_discussion'] || 3,
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
        allowGuest: true,
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
