import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import LinkButton from 'flarum/common/components/LinkButton';
import Page from 'flarum/common/components/Page';

// ─── Gamepedia Browse Page ────────────────────────────────────────────────────

class GamepediaPage extends Page {
  oninit(vnode) {
    super.oninit(vnode);
    this.games        = [];
    this.loading      = true;
    this.error        = null;
    this.currentPage  = 1;
    this.totalPages   = 1;
    this.total        = 0;
    this.genres       = [];
    this.years        = [];

    // Filter state
    this.search = m.route.param('search') || '';
    this.genre  = m.route.param('genre')  || '';
    this.year   = m.route.param('year')   || '';

    this.bodyClass = 'App--gamepedia';
    this.loadGames();
  }

  loadGames(page) {
    const m = window.m;
    this.loading = true;
    this.currentPage = page || parseInt(m.route.param('page')) || 1;
    m.redraw();

    const params = { page: this.currentPage };
    if (this.search) params.search = this.search;
    if (this.genre)  params.genre  = this.genre;
    if (this.year)   params.year   = this.year;

    app.request({
      method: 'GET',
      url: app.forum.attribute('apiUrl') + '/gamepedia/games',
      params,
    }).then((response) => {
      this.loading    = false;
      this.games      = response.data    || [];
      this.totalPages = response.meta.last_page || 1;
      this.total      = response.meta.total     || 0;
      this.genres     = response.filters.genres || [];
      this.years      = response.filters.years  || [];
      m.redraw();
    }).catch(() => {
      this.loading = false;
      this.error   = 'Failed to load games.';
      m.redraw();
    });
  }

  view() {
    const m = window.m;
    return m('.GamepediaPage', [
      m('.hero.GamepediaHero', [
        m('.container', [
          m('h2.GamepediaHero-title', [m('i.fas.fa-gamepad'), ' Gamepedia']),
          m('p.GamepediaHero-subtitle', 'Browse the game library'),
        ]),
      ]),
      m('.container', [
        // Filters bar
        m('.GamepediaFilters', [
          m('input.FormControl.GamepediaFilters-search', {
            type: 'text',
            placeholder: 'Search games...',
            value: this.search,
            oninput: (e) => {
              this.search = e.target.value;
              clearTimeout(this.searchTimer);
              this.searchTimer = setTimeout(() => this.loadGames(1), 400);
            },
          }),
          m('select.FormControl.GamepediaFilters-genre', {
            value: this.genre,
            onchange: (e) => { this.genre = e.target.value; this.loadGames(1); },
          }, [
            m('option', { value: '' }, 'All Genres'),
            ...this.genres.map((g) => m('option', { value: g.slug, selected: this.genre === g.slug }, g.name)),
          ]),
          m('select.FormControl.GamepediaFilters-year', {
            value: this.year,
            onchange: (e) => { this.year = e.target.value; this.loadGames(1); },
          }, [
            m('option', { value: '' }, 'All Years'),
            ...this.years.map((y) => m('option', { value: y, selected: this.year == y }, y)),
          ]),
        ]),

        // Loading / error
        this.loading && m('.GamepediaGrid-loading', [m('i.fas.fa-spinner.fa-spin'), ' Loading games...']),
        this.error   && m('.Alert.Alert--error', this.error),

        // Game grid
        !this.loading && this.games.length === 0 && m('.GamepediaGrid-empty', 'No games found.'),
        !this.loading && this.games.length > 0 && m('.GamepediaGrid',
          this.games.map((game) => this.viewCard(game))
        ),

        // Pagination
        !this.loading && this.totalPages > 1 && m('.GamepediaPagination', [
          this.currentPage > 1 && m('button.Button', {
            onclick: () => this.loadGames(this.currentPage - 1),
          }, [m('i.fas.fa-chevron-left'), ' Previous']),
          m('span.GamepediaPagination-info',
            'Page ' + this.currentPage + ' of ' + this.totalPages
          ),
          this.currentPage < this.totalPages && m('button.Button', {
            onclick: () => this.loadGames(this.currentPage + 1),
          }, ['Next ', m('i.fas.fa-chevron-right')]),
        ]),
      ]),
    ]);
  }

  viewCard(game) {
    const m = window.m;
    return m('a.GameCard', {
      key:  game.id,
      href: app.route('gamepedia.game', { slug: game.slug }),
      oncreate: m.route.link,
    }, [
      m('.GameCard-cover', [
        game.cover_image_url
          ? m('img', { src: game.cover_image_url, alt: game.name, loading: 'lazy' })
          : m('.GameCard-noCover', m('i.fas.fa-gamepad')),
      ]),
      m('.GameCard-info', [
        m('.GameCard-title', game.name),
        game.release_year && m('.GameCard-year', game.release_year),
      ]),
    ]);
  }
}

// ─── Initializer ─────────────────────────────────────────────────────────────

app.initializers.add('resofire-gamepedia', function () {
  // Register forum routes
  app.routes['gamepedia']      = { path: '/gamepedia',       component: GamepediaPage };
  app.routes['gamepedia.game'] = { path: '/gamepedia/:slug', component: GamepediaPage };

  // Add sidenav link to IndexPage
  extend(IndexPage.prototype, 'navItems', function (items) {
    items.add(
      'gamepedia',
      m(LinkButton, {
        href: app.route('gamepedia'),
        icon: 'fas fa-gamepad',
      }, 'Gamepedia'),
      80
    );
  });
});
