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

  className() { return 'AddGameModal Modal--large'; }
  title()     { return 'Add Game from IGDB'; }

  content() {
    const m = window.m;
    return m('.Modal-body', [
      m('.Form-group', [
        m('input.FormControl', {
          type:        'text',
          placeholder: 'Search IGDB for a game...',
          value:       this.query,
          oncreate:    (vnode) => vnode.dom.focus(),
          oninput:     (e) => {
            this.query = e.target.value;
            this.error = null;
            clearTimeout(this.searchTimer);
            if (this.query.length < 2) { this.results = []; m.redraw(); return; }
            this.searchTimer = setTimeout(() => this.search(), 500);
          },
        }),
      ]),
      this.loading && m('p.GameImport-loading', [m('i.fas.fa-spinner.fa-spin'), ' Searching IGDB...']),
      this.error   && m('.Alert.Alert--error', { style: 'margin-bottom: 15px' }, this.error),
      this.results.length > 0
        ? m('.GameImport-results', this.results.map((game) => this.viewResult(game)))
        : !this.loading && this.query.length >= 2 && m('p.helpText', 'No results found.'),
    ]);
  }

  viewResult(game) {
    const m        = window.m;
    const igdbId   = game.igdb_id;
    const isAdding = !!this.adding[igdbId];
    const isAdded  = !!this.added[igdbId];
    return m('.GameImport-result', { key: igdbId }, [
      m('.GameImport-cover', [
        game.cover_image_url ? m('img', { src: game.cover_image_url, alt: game.name }) : m('.GameImport-noCover', m('i.fas.fa-gamepad')),
      ]),
      m('.GameImport-info', [
        m('strong', game.name),
        game.release_year ? m('span.GameImport-year', ' (' + game.release_year + ')') : null,
        game.developer    ? m('div', m('small', 'Dev: ' + game.developer)) : null,
      ]),
      m('.GameImport-action', [
        isAdded
          ? m('span.GameImport-done', [m('i.fas.fa-check'), ' Added'])
          : m('button.Button.Button--primary', {
              type:     'button',
              disabled: isAdding,
              onclick:  () => this.addGame(game),
            }, isAdding ? [m('i.fas.fa-spinner.fa-spin'), ' Adding...'] : 'Add Game'),
      ]),
    ]);
  }

  search() {
    const m = window.m;
    this.loading = true; this.results = []; m.redraw();
    app.request({ method: 'GET', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/igdb-search', params: { q: this.query } })
      .then((r) => { this.loading = false; this.error = r.error || null; this.results = r.data || []; m.redraw(); })
      .catch((e) => { this.loading = false; this.error = (e.response?.json?.error) || 'Search failed.'; m.redraw(); });
  }

  addGame(game) {
    const m = window.m;
    this.adding[game.igdb_id] = true; m.redraw();
    app.request({ method: 'POST', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/import', body: { igdb_id: game.igdb_id } })
      .then((r) => {
        this.adding[game.igdb_id] = false;
        this.error = r.error || null;
        if (!r.error) {
          this.added[game.igdb_id] = true;
          if (this.attrs.onGameAdded) this.attrs.onGameAdded();
          app.modal.show(EditGameGenresModal, {
            game:          r.data,
            currentGenres: [],
            onSaved:       () => { if (this.attrs.onGameAdded) this.attrs.onGameAdded(); },
          });
        }
        m.redraw();
      })
      .catch((e) => { this.adding[game.igdb_id] = false; this.error = (e.response?.json?.error) || 'Failed to add game.'; m.redraw(); });
  }
}

// ─── Edit Genre Modal ─────────────────────────────────────────────────────────

class EditGenreModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.name   = this.attrs.genre.name;
    this.saving = false;
    this.error  = null;
  }

  className() { return 'EditGenreModal Modal--small'; }
  title()     { return 'Rename Genre'; }

  content() {
    const m = window.m;
    return m('.Modal-body', [
      this.error && m('.Alert.Alert--error', { style: 'margin-bottom: 15px' }, this.error),
      m('.Form-group', [
        m('label', 'Genre Name'),
        m('input.FormControl', {
          type:      'text',
          value:     this.name,
          oncreate:  (vnode) => { vnode.dom.focus(); vnode.dom.select(); },
          oninput:   (e) => { this.name = e.target.value; },
          onkeydown: (e) => { if (e.key === 'Enter') this.save(); },
        }),
      ]),
      m('.Form-group', [
        m('button.Button.Button--primary', {
          type:     'button',
          disabled: this.saving || !this.name.trim(),
          onclick:  () => this.save(),
        }, this.saving ? [m('i.fas.fa-spinner.fa-spin'), ' Saving...'] : 'Save'),
      ]),
    ]);
  }

  save() {
    const m = window.m;
    if (!this.name.trim()) return;
    this.saving = true; m.redraw();
    app.request({
      method: 'POST',
      url:    app.forum.attribute('apiUrl') + '/gamepedia/admin/genres/' + this.attrs.genre.id,
      body:   { name: this.name.trim() },
    }).then((r) => {
      this.saving = false;
      if (r.error) { this.error = r.error; m.redraw(); return; }
      if (this.attrs.onSaved) this.attrs.onSaved(r.data);
      this.hide();
    }).catch((e) => {
      this.saving = false;
      this.error  = (e.response?.json?.error) || 'Failed to save.';
      m.redraw();
    });
  }
}

// ─── Edit Game Genres Modal ───────────────────────────────────────────────────

class EditGameGenresModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.game      = this.attrs.game;
    this.allGenres = [];
    this.selected  = new Set((this.attrs.currentGenres || []).map((g) => g.id));
    this.loading   = true;
    this.saving    = false;
    this.loadGenres();
  }

  className() { return 'EditGameGenresModal Modal--medium'; }
  title()     { return 'Edit Genres — ' + this.game.name; }

  loadGenres() {
    const m = window.m;
    app.request({ method: 'GET', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/genres' })
      .then((r) => { this.loading = false; this.allGenres = r.data || []; m.redraw(); })
      .catch(() => { this.loading = false; m.redraw(); });
  }

  content() {
    const m = window.m;
    if (this.loading) return m('.Modal-body', m('p', [m('i.fas.fa-spinner.fa-spin'), ' Loading...']));

    return m('.Modal-body', [
      m('p.helpText', 'Select the genres for this game.'),
      m('.GenreCheckboxList',
        this.allGenres.map((genre) => m('label.GenreCheckbox', { key: genre.id }, [
          m('input', {
            type:     'checkbox',
            checked:  this.selected.has(genre.id),
            onchange: (e) => {
              if (e.target.checked) this.selected.add(genre.id);
              else this.selected.delete(genre.id);
            },
          }),
          ' ', genre.name,
          m('span.GenreCheckbox-count', ' (' + genre.game_count + ')'),
        ]))
      ),
      m('.Form-group', { style: 'margin-top: 15px' }, [
        m('button.Button.Button--primary', {
          type:     'button',
          disabled: this.saving,
          onclick:  () => this.save(),
        }, this.saving ? [m('i.fas.fa-spinner.fa-spin'), ' Saving...'] : 'Save Genres'),
      ]),
    ]);
  }

  save() {
    const m = window.m;
    this.saving = true; m.redraw();
    app.request({
      method: 'POST',
      url:    app.forum.attribute('apiUrl') + '/gamepedia/admin/games/' + this.game.id + '/genres',
      body:   { genre_ids: Array.from(this.selected) },
    }).then(() => {
      this.saving = false;
      if (this.attrs.onSaved) this.attrs.onSaved(Array.from(this.selected));
      app.alerts.show({ type: 'success' }, 'Genres updated.');
      this.hide();
    }).catch(() => {
      this.saving = false;
      app.alerts.show({ type: 'error' }, 'Failed to update genres.');
      m.redraw();
    });
  }
}

// ─── Gamepedia Admin Page ─────────────────────────────────────────────────────

class GamepediaPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);
    // Games tab state
    this.games         = [];
    this.gamesLoading  = true;
    this.gamesError    = null;
    this.currentPage   = 1;
    this.hasMore       = false;
    this.totalGames    = 0;
    this.search        = '';
    this.genre         = '';
    this.year          = '';
    this.sort          = 'newest';
    this.filterGenres  = [];
    this.filterYears   = [];
    this.deleting      = {};
    this.refreshing    = {};
    this.refreshingAll = false;
    this.searchTimer   = null;
    // Genres tab state
    this.genres        = [];
    this.genresLoading = true;
    this.newGenreName  = '';
    this.creatingGenre = false;
    // Active tab
    this.activeTab     = 'games';
    this.loadGames(1);
    this.loadGenres();
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  loadGames(page, append) {
    const m = window.m;
    this.gamesLoading = true;
    if (!append) this.games = [];
    m.redraw();

    const params = { page: page || 1, sort: this.sort };
    if (this.search) params.search = this.search;
    if (this.genre)  params.genre  = this.genre;
    if (this.year)   params.year   = this.year;

    app.request({ method: 'GET', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/games', params })
      .then((r) => {
        this.gamesLoading = false;
        this.games        = append ? [...this.games, ...(r.data || [])] : (r.data || []);
        this.currentPage  = r.meta.current_page;
        this.hasMore      = r.meta.has_more;
        this.totalGames   = r.meta.total;
        this.filterGenres = r.filters.genres || [];
        this.filterYears  = r.filters.years  || [];
        m.redraw();
      })
      .catch(() => { this.gamesLoading = false; this.gamesError = 'Failed to load games.'; m.redraw(); });
  }

  loadMore() {
    this.loadGames(this.currentPage + 1, true);
  }

  loadGenres() {
    const m = window.m;
    this.genresLoading = true;
    app.request({ method: 'GET', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/genres' })
      .then((r) => { this.genresLoading = false; this.genres = r.data || []; m.redraw(); })
      .catch(() => { this.genresLoading = false; m.redraw(); });
  }

  // ── Main content ─────────────────────────────────────────────────────────────

  content() {
    const m = window.m;
    return [
      m('.ExtensionPage-settings', [
        m('.container', [

          // Tab bar
          m('.GamepediaTabs', [
            m('button.GamepediaTab' + (this.activeTab === 'games'   ? '.is-active' : ''), {
              onclick: () => { this.activeTab = 'games';   m.redraw(); },
            }, [m('i.fas.fa-gamepad'), ' Games']),
            m('button.GamepediaTab' + (this.activeTab === 'genres'  ? '.is-active' : ''), {
              onclick: () => { this.activeTab = 'genres';  m.redraw(); },
            }, [m('i.fas.fa-tags'), ' Genres']),
            m('button.GamepediaTab' + (this.activeTab === 'settings'? '.is-active' : ''), {
              onclick: () => { this.activeTab = 'settings'; m.redraw(); },
            }, [m('i.fas.fa-cog'), ' Settings']),
          ]),

          // ── Games tab ──────────────────────────────────────────────────────
          this.activeTab === 'games' && m('.GamepediaTabContent', [
            // Toolbar
            m('.AdminGames-toolbar', [
              m('.AdminGames-filters', [
                m('input.FormControl', {
                  type:        'text',
                  placeholder: 'Search games...',
                  value:       this.search,
                  oninput:     (e) => {
                    this.search = e.target.value;
                    clearTimeout(this.searchTimer);
                    this.searchTimer = setTimeout(() => this.loadGames(1), 400);
                  },
                }),
                m('select.FormControl', {
                  value:    this.genre,
                  onchange: (e) => { this.genre = e.target.value; this.loadGames(1); },
                }, [
                  m('option', { value: '' }, 'All Genres'),
                  ...this.filterGenres.map((g) => m('option', { value: g.slug, selected: this.genre === g.slug }, g.name)),
                ]),
                m('select.FormControl', {
                  value:    this.year,
                  onchange: (e) => { this.year = e.target.value; this.loadGames(1); },
                }, [
                  m('option', { value: '' }, 'All Years'),
                  ...this.filterYears.map((y) => m('option', { value: y, selected: this.year == y }, y)),
                ]),
                m('select.FormControl', {
                  value:    this.sort,
                  onchange: (e) => { this.sort = e.target.value; this.loadGames(1); },
                }, [
                  m('option', { value: 'newest' }, 'Newest Added'),
                  m('option', { value: 'oldest' }, 'Oldest Added'),
                  m('option', { value: 'az'     }, 'A → Z'),
                  m('option', { value: 'za'     }, 'Z → A'),
                ]),
              ]),
              m('.AdminGames-actions', [
                m('button.Button', {
                  disabled: this.refreshingAll || this.games.length === 0,
                  onclick:  () => this.refreshAll(),
                }, this.refreshingAll ? [m('i.fas.fa-spinner.fa-spin'), ' Refreshing...'] : [m('i.fas.fa-sync'), ' Refresh All']),
                m('button.Button.Button--primary', {
                  onclick: () => app.modal.show(AddGameModal, { onGameAdded: () => this.loadGames(1) }),
                }, [m('i.fas.fa-plus'), ' Add Game']),
              ]),
            ]),

            // Game count
            !this.gamesLoading && m('p.AdminGames-count', this.totalGames + ' game' + (this.totalGames !== 1 ? 's' : '')),

            // Grid
            this.gamesLoading && this.games.length === 0 && m('p', [m('i.fas.fa-spinner.fa-spin'), ' Loading...']),
            this.gamesError && m('.Alert.Alert--error', this.gamesError),
            !this.gamesLoading && this.games.length === 0 && m('p.helpText', 'No games found.'),

            this.games.length > 0 && m('.AdminGameGrid',
              this.games.map((game) => this.viewGameCard(game))
            ),

            // Load More
            this.hasMore && m('.AdminGames-loadMore', [
              m('button.Button', {
                disabled: this.gamesLoading,
                onclick:  () => this.loadMore(),
              }, this.gamesLoading ? [m('i.fas.fa-spinner.fa-spin'), ' Loading...'] : 'Load More'),
            ]),
          ]),

          // ── Genres tab ─────────────────────────────────────────────────────
          this.activeTab === 'genres' && m('.GamepediaTabContent', [
            m('h3', { style: 'margin-bottom: 12px' }, 'Genres (' + this.genres.length + ')'),
            m('.GenreCreate', [
              m('input.FormControl', {
                type:        'text',
                placeholder: 'New genre name...',
                value:       this.newGenreName || '',
                oninput:     (e) => { this.newGenreName = e.target.value; },
                onkeydown:   (e) => { if (e.key === 'Enter') this.createGenre(); },
              }),
              m('button.Button.Button--primary', {
                type:     'button',
                disabled: !this.newGenreName || this.creatingGenre,
                onclick:  () => this.createGenre(),
              }, this.creatingGenre ? [m('i.fas.fa-spinner.fa-spin'), ' Adding...'] : [m('i.fas.fa-plus'), ' Add Genre']),
            ]),
            this.genresLoading && m('p', [m('i.fas.fa-spinner.fa-spin'), ' Loading...']),
            !this.genresLoading && this.genres.length === 0 && m('p.helpText', 'No genres yet. Add one above.'),
            !this.genresLoading && this.genres.length > 0 && m('.GenreList',
              this.genres.map((genre) => this.viewGenre(genre))
            ),
          ]),

          // ── Settings tab ───────────────────────────────────────────────────
          this.activeTab === 'settings' && m('.GamepediaTabContent', [
            m('.Form', [
              m('.Form-group', [
                m('label', 'Gamepedia Subtitle'),
                m('p.helpText', 'Displayed below "Gamepedia" on the browse page. Leave blank to hide.'),
                m('input.FormControl', {
                  type:    'text',
                  value:   app.data.settings['gamepedia.subtitle'] || '',
                  oninput: (e) => { app.data.settings['gamepedia.subtitle'] = e.target.value; },
                }),
              ]),
              m('.Form-group', [
                m('label', 'IGDB Client ID'),
                m('p.helpText', 'Your Twitch Developer application Client ID.'),
                m('input.FormControl', {
                  type:    'text',
                  value:   app.data.settings['gamepedia.igdb_client_id'] || '',
                  oninput: (e) => { app.data.settings['gamepedia.igdb_client_id'] = e.target.value; },
                }),
              ]),
              m('.Form-group', [
                m('label', 'IGDB Client Secret'),
                m('p.helpText', 'Your Twitch Developer application Client Secret. Keep this private.'),
                m('input.FormControl', {
                  type:    'password',
                  value:   app.data.settings['gamepedia.igdb_client_secret'] || '',
                  oninput: (e) => { app.data.settings['gamepedia.igdb_client_secret'] = e.target.value; },
                }),
              ]),
              m('.Form-group', [
                m('label', 'Max Games Per Discussion'),
                m('p.helpText', 'Maximum number of games a user can link to a discussion. Default: 3.'),
                m('input.FormControl', {
                  type:    'number',
                  min:     1, max: 10,
                  style:   'width: 80px',
                  value:   app.data.settings['gamepedia.max_games_per_discussion'] || 3,
                  oninput: (e) => { app.data.settings['gamepedia.max_games_per_discussion'] = e.target.value; },
                }),
              ]),
              m('.Form-group', [
                m('button.Button.Button--primary', {
                  type:    'button',
                  onclick: () => this.saveSettings(),
                }, 'Save Settings'),
              ]),
            ]),
          ]),

        ]),
      ]),
    ];
  }

  // ── Game card ─────────────────────────────────────────────────────────────────

  viewGameCard(game) {
    const m           = window.m;
    const isDeleting  = !!this.deleting[game.id];
    const isRefreshing = !!this.refreshing[game.id];

    return m('.AdminGameCard', { key: game.id }, [
      m('.AdminGameCard-cover', [
        game.cover_image_url
          ? m('img', { src: game.cover_image_url, alt: game.name })
          : m('.AdminGameCard-noCover', m('i.fas.fa-gamepad')),
      ]),
      m('.AdminGameCard-info', [
        m('.AdminGameCard-name', game.name),
        game.release_year ? m('.AdminGameCard-year', game.release_year) : null,
      ]),
      m('.AdminGameCard-actions', [
        m('button.AdminGameCard-btn', {
          type:     'button',
          title:    'Edit genres',
          disabled: isDeleting || isRefreshing,
          onclick:  () => this.openGameGenresModal(game),
        }, m('i.fas.fa-tags')),
        m('button.AdminGameCard-btn', {
          type:     'button',
          title:    'Refresh from IGDB',
          disabled: isDeleting || isRefreshing,
          onclick:  () => this.refreshGame(game),
        }, isRefreshing ? m('i.fas.fa-spinner.fa-spin') : m('i.fas.fa-sync')),
        m('button.AdminGameCard-btn.AdminGameCard-btn--danger', {
          type:     'button',
          title:    'Delete game',
          disabled: isDeleting || isRefreshing,
          onclick:  () => this.deleteGame(game),
        }, isDeleting ? m('i.fas.fa-spinner.fa-spin') : m('i.fas.fa-trash')),
      ]),
    ]);
  }

  // ── Genre row ─────────────────────────────────────────────────────────────────

  viewGenre(genre) {
    const m          = window.m;
    const isDeleting = !!this.deleting['genre_' + genre.id];

    return m('.GenreList-item', { key: genre.id }, [
      m('.GenreList-info', [
        m('strong', genre.name),
        m('span.GenreList-count', genre.game_count + ' game' + (genre.game_count !== 1 ? 's' : '')),
      ]),
      m('.GenreList-actions', [
        m('button.Button', {
          onclick: () => app.modal.show(EditGenreModal, {
            genre:   genre,
            onSaved: (data) => {
              const idx = this.genres.findIndex((g) => g.id === genre.id);
              if (idx > -1) Object.assign(this.genres[idx], data);
              window.m.redraw();
            },
          }),
        }, [m('i.fas.fa-pencil-alt'), ' Rename']),
        m('button.Button.Button--danger', {
          disabled: isDeleting,
          onclick:  () => this.deleteGenre(genre),
        }, isDeleting ? [m('i.fas.fa-spinner.fa-spin'), ' Deleting...'] : [m('i.fas.fa-trash'), ' Delete']),
      ]),
    ]);
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  openGameGenresModal(game) {
    app.modal.show(EditGameGenresModal, {
      game:          game,
      currentGenres: game.genres || [],
      onSaved:       () => { /* genres updated */ },
    });
  }

  createGenre() {
    const m    = window.m;
    const name = (this.newGenreName || '').trim();
    if (!name) return;
    this.creatingGenre = true; m.redraw();
    app.request({ method: 'POST', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/genres', body: { name } })
      .then((r) => {
        this.creatingGenre = false;
        if (r.error) { app.alerts.show({ type: 'error' }, r.error); m.redraw(); return; }
        this.genres.push(r.data);
        this.genres.sort((a, b) => a.name.localeCompare(b.name));
        this.newGenreName = '';
        m.redraw();
      })
      .catch((e) => { this.creatingGenre = false; app.alerts.show({ type: 'error' }, e.response?.json?.error || 'Failed to create genre.'); m.redraw(); });
  }

  refreshGame(game) {
    const m = window.m;
    this.refreshing[game.id] = true; m.redraw();
    app.request({ method: 'POST', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/games/' + game.id + '/refresh' })
      .then((r) => {
        this.refreshing[game.id] = false;
        if (r.data) { const idx = this.games.findIndex((g) => g.id === game.id); if (idx > -1) Object.assign(this.games[idx], r.data); }
        app.alerts.show({ type: 'success' }, game.name + ' refreshed.');
        m.redraw();
      })
      .catch(() => { this.refreshing[game.id] = false; app.alerts.show({ type: 'error' }, 'Failed to refresh ' + game.name + '.'); m.redraw(); });
  }

  refreshAll() {
    const m = window.m;
    if (!confirm('Refresh all ' + this.totalGames + ' games from IGDB? This may take a while.')) return;
    this.refreshingAll = true; m.redraw();
    // Build a full list first then queue
    const loadAll = (page, acc) => {
      app.request({ method: 'GET', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/games', params: { page, sort: 'newest' } })
        .then((r) => {
          const all = [...acc, ...(r.data || [])];
          if (r.meta.has_more) { loadAll(page + 1, all); return; }
          const queue = all;
          const next = () => {
            if (queue.length === 0) { this.refreshingAll = false; app.alerts.show({ type: 'success' }, 'All games refreshed.' ); m.redraw(); return; }
            const game = queue.shift();
            app.request({ method: 'POST', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/games/' + game.id + '/refresh' })
              .then(() => { m.redraw(); next(); }).catch(() => { m.redraw(); next(); });
          };
          next();
        });
    };
    loadAll(1, []);
  }

  deleteGame(game) {
    const m = window.m;
    if (!confirm('Delete "' + game.name + '" from your Gamepedia? This cannot be undone.')) return;
    this.deleting[game.id] = true; m.redraw();
    app.request({ method: 'DELETE', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/games/' + game.id })
      .then(() => { this.deleting[game.id] = false; this.games = this.games.filter((g) => g.id !== game.id); this.totalGames--; m.redraw(); })
      .catch(() => { this.deleting[game.id] = false; app.alerts.show({ type: 'error' }, 'Failed to delete game.'); m.redraw(); });
  }

  deleteGenre(genre) {
    const m = window.m;
    if (!confirm('Delete the genre "' + genre.name + '"? It will be removed from all games.')) return;
    this.deleting['genre_' + genre.id] = true; m.redraw();
    app.request({ method: 'DELETE', url: app.forum.attribute('apiUrl') + '/gamepedia/admin/genres/' + genre.id })
      .then(() => { this.deleting['genre_' + genre.id] = false; this.genres = this.genres.filter((g) => g.id !== genre.id); m.redraw(); })
      .catch(() => { this.deleting['genre_' + genre.id] = false; app.alerts.show({ type: 'error' }, 'Failed to delete genre.' ); m.redraw(); });
  }

  saveSettings() {
    const m = window.m;
    app.request({
      method: 'POST',
      url:    app.forum.attribute('apiUrl') + '/settings',
      body:   {
        'gamepedia.subtitle':                 app.data.settings['gamepedia.subtitle']                 || '',
        'gamepedia.igdb_client_id':           app.data.settings['gamepedia.igdb_client_id']           || '',
        'gamepedia.igdb_client_secret':       app.data.settings['gamepedia.igdb_client_secret']       || '',
        'gamepedia.max_games_per_discussion': app.data.settings['gamepedia.max_games_per_discussion'] || 3,
      },
    }).then(() => { app.alerts.show({ type: 'success' }, 'Settings saved.'); m.redraw(); })
      .catch(() => { app.alerts.show({ type: 'error' }, 'Failed to save settings.'); m.redraw(); });
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
        label:      'Browse Gamepedia and view game pages',
        icon:       'fas fa-gamepad',
        allowGuest: true,
      },
      'view'
    )
    .registerPermission(
      {
        permission: 'gamepedia.linkGame',
        label:      'Link games to discussions',
        icon:       'fas fa-link',
      },
      'start'
    );
});
