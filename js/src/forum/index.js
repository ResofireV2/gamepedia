import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import LinkButton from 'flarum/common/components/LinkButton';
import Page from 'flarum/common/components/Page';

// ─── Gamepedia Browse Page ────────────────────────────────────────────────────

class GamepediaPage extends Page {
  oninit(vnode) {
    super.oninit(vnode);
    this.games       = [];
    this.loading     = true;
    this.error       = null;
    this.currentPage = 1;
    this.totalPages  = 1;
    this.total       = 0;
    this.genres      = [];
    this.years       = [];
    this.search      = window.m.route.param('search') || '';
    this.genre       = window.m.route.param('genre')  || '';
    this.year        = window.m.route.param('year')   || '';
    this.bodyClass   = 'App--gamepedia';
    this.loadGames();
  }

  loadGames(page) {
    const m = window.m;
    this.loading     = true;
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
      this.games      = response.data           || [];
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

        this.loading && m('.GamepediaGrid-loading', [m('i.fas.fa-spinner.fa-spin'), ' Loading games...']),
        this.error   && m('.Alert.Alert--error', this.error),

        !this.loading && this.games.length === 0 && m('.GamepediaGrid-empty', 'No games found.'),
        !this.loading && this.games.length > 0   && m('.GamepediaGrid',
          this.games.map((game) => this.viewCard(game))
        ),

        !this.loading && this.totalPages > 1 && m('.GamepediaPagination', [
          this.currentPage > 1 && m('button.Button', {
            onclick: () => this.loadGames(this.currentPage - 1),
          }, [m('i.fas.fa-chevron-left'), ' Previous']),
          m('span.GamepediaPagination-info', 'Page ' + this.currentPage + ' of ' + this.totalPages),
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
      key:      game.id,
      href:     app.route('gamepedia.game', { slug: game.slug }),
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

// ─── Game Detail Page ─────────────────────────────────────────────────────────

class GameDetailPage extends Page {
  oninit(vnode) {
    super.oninit(vnode);
    this.game      = null;
    this.loading   = true;
    this.error     = null;
    this.bodyClass = 'App--gamepedia';

    const slug = window.m.route.param('slug');
    this.loadGame(slug);
  }

  loadGame(slug) {
    const m = window.m;

    app.request({
      method: 'GET',
      url: app.forum.attribute('apiUrl') + '/gamepedia/games/' + slug,
    }).then((response) => {
      this.loading = false;
      this.game    = response.data || null;
      m.redraw();
    }).catch(() => {
      this.loading = false;
      this.error   = 'Game not found.';
      m.redraw();
    });
  }

  view() {
    const m = window.m;

    if (this.loading) {
      return m('.GameDetailPage', [
        m('.container', m('.GameDetail-loading', [m('i.fas.fa-spinner.fa-spin'), ' Loading...'])),
      ]);
    }

    if (this.error || !this.game) {
      return m('.GameDetailPage', [
        m('.container', [
          m('.Alert.Alert--error', this.error || 'Game not found.'),
          m('a.Button', { href: app.route('gamepedia'), oncreate: m.route.link }, [
            m('i.fas.fa-arrow-left'), ' Back to Gamepedia',
          ]),
        ]),
      ]);
    }

    const game = this.game;

    return m('.GameDetailPage', [

      // ── Hero ────────────────────────────────────────────────────────────
      m('.GameDetailHero', {
        style: game.cover_image_url
          ? 'background-image: url(' + game.cover_image_url.replace('cover_big', '1080p') + ')'
          : '',
      }, [
        m('.GameDetailHero-overlay', [
          m('.container', [
            m('.GameDetailHero-content', [
              m('.GameDetailHero-cover', [
                game.cover_image_url
                  ? m('img', { src: game.cover_image_url, alt: game.name })
                  : m('.GameDetailHero-noCover', m('i.fas.fa-gamepad')),
              ]),
              m('.GameDetailHero-info', [
                m('h1.GameDetailHero-title', game.name),
                game.release_date && m('p.GameDetailHero-date', [
                  m('i.fas.fa-calendar-alt'), ' ', game.release_date,
                ]),
                game.developer && m('p.GameDetailHero-developer', [
                  m('i.fas.fa-code'), ' ', game.developer,
                  game.publisher && game.publisher !== game.developer
                    ? [' / ', game.publisher]
                    : null,
                ]),
                game.genres && game.genres.length > 0 && m('.GameDetailHero-genres',
                  game.genres.map((g) => m('a.GameDetailGenreTag', {
                    href:     app.route('gamepedia') + '?genre=' + g.slug,
                    oncreate: m.route.link,
                  }, g.name))
                ),
                m('a.Button.Button--primary.GameDetailHero-back', {
                  href:     app.route('gamepedia'),
                  oncreate: m.route.link,
                }, [m('i.fas.fa-arrow-left'), ' Back to Gamepedia']),
              ]),
            ]),
          ]),
        ]),
      ]),

      // ── Main content ────────────────────────────────────────────────────
      m('.container.GameDetailBody', [
        m('.GameDetailBody-main', [

          // Summary
          game.summary && m('.GameDetailSection', [
            m('h3.GameDetailSection-title', 'About'),
            m('p.GameDetailSummary', game.summary),
          ]),

          // Trailer
          game.trailer_youtube_id && m('.GameDetailSection', [
            m('h3.GameDetailSection-title', 'Trailer'),
            m('.GameDetailTrailer', [
              m('iframe', {
                src:             'https://www.youtube.com/embed/' + game.trailer_youtube_id,
                frameborder:     '0',
                allowfullscreen: true,
                allow:           'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
              }),
            ]),
          ]),

          // Screenshots
          game.screenshots && game.screenshots.length > 0 && m('.GameDetailSection', [
            m('h3.GameDetailSection-title', 'Screenshots'),
            m('.GameDetailScreenshots',
              game.screenshots.map((s) => m('a.GameDetailScreenshot', {
                href:            s.url,
                'data-fancybox': 'screenshots',
                key:             s.id,
              }, [
                m('img', { src: s.url, alt: game.name, loading: 'lazy' }),
              ]))
            ),
          ]),
        ]),

        // ── Sidebar ───────────────────────────────────────────────────────
        m('.GameDetailBody-sidebar', [

          // Game info card
          m('.GameDetailInfoCard', [
            m('h3.GameDetailInfoCard-title', 'Game Info'),
            game.developer && m('.GameDetailInfoCard-row', [
              m('span.GameDetailInfoCard-label', 'Developer'),
              m('span.GameDetailInfoCard-value', game.developer),
            ]),
            game.publisher && m('.GameDetailInfoCard-row', [
              m('span.GameDetailInfoCard-label', 'Publisher'),
              m('span.GameDetailInfoCard-value', game.publisher),
            ]),
            game.release_date && m('.GameDetailInfoCard-row', [
              m('span.GameDetailInfoCard-label', 'Released'),
              m('span.GameDetailInfoCard-value', game.release_date),
            ]),
            game.genres && game.genres.length > 0 && m('.GameDetailInfoCard-row', [
              m('span.GameDetailInfoCard-label', 'Genres'),
              m('span.GameDetailInfoCard-value', game.genres.map((g) => g.name).join(', ')),
            ]),
          ]),

          // Related discussions
          m('.GameDetailSection', [
            m('h3.GameDetailSection-title', 'Related Discussions'),
            game.related_discussions && game.related_discussions.length > 0
              ? m('.GameDetailDiscussions',
                  game.related_discussions.map((d) => m('a.GameDetailDiscussion', {
                    key:      d.id,
                    href:     app.route('discussion', { id: d.slug || d.id }),
                    oncreate: m.route.link,
                  }, [
                    m('.GameDetailDiscussion-title', d.title),
                    m('.GameDetailDiscussion-meta', [
                      m('i.fas.fa-comment'), ' ', d.comment_count,
                    ]),
                  ]))
                )
              : m('p.helpText', 'No discussions yet. Be the first to post about this game!'),
          ]),
        ]),
      ]),
    ]);
  }
}

// ─── Initializer ─────────────────────────────────────────────────────────────

app.initializers.add('resofire-gamepedia', function () {
  app.routes['gamepedia']      = { path: '/gamepedia',       component: GamepediaPage };
  app.routes['gamepedia.game'] = { path: '/gamepedia/:slug', component: GameDetailPage };

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
