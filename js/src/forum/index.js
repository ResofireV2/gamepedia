import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import LinkButton from 'flarum/common/components/LinkButton';
import Page from 'flarum/common/components/Page';
import Modal from 'flarum/common/components/Modal';
import TextEditor from 'flarum/common/components/TextEditor';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';
import ReplyComposer from 'flarum/forum/components/ReplyComposer';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import DiscussionHero from 'flarum/forum/components/DiscussionHero';
import SelectDropdown from 'flarum/common/components/SelectDropdown';
import listItems from 'flarum/common/helpers/listItems';

// ─── Simple Lightbox ──────────────────────────────────────────────────────────

function openLightbox(screenshots, startIndex) {
  const existing = document.getElementById('gp-lightbox');
  if (existing) existing.remove();

  let current = startIndex;

  const render = () => {
    const lb = document.getElementById('gp-lightbox');
    if (!lb) return;
    const img     = lb.querySelector('.gp-lb-img');
    const counter = lb.querySelector('.gp-lb-counter');
    if (img)     img.src         = screenshots[current].url;
    if (counter) counter.textContent = (current + 1) + ' / ' + screenshots.length;
    lb.querySelector('.gp-lb-prev').style.display = current > 0                      ? '' : 'none';
    lb.querySelector('.gp-lb-next').style.display = current < screenshots.length - 1 ? '' : 'none';
  };

  const lb = document.createElement('div');
  lb.id = 'gp-lightbox';
  lb.innerHTML = `
    <div class="gp-lb-backdrop"></div>
    <div class="gp-lb-content">
      <button class="gp-lb-close" aria-label="Close">✕</button>
      <button class="gp-lb-prev" aria-label="Previous">&#8249;</button>
      <img class="gp-lb-img" src="" alt="Screenshot" />
      <button class="gp-lb-next" aria-label="Next">&#8250;</button>
      <div class="gp-lb-counter"></div>
    </div>
  `;

  lb.querySelector('.gp-lb-backdrop').onclick = () => lb.remove();
  lb.querySelector('.gp-lb-close').onclick    = () => lb.remove();
  lb.querySelector('.gp-lb-prev').onclick     = () => { current--; render(); };
  lb.querySelector('.gp-lb-next').onclick     = () => { current++; render(); };

  document.addEventListener('keydown', function onKey(e) {
    if (!document.getElementById('gp-lightbox')) {
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (e.key === 'Escape')                                  lb.remove();
    if (e.key === 'ArrowLeft'  && current > 0)               { current--; render(); }
    if (e.key === 'ArrowRight' && current < screenshots.length - 1) { current++; render(); }
  });

  document.body.appendChild(lb);
  render();
}

// ─── Game Picker Modal ────────────────────────────────────────────────────────
// Searches locally-imported Gamepedia games (not IGDB) and returns selection.

class GamePickerModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.query       = '';
    this.results     = [];
    this.loading     = false;
    this.searchTimer = null;
  }

  className() { return 'GamePickerModal Modal--medium'; }
  title()     { return 'Link a Game'; }

  content() {
    const m = window.m;
    return m('.Modal-body', [
      m('.Form-group', [
        m('input.FormControl', {
          type:        'text',
          placeholder: 'Search your game library...',
          value:       this.query,
          oncreate:    (vnode) => vnode.dom.focus(),
          oninput:     (e) => {
            this.query = e.target.value;
            clearTimeout(this.searchTimer);
            if (this.query.length < 1) { this.results = []; m.redraw(); return; }
            this.searchTimer = setTimeout(() => this.search(), 300);
          },
        }),
      ]),

      this.loading && m('.GamePicker-loading', [m('i.fas.fa-spinner.fa-spin'), ' Searching...']),

      this.results.length > 0
        ? m('.GamePicker-results', this.results.map((game) => this.viewResult(game)))
        : !this.loading && this.query.length >= 1
          ? m('p.helpText', 'No games found.')
          : m('p.helpText', 'Start typing to search your game library.'),
    ]);
  }

  viewResult(game) {
    const m        = window.m;
    const selected = this.attrs.selected || [];
    const isLinked = selected.some((g) => g.id === game.id);

    return m('button.GamePicker-result' + (isLinked ? '.is-linked' : ''), {
      key:     game.id,
      onclick: (e) => {
        e.preventDefault();
        if (!isLinked) {
          this.attrs.onSelect(game);
          this.hide();
        }
      },
    }, [
      game.cover_image_url
        ? m('img.GamePicker-cover', { src: game.cover_image_url, alt: game.name })
        : m('.GamePicker-noCover', m('i.fas.fa-gamepad')),
      m('.GamePicker-info', [
        m('.GamePicker-name', game.name),
        game.release_year ? m('.GamePicker-year', game.release_year) : null,
      ]),
      isLinked ? m('.GamePicker-linked', m('i.fas.fa-check')) : null,
    ]);
  }

  search() {
    const m = window.m;
    this.loading = true;
    m.redraw();

    app.request({
      method: 'GET',
      url:    app.forum.attribute('apiUrl') + '/gamepedia/games',
      params: { search: this.query, page: 1 },
    }).then((response) => {
      this.loading = false;
      this.results = response.data || [];
      m.redraw();
    }).catch(() => {
      this.loading = false;
      this.results = [];
      m.redraw();
    });
  }
}

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
    this.sort        = window.m.route.param('sort')   || 'newest';
    this.bodyClass   = 'App--gamepedia';
    this.loadGames();
  }

  view() {
    const m = window.m;
    return m('.IndexPage.GamepediaPage', [
      m('header.Hero.GamepediaHero', [
        m('.container', [
          m('h1.Hero-title', [m('i.fas.fa-gamepad'), ' Gamepedia']),
          m('p.Hero-subtitle', 'Browse the game library'),
        ]),
      ]),
      m('.container', [
        m('.sideNavContainer', [
          m('nav.IndexPage-nav.sideNav', [
            m('ul', listItems(IndexPage.prototype.sidebarItems().toArray())),
          ]),
          m('.sideNavOffset', [this.viewContent()]),
        ]),
      ]),
    ]);
  }

  viewContent() {
    const m = window.m;
    return m('div', [
      m('.GamepediaFilters', [
        m('input.FormControl.GamepediaFilters-search', {
          type:        'text',
          placeholder: 'Search games...',
          value:       this.search,
          oninput:     (e) => {
            this.search = e.target.value;
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => this.loadGames(1), 400);
          },
        }),
        m('select.FormControl.GamepediaFilters-genre', {
          value:    this.genre,
          onchange: (e) => { this.genre = e.target.value; this.loadGames(1); },
        }, [
          m('option', { value: '' }, 'All Genres'),
          ...this.genres.map((g) => m('option', { value: g.slug, selected: this.genre === g.slug }, g.name)),
        ]),
        m('select.FormControl.GamepediaFilters-year', {
          value:    this.year,
          onchange: (e) => { this.year = e.target.value; this.loadGames(1); },
        }, [
          m('option', { value: '' }, 'All Years'),
          ...this.years.map((y) => m('option', { value: y, selected: this.year == y }, y)),
        ]),
        m('select.FormControl.GamepediaFilters-sort', {
          value:    this.sort,
          onchange: (e) => { this.sort = e.target.value; this.loadGames(1); },
        }, [
          m('option', { value: 'newest' }, 'Newest Added'),
          m('option', { value: 'oldest' }, 'Oldest Added'),
          m('option', { value: 'az' },     'A → Z'),
          m('option', { value: 'za' },     'Z → A'),
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
    ]);
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
    if (this.sort)   params.sort   = this.sort;

    app.request({
      method: 'GET',
      url:    app.forum.attribute('apiUrl') + '/gamepedia/games',
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
        game.release_year ? m('.GameCard-year', game.release_year) : null,
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
    this.loadGame(window.m.route.param('slug'));
  }

  loadGame(slug) {
    const m = window.m;
    app.request({
      method: 'GET',
      url:    app.forum.attribute('apiUrl') + '/gamepedia/games/' + slug,
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
      return m('.IndexPage.GameDetailPage', [
        m('.container', [
          m('.sideNavContainer', [
            m('nav.IndexPage-nav.sideNav', [m('ul', listItems(IndexPage.prototype.sidebarItems().toArray()))]),
            m('.sideNavOffset', m('.GameDetail-loading', [m('i.fas.fa-spinner.fa-spin'), ' Loading...'])),
          ]),
        ]),
      ]);
    }

    if (this.error || !this.game) {
      return m('.IndexPage.GameDetailPage', [
        m('.container', [
          m('.sideNavContainer', [
            m('nav.IndexPage-nav.sideNav', [m('ul', listItems(IndexPage.prototype.sidebarItems().toArray()))]),
            m('.sideNavOffset', [
              m('.Alert.Alert--error', this.error || 'Game not found.'),
              m('a.Button', { href: app.route('gamepedia'), oncreate: m.route.link }, [
                m('i.fas.fa-arrow-left'), ' Back to Gamepedia',
              ]),
            ]),
          ]),
        ]),
      ]);
    }

    const game = this.game;

    return m('.IndexPage.GameDetailPage', [

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
                game.release_date ? m('p.GameDetailHero-date', [m('i.fas.fa-calendar-alt'), ' ', game.release_date]) : null,
                game.developer    ? m('p.GameDetailHero-developer', [
                  m('i.fas.fa-code'), ' ', game.developer,
                  game.publisher && game.publisher !== game.developer ? [' / ', game.publisher] : null,
                ]) : null,
                game.genres && game.genres.length > 0 ? m('.GameDetailHero-genres',
                  game.genres.map((g) => m('a.GameDetailGenreTag', {
                    href:     app.route('gamepedia') + '?genre=' + g.slug,
                    oncreate: m.route.link,
                  }, g.name))
                ) : null,
                m('a.Button.Button--primary.GameDetailHero-back', {
                  href:     app.route('gamepedia'),
                  oncreate: m.route.link,
                }, [m('i.fas.fa-arrow-left'), ' Back to Gamepedia']),
              ]),
            ]),
          ]),
        ]),
      ]),

      m('.container', [
        m('.sideNavContainer', [
          m('nav.IndexPage-nav.sideNav', [m('ul', listItems(IndexPage.prototype.sidebarItems().toArray()))]),
          m('.sideNavOffset', [
            m('.GameDetailBody', [
              m('.GameDetailBody-main', [
                game.summary ? m('.GameDetailSection', [
                  m('h3.GameDetailSection-title', 'About'),
                  m('p.GameDetailSummary', game.summary),
                ]) : null,

                game.trailer_youtube_id ? m('.GameDetailSection', [
                  m('h3.GameDetailSection-title', 'Trailer'),
                  m('.GameDetailTrailer', [
                    m('iframe', {
                      src:             'https://www.youtube-nocookie.com/embed/' + game.trailer_youtube_id + '?rel=0',
                      title:           game.name + ' trailer',
                      allow:           'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
                      referrerpolicy:  'strict-origin-when-cross-origin',
                      allowfullscreen: true,
                      frameborder:     '0',
                    }),
                  ]),
                ]) : null,

                game.screenshots && game.screenshots.length > 0 ? m('.GameDetailSection', [
                  m('h3.GameDetailSection-title', 'Screenshots'),
                  m('.GameDetailScreenshots',
                    game.screenshots.map((s, idx) => m('a.GameDetailScreenshot', {
                      key:     s.id,
                      href:    '#',
                      onclick: (e) => { e.preventDefault(); openLightbox(game.screenshots, idx); },
                    }, [
                      m('img', { src: s.url, alt: game.name, loading: 'lazy' }),
                    ]))
                  ),
                ]) : null,
              ]),

              m('.GameDetailBody-sidebar', [
                m('.GameDetailInfoCard', [
                  m('h3.GameDetailInfoCard-title', 'Game Info'),
                  game.developer  ? m('.GameDetailInfoCard-row', [m('span.GameDetailInfoCard-label', 'Developer'), m('span.GameDetailInfoCard-value', game.developer)])  : null,
                  game.publisher  ? m('.GameDetailInfoCard-row', [m('span.GameDetailInfoCard-label', 'Publisher'), m('span.GameDetailInfoCard-value', game.publisher)])  : null,
                  game.release_date ? m('.GameDetailInfoCard-row', [m('span.GameDetailInfoCard-label', 'Released'),  m('span.GameDetailInfoCard-value', game.release_date)]) : null,
                  game.genres && game.genres.length > 0 ? m('.GameDetailInfoCard-row', [
                    m('span.GameDetailInfoCard-label', 'Genres'),
                    m('span.GameDetailInfoCard-value', game.genres.map((g) => g.name).join(', ')),
                  ]) : null,
                ]),

                m('.GameDetailSection', [
                  m('h3.GameDetailSection-title', 'Related Discussions'),
                  game.related_discussions && game.related_discussions.length > 0
                    ? m('.GameDetailDiscussions',
                        game.related_discussions.map((d) => m('a.GameDetailDiscussion', {
                          key:      d.id,
                          href:     app.route('discussion', { id: d.id + (d.slug ? '-' + d.slug : '') }),
                          oncreate: m.route.link,
                        }, [
                          m('.GameDetailDiscussion-title', d.title),
                          m('.GameDetailDiscussion-meta', [m('i.fas.fa-comment'), ' ', d.comment_count]),
                        ]))
                      )
                    : m('p.helpText', 'No discussions yet. Be the first to post about this game!'),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]);
  }
}

// ─── Composer Game Linking ────────────────────────────────────────────────────

// Helper to get/init the linked games list on a composer instance
function getLinkedGames(composer) {
  if (!composer.fields.gamepediaGames) {
    composer.fields.gamepediaGames = [];
  }
  return composer.fields.gamepediaGames;
}

function openGamePicker(composer) {
  const linked = getLinkedGames(composer);
  const max    = app.forum.attribute('gamepedia.maxGamesPerDiscussion') || 3;

  if (linked.length >= max) {
    app.alerts.show({ type: 'error' }, 'You can only link up to ' + max + ' game(s) per discussion.');
    return;
  }

  app.modal.show(GamePickerModal, {
    selected: linked,
    onSelect: (game) => {
      if (!linked.some((g) => g.id === game.id)) {
        linked.push(game);
        window.m.redraw();
      }
    },
  });
}

// Render linked game chips below the composer footer
function viewGameChips(composer) {
  const m      = window.m;
  const linked = getLinkedGames(composer);
  if (linked.length === 0) return null;

  return m('.GamepediaComposer-chips',
    linked.map((game) => m('.GamepediaComposer-chip', { key: game.id }, [
      game.cover_image_url
        ? m('img', { src: game.cover_image_url, alt: game.name })
        : m('i.fas.fa-gamepad'),
      m('span', game.name),
      m('button.GamepediaComposer-chip-remove', {
        title:   'Remove',
        onclick: () => {
          const idx = linked.indexOf(game);
          if (idx > -1) { linked.splice(idx, 1); m.redraw(); }
        },
      }, '✕'),
    ]))
  );
}

// ─── Initializer ─────────────────────────────────────────────────────────────

app.initializers.add('resofire-gamepedia', function () {
  // Forum routes
  app.routes['gamepedia']      = { path: '/gamepedia',       component: GamepediaPage };
  app.routes['gamepedia.game'] = { path: '/gamepedia/:slug', component: GameDetailPage };

  // Sidenav link — only show if actor can view Gamepedia
  extend(IndexPage.prototype, 'navItems', function (items) {
    if (!app.forum.attribute('gamepedia.canView') && !app.session.user?.isAdmin()) return;

    items.add('gamepedia', m(LinkButton, {
      href: app.route('gamepedia'),
      icon: 'fas fa-gamepad',
    }, 'Gamepedia'), 80);
  });

  // Ctrl+Shift+G keyboard shortcut to open game picker from composer
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      const composer = app.composer?.state;
      if (composer && composer.isVisible()) {
        if (!app.forum.attribute('gamepedia.canLinkGame') && !app.session.user?.isAdmin()) return;
        openGamePicker(composer);
      }
    }
  });

  // Game badges on discussion list items — DISABLED (Stage 12 decision: list badges off by default)
  // extend(DiscussionListItem.prototype, 'infoItems', ...)

  // Game badges on discussion hero (discussion page)
  extend(DiscussionHero.prototype, 'items', function (items) {
    const games = this.attrs.discussion.attribute('gamepediaGames');
    if (!games || games.length === 0) return;

    items.add('gamepediaGames', m('.GameBadges',
      games.map((game) => m('a.GameBadge', {
        key:      game.id,
        href:     app.route('gamepedia.game', { slug: game.slug }),
        title:    game.name,
        oncreate: m.route.link,
      }, [
        game.cover_image_url
          ? m('img.GameBadge-cover', { src: game.cover_image_url, alt: game.name })
          : m('i.fas.fa-gamepad'),
        m('span.GameBadge-name', game.name),
      ]))
    ), 5);
  });

  // Add gamepad button to the TextEditor toolbar — only if user can link games
  extend(TextEditor.prototype, 'toolbarItems', function (items) {
    const composer = this.attrs.composer;
    if (!composer) return;
    if (!app.forum.attribute('gamepedia.canLinkGame') && !app.session.user?.isAdmin()) return;

    items.add('gamepedia', m('button.Button.Button--icon.Button--link', {
      title:   'Link a game',
      onclick: () => openGamePicker(composer),
    }, m('i.fas.fa-gamepad')), -10);
  });

  // Inject game chips into DiscussionComposer footer
  extend(DiscussionComposer.prototype, 'headerItems', function (items) {
    if (!app.forum.attribute('gamepedia.canLinkGame') && !app.session.user?.isAdmin()) return;
    const chips = viewGameChips(this.composer);
    if (chips) items.add('gamepediaChips', chips, -100);
  });

  // Inject game chips into ReplyComposer footer
  extend(ReplyComposer.prototype, 'headerItems', function (items) {
    if (!app.forum.attribute('gamepedia.canLinkGame') && !app.session.user?.isAdmin()) return;
    const chips = viewGameChips(this.composer);
    if (chips) items.add('gamepediaChips', chips, -100);
  });

  // Send linked game IDs with discussion creation
  extend(DiscussionComposer.prototype, 'data', function (data) {
    const linked = getLinkedGames(this.composer);
    if (linked.length > 0) {
      data.gamepediaGameIds = linked.map((g) => g.id);
    }
  });

  // Send linked game IDs with reply creation
  extend(ReplyComposer.prototype, 'data', function (data) {
    const linked = getLinkedGames(this.composer);
    if (linked.length > 0) {
      data.gamepediaGameIds = linked.map((g) => g.id);
    }
  });
});
