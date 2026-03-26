"use strict";

const app              = flarum.reg.get("core", "forum/app");
const { extend: extendUtil, override: overrideUtil } = flarum.reg.get("core", "common/extend");
const Modal            = flarum.reg.get("core", "common/components/Modal");
const Page             = flarum.reg.get("core", "common/components/Page");
const LinkButton       = flarum.reg.get("core", "common/components/LinkButton");
const PageStructure    = flarum.reg.get("core", "forum/components/PageStructure");
const IndexSidebar     = flarum.reg.get("core", "forum/components/IndexSidebar");
const IndexPage        = flarum.reg.get("core", "forum/components/IndexPage");
// Chunk modules — string-path only:
// flarum/forum/components/DiscussionPage
// flarum/forum/components/TextEditor
// flarum/forum/components/DiscussionComposer

// ---------------------------------------------------------------------------
// Simple Lightbox
// ---------------------------------------------------------------------------
function openLightbox(screenshots, startIndex) {
  const existing = document.getElementById("gp-lightbox");
  if (existing) existing.remove();

  let current = startIndex;

  const render = () => {
    const lb = document.getElementById("gp-lightbox");
    if (!lb) return;
    const img     = lb.querySelector(".gp-lb-img");
    const counter = lb.querySelector(".gp-lb-counter");
    if (img)     img.src            = screenshots[current].url;
    if (counter) counter.textContent = (current + 1) + " / " + screenshots.length;
    lb.querySelector(".gp-lb-prev").style.display = current > 0                      ? "" : "none";
    lb.querySelector(".gp-lb-next").style.display = current < screenshots.length - 1 ? "" : "none";
  };

  const lb = document.createElement("div");
  lb.id = "gp-lightbox";
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

  lb.querySelector(".gp-lb-backdrop").onclick = () => lb.remove();
  lb.querySelector(".gp-lb-close").onclick    = () => lb.remove();
  lb.querySelector(".gp-lb-prev").onclick     = () => { current--; render(); };
  lb.querySelector(".gp-lb-next").onclick     = () => { current++; render(); };

  document.addEventListener("keydown", function onKey(e) {
    if (!document.getElementById("gp-lightbox")) {
      document.removeEventListener("keydown", onKey);
      return;
    }
    if (e.key === "Escape")                                           lb.remove();
    if (e.key === "ArrowLeft"  && current > 0)                        { current--; render(); }
    if (e.key === "ArrowRight" && current < screenshots.length - 1)   { current++; render(); }
  });

  document.body.appendChild(lb);
  render();
}

// ---------------------------------------------------------------------------
// GamePickerModal
// ---------------------------------------------------------------------------
class GamePickerModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.query       = "";
    this.results     = [];
    this.loading     = false;
    this.searchTimer = null;
  }

  className() { return "GamePickerModal Modal--medium"; }
  title()     { return "Link a Game"; }

  content() {
    return m(".Modal-body", [
      m(".Form-group", [
        m("input.FormControl", {
          type:        "text",
          placeholder: "Search your game library...",
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
      this.loading && m(".GamePicker-loading", [m("i.fas.fa-spinner.fa-spin"), " Searching..."]),
      this.results.length > 0
        ? m(".GamePicker-results", this.results.map((game) => this.viewResult(game)))
        : !this.loading && this.query.length >= 1
          ? m("p.helpText", "No games found.")
          : m("p.helpText", "Start typing to search your game library."),
    ]);
  }

  viewResult(game) {
    const selected = this.attrs.selected || [];
    const isLinked = selected.some((g) => g.id === game.id);

    return m("button.GamePicker-result" + (isLinked ? ".is-linked" : ""), {
      key:     game.id,
      onclick: (e) => {
        e.preventDefault();
        if (!isLinked) { this.attrs.onSelect(game); this.hide(); }
      },
    }, [
      game.cover_image_url
        ? m("img.GamePicker-cover", { src: game.cover_image_url, alt: game.name })
        : m(".GamePicker-noCover", m("i.fas.fa-gamepad")),
      m(".GamePicker-info", [
        m(".GamePicker-name", game.name),
        game.release_year ? m(".GamePicker-year", game.release_year) : null,
      ]),
      isLinked ? m(".GamePicker-linked", m("i.fas.fa-check")) : null,
    ]);
  }

  search() {
    this.loading = true; m.redraw();
    app.request({
      method: "GET",
      url:    app.forum.attribute("apiUrl") + "/gamepedia/games",
      params: { search: this.query, page: 1 },
    }).then((r) => { this.loading = false; this.results = r.data || []; m.redraw(); })
      .catch(() => { this.loading = false; this.results = []; m.redraw(); });
  }
}

// ---------------------------------------------------------------------------
// GamepediaPage — uses PageStructure + IndexSidebar (2.x pattern)
// ---------------------------------------------------------------------------
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
    this.search      = m.route.param("search") || "";
    this.genre       = m.route.param("genre")  || "";
    this.year        = m.route.param("year")   || "";
    this.sort        = m.route.param("sort")   || "newest";
    this.bodyClass   = "App--gamepedia";
    this.loadGames();
  }

  view() {
    return m(PageStructure, {
      className: "GamepediaPage",
      hero:      () => m("header.Hero.GamepediaHero", [
        m(".container", [
          m("h1.Hero-title", [m("i.fas.fa-gamepad"), " Gamepedia"]),
          app.forum.attribute("gamepediaSubtitle")
            ? m("p.Hero-subtitle", app.forum.attribute("gamepediaSubtitle"))
            : null,
        ]),
      ]),
      sidebar: () => m(IndexSidebar),
    }, this.viewContent());
  }

  viewContent() {
    return m("div", [
      m(".GamepediaFilters", [
        m("input.FormControl.GamepediaFilters-search", {
          type:        "text",
          placeholder: "Search games...",
          value:       this.search,
          oninput:     (e) => {
            this.search = e.target.value;
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => this.loadGames(1), 400);
          },
        }),
        m("select.FormControl.GamepediaFilters-genre", {
          value:    this.genre,
          onchange: (e) => { this.genre = e.target.value; this.loadGames(1); },
        }, [
          m("option", { value: "" }, "All Genres"),
          ...this.genres.map((g) => m("option", { value: g.slug, selected: this.genre === g.slug }, g.name)),
        ]),
        m("select.FormControl.GamepediaFilters-year", {
          value:    this.year,
          onchange: (e) => { this.year = e.target.value; this.loadGames(1); },
        }, [
          m("option", { value: "" }, "All Years"),
          ...this.years.map((y) => m("option", { value: y, selected: this.year == y }, y)),
        ]),
        m("select.FormControl.GamepediaFilters-sort", {
          value:    this.sort,
          onchange: (e) => { this.sort = e.target.value; this.loadGames(1); },
        }, [
          m("option", { value: "newest" }, "Newest Added"),
          m("option", { value: "oldest" }, "Oldest Added"),
          m("option", { value: "az"     }, "A → Z"),
          m("option", { value: "za"     }, "Z → A"),
        ]),
      ]),

      this.loading && m(".GamepediaGrid-loading", [m("i.fas.fa-spinner.fa-spin"), " Loading games..."]),
      this.error   && m(".Alert.Alert--error", this.error),
      !this.loading && this.games.length === 0 && m(".GamepediaGrid-empty", "No games found."),
      !this.loading && this.games.length > 0   && m(".GamepediaGrid", this.games.map((game) => this.viewCard(game))),

      !this.loading && this.totalPages > 1 && m(".GamepediaPagination", [
        this.currentPage > 1 && m("button.Button", {
          onclick: () => this.loadGames(this.currentPage - 1),
        }, [m("i.fas.fa-chevron-left"), " Previous"]),
        m("span.GamepediaPagination-info", "Page " + this.currentPage + " of " + this.totalPages),
        this.currentPage < this.totalPages && m("button.Button", {
          onclick: () => this.loadGames(this.currentPage + 1),
        }, ["Next ", m("i.fas.fa-chevron-right")]),
      ]),
    ]);
  }

  loadGames(page) {
    this.loading     = true;
    this.currentPage = page || parseInt(m.route.param("page")) || 1;
    m.redraw();

    const params = { page: this.currentPage };
    if (this.search) params.search = this.search;
    if (this.genre)  params.genre  = this.genre;
    if (this.year)   params.year   = this.year;
    if (this.sort)   params.sort   = this.sort;

    app.request({
      method: "GET",
      url:    app.forum.attribute("apiUrl") + "/gamepedia/games",
      params,
    }).then((r) => {
      this.loading    = false;
      this.games      = r.data           || [];
      this.totalPages = r.meta.last_page || 1;
      this.total      = r.meta.total     || 0;
      this.genres     = r.filters.genres || [];
      this.years      = r.filters.years  || [];
      m.redraw();
    }).catch(() => {
      this.loading = false;
      this.error   = "Failed to load games.";
      m.redraw();
    });
  }

  viewCard(game) {
    return m("a.GameCard", {
      key:      game.id,
      href:     app.route("gamepedia.game", { slug: game.slug }),
      oncreate: m.route.link,
    }, [
      m(".GameCard-cover", [
        game.cover_image_url
          ? m("img", { src: game.cover_image_url, alt: game.name, loading: "lazy" })
          : m(".GameCard-noCover", m("i.fas.fa-gamepad")),
      ]),
      m(".GameCard-info", [
        m(".GameCard-title", game.name),
        game.release_year ? m(".GameCard-year", game.release_year) : null,
      ]),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Award badge SVG — always gold/blue, generated from { year, title }
// ---------------------------------------------------------------------------

function awardBadgeSvg(award) {
  // Split title into up to 3 lines for centering in the circle
  const words    = award.title.toUpperCase().split(' ');
  const lines    = [];
  let   current  = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (candidate.length > 10 && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  // Center vertically in the circle (baseline around y=56)
  const lineHeight = 9;
  const startY     = 54 - ((lines.length - 1) * lineHeight) / 2;

  const textLines = lines.map((line, i) =>
    `<text x="50" y="${startY + i * lineHeight}" text-anchor="middle" fill="#FFD700"
      font-family="Arial,sans-serif" font-size="8" font-weight="bold">${line}</text>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
    <!-- Outer gold ring -->
    <circle cx="50" cy="50" r="48" fill="#B8860B"/>
    <!-- Mid gold ring -->
    <circle cx="50" cy="50" r="44" fill="#FFD700"/>
    <!-- Inner gold ring -->
    <circle cx="50" cy="50" r="40" fill="#B8860B"/>
    <!-- Blue face -->
    <circle cx="50" cy="50" r="36" fill="#1a3a6e"/>
    <!-- Dotted inner border -->
    <circle cx="50" cy="50" r="33" fill="none" stroke="#FFD700" stroke-width="0.8"
      stroke-dasharray="2,2"/>
    <!-- Year at top -->
    <text x="50" y="26" text-anchor="middle" fill="#FFD700"
      font-family="Arial,sans-serif" font-size="9" font-weight="bold">${award.year}</text>
    <!-- Award title lines -->
    ${textLines}
  </svg>`;
}

function renderAwardBadges(awards) {
  if (!awards || awards.length === 0) return null;
  const display = awards.slice(0, 3);
  return m('.GameDetailAwards',
    display.map((award) => m('.GameDetailAward', {
      key:   award.id,
      title: award.year + ' — ' + award.title,
    }, m.trust(awardBadgeSvg(award))))
  );
}

// ---------------------------------------------------------------------------
// GameDetailPage — uses PageStructure + IndexSidebar (2.x pattern)
// ---------------------------------------------------------------------------
class GameDetailPage extends Page {
  oninit(vnode) {
    super.oninit(vnode);
    this.game      = null;
    this.loading   = true;
    this.error     = null;
    this.bodyClass = "App--gamepedia";
    this.loadGame(m.route.param("slug"));
  }

  loadGame(slug) {
    app.request({
      method: "GET",
      url:    app.forum.attribute("apiUrl") + "/gamepedia/games/" + slug,
    }).then((r) => {
      this.loading = false;
      this.game    = r.data || null;
      m.redraw();
    }).catch(() => {
      this.loading = false;
      this.error   = "Game not found.";
      m.redraw();
    });
  }

  view() {
    if (this.loading) {
      return m(PageStructure, { className: "GameDetailPage", sidebar: () => m(IndexSidebar) },
        m(".GameDetail-loading", [m("i.fas.fa-spinner.fa-spin"), " Loading..."])
      );
    }

    if (this.error || !this.game) {
      return m(PageStructure, { className: "GameDetailPage", sidebar: () => m(IndexSidebar) }, [
        m(".Alert.Alert--error", this.error || "Game not found."),
        m("a.Button", { href: app.route("gamepedia"), oncreate: m.route.link }, [
          m("i.fas.fa-arrow-left"), " Back to Gamepedia",
        ]),
      ]);
    }

    const game = this.game;

    return m(PageStructure, {
      className: "GameDetailPage",
      hero: () => m(".GameDetailHero", {
        style: game.cover_image_url
          ? "background-image: url(" + game.cover_image_url.replace("cover_big", "1080p") + ")"
          : "",
      }, [
        m(".GameDetailHero-overlay", [
          m(".container", [
            m(".GameDetailHero-content", [
              m(".GameDetailHero-cover", [
                game.cover_image_url
                  ? m("img", { src: game.cover_image_url, alt: game.name })
                  : m(".GameDetailHero-noCover", m("i.fas.fa-gamepad")),
              ]),
              m(".GameDetailHero-info", [
                m("h1.GameDetailHero-title", game.name),
                game.release_date ? m("p.GameDetailHero-date", [m("i.fas.fa-calendar-alt"), " ", game.release_date]) : null,
                game.developer ? m("p.GameDetailHero-developer", [
                  m("i.fas.fa-code"), " ", game.developer,
                  game.publisher && game.publisher !== game.developer ? [" / ", game.publisher] : null,
                ]) : null,
                game.genres && game.genres.length > 0 ? m(".GameDetailHero-genres",
                  game.genres.map((g) => m("a.GameDetailGenreTag", {
                    href:     app.route("gamepedia") + "?genre=" + g.slug,
                    oncreate: m.route.link,
                  }, g.name))
                ) : null,
                m("a.Button.Button--primary.GameDetailHero-back", {
                  href:     app.route("gamepedia"),
                  oncreate: m.route.link,
                }, [m("i.fas.fa-arrow-left"), " Back to Gamepedia"]),
              ]),
              // Award badges — desktop only (hidden on mobile via CSS)
              game.awards && game.awards.length > 0
                ? m(".GameDetailHero-awards", renderAwardBadges(game.awards))
                : null,
            ]),
          ]),
        ]),
      ]),
      sidebar: () => m(IndexSidebar),
    },
      m(".GameDetailBody", [

        // Award badges — mobile only (hidden on desktop via CSS)
        game.awards && game.awards.length > 0
          ? m(".GameDetailAwards-mobile", renderAwardBadges(game.awards))
          : null,

        game.trailer_youtube_id ? m(".GameDetailSection", [
          m("h3.GameDetailSection-title", "Trailer"),
          m(".GameDetailTrailer", [
            m("iframe", {
              src:             "https://www.youtube-nocookie.com/embed/" + game.trailer_youtube_id + "?rel=0",
              title:           game.name + " trailer",
              allow:           "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              referrerpolicy:  "strict-origin-when-cross-origin",
              allowfullscreen: true,
              frameborder:     "0",
            }),
          ]),
        ]) : null,

        m(".GameDetailMid", [
          game.summary ? m(".GameDetailSection.GameDetailMid-about", [
            m("h3.GameDetailSection-title", "About"),
            m("p.GameDetailSummary", game.summary),
          ]) : null,
          m(".GameDetailInfoCard", [
            m("h3.GameDetailInfoCard-title", "Game Info"),
            game.developer    ? m(".GameDetailInfoCard-row", [m("span.GameDetailInfoCard-label", "Developer"), m("span.GameDetailInfoCard-value", game.developer)])    : null,
            game.publisher    ? m(".GameDetailInfoCard-row", [m("span.GameDetailInfoCard-label", "Publisher"), m("span.GameDetailInfoCard-value", game.publisher)])    : null,
            game.release_date ? m(".GameDetailInfoCard-row", [m("span.GameDetailInfoCard-label", "Released"),  m("span.GameDetailInfoCard-value", game.release_date)]) : null,
            game.genres && game.genres.length > 0 ? m(".GameDetailInfoCard-row", [
              m("span.GameDetailInfoCard-label", "Genres"),
              m("span.GameDetailInfoCard-value", game.genres.map((g) => g.name).join(", ")),
            ]) : null,
          ]),
        ]),

        m(".GameDetailSection", [
          m("h3.GameDetailSection-title", "Related Discussions"),
          game.related_discussions && game.related_discussions.length > 0
            ? m(".GameDetailDiscussions",
                game.related_discussions.map((d) => m("a.GameDetailDiscussion", {
                  key:      d.id,
                  href:     app.route("discussion", { id: d.id + (d.slug ? "-" + d.slug : "") }),
                  oncreate: m.route.link,
                }, [
                  d.user_avatar
                    ? m("img.GameDetailDiscussion-avatar", { src: d.user_avatar, alt: d.user_username || "" })
                    : m(".GameDetailDiscussion-avatarFallback", m("i.fas.fa-user")),
                  m(".GameDetailDiscussion-body", [
                    m(".GameDetailDiscussion-title", d.title),
                    m(".GameDetailDiscussion-meta", [m("i.fas.fa-comment"), " ", d.comment_count]),
                  ]),
                ]))
              )
            : m("p.helpText", "No discussions yet. Be the first to post about this game!"),
        ]),

        game.screenshots && game.screenshots.length > 0 ? m(".GameDetailSection", [
          m("h3.GameDetailSection-title", "Screenshots"),
          m(".GameDetailScreenshots",
            game.screenshots.map((s, idx) => m("a.GameDetailScreenshot", {
              key:     s.id,
              href:    "#",
              onclick: (e) => { e.preventDefault(); openLightbox(game.screenshots, idx); },
            }, [
              m("img", { src: s.url, alt: game.name, loading: "lazy" }),
            ]))
          ),
        ]) : null,

      ])
    );
  }
}

// ---------------------------------------------------------------------------
// Composer helpers
// ---------------------------------------------------------------------------
function getLinkedGames(composer) {
  if (!composer.fields.gamepediaGames) composer.fields.gamepediaGames = [];
  return composer.fields.gamepediaGames;
}

function openGamePicker(composer) {
  const linked = getLinkedGames(composer);
  const max    = app.forum.attribute("gamepediaMaxGamesPerDiscussion") || 3;
  if (linked.length >= max) {
    app.alerts.show({ type: "error" }, "You can only link up to " + max + " game(s) per discussion.");
    return;
  }
  app.modal.show(GamePickerModal, {
    selected: linked,
    onSelect: (game) => {
      if (!linked.some((g) => g.id === game.id)) { linked.push(game); m.redraw(); }
    },
  });
}

function viewGameChips(composer) {
  const linked = getLinkedGames(composer);
  if (linked.length === 0) return null;
  return m(".GamepediaComposer-chips",
    linked.map((game) => m(".GamepediaComposer-chip", { key: game.id }, [
      game.cover_image_url
        ? m("img", { src: game.cover_image_url, alt: game.name })
        : m("i.fas.fa-gamepad"),
      m("span", game.name),
      m("button.GamepediaComposer-chip-remove", {
        title:   "Remove",
        onclick: () => {
          const idx = linked.indexOf(game);
          if (idx > -1) { linked.splice(idx, 1); m.redraw(); }
        },
      }, "✕"),
    ]))
  );
}

// ---------------------------------------------------------------------------
// GameCardSlideshow — desktop sidebar
// ---------------------------------------------------------------------------
class GameCardSlideshow {
  oninit(vnode) { this.games = vnode.attrs.games; this.current = 0; this.rafId = null; this.barEl = null; }
  oncreate()    { if (this.games.length > 1) this.startCycle(); }
  onremove()    { if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } }

  getDuration() { return (parseInt(app.forum.attribute("gamepediaSlideshowInterval")) || 4) * 1000; }

  startCycle() {
    const duration = this.getDuration();
    let start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      if (this.barEl) this.barEl.style.width = pct + "%";
      if (elapsed >= duration) { this.current = (this.current + 1) % this.games.length; start = performance.now(); m.redraw(); }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  view() {
    const game = this.games[this.current];
    return m("a.DiscussionGameCard", { href: app.route("gamepedia.game", { slug: game.slug }), oncreate: m.route.link }, [
      m(".DiscussionGameCard-cover", [
        game.cover_image_url
          ? m("img", { src: game.cover_image_url, alt: game.name })
          : m(".DiscussionGameCard-noCover", m("i.fas.fa-gamepad")),
      ]),
      m(".DiscussionGameCard-info", [
        m(".DiscussionGameCard-name", game.name),
        game.release_year ? m(".DiscussionGameCard-year", game.release_year) : null,
      ]),
      this.games.length > 1 && m(".DiscussionGameCard-progress", [
        m(".DiscussionGameCard-progress-bar", {
          oncreate: (vnode) => { this.barEl = vnode.dom; this.barEl.style.width = "0%"; },
          onupdate: (vnode) => { this.barEl = vnode.dom; },
        }),
      ]),
    ]);
  }
}

// ---------------------------------------------------------------------------
// GameBannerSlideshow — mobile
// ---------------------------------------------------------------------------
class GameBannerSlideshow {
  oninit(vnode) { this.games = vnode.attrs.games; this.current = 0; this.rafId = null; this.barEl = null; }
  oncreate()    { if (this.games.length > 1) this.startCycle(); }
  onremove()    { if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } }

  getDuration() { return (parseInt(app.forum.attribute("gamepediaSlideshowInterval")) || 4) * 1000; }

  startCycle() {
    const duration = this.getDuration();
    let start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      if (this.barEl) this.barEl.style.width = pct + "%";
      if (elapsed >= duration) { this.current = (this.current + 1) % this.games.length; start = performance.now(); m.redraw(); }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  view() {
    const game = this.games[this.current];
    return m("a.GameBanner", {
      href:     app.route("gamepedia.game", { slug: game.slug }),
      oncreate: m.route.link,
      style:    game.cover_image_url ? { backgroundImage: "url(" + game.cover_image_url + ")" } : {},
    }, [
      m(".GameBanner-overlay", [
        game.cover_image_url && m(".GameBanner-thumb", [m("img", { src: game.cover_image_url, alt: game.name })]),
        m(".GameBanner-info", [
          m(".GameBanner-name", game.name),
          game.release_year ? m(".GameBanner-year", game.release_year) : null,
        ]),
      ]),
      this.games.length > 1 && m(".GameBanner-progress", [
        m(".GameBanner-progress-bar", {
          oncreate: (vnode) => { this.barEl = vnode.dom; this.barEl.style.width = "0%"; },
          onupdate: (vnode) => { this.barEl = vnode.dom; },
        }),
      ]),
    ]);
  }
}

// ---------------------------------------------------------------------------
// extend export — routes MUST be registered here via extenders.Routes(),
// not via app.routes[] in the initializer (router is already mounted by then)
// ---------------------------------------------------------------------------
const extenders = flarum.reg.get("core", "common/extenders");

export const extend = [
  new extenders.Routes()
    .add("gamepedia",      "/gamepedia",       GamepediaPage)
    .add("gamepedia.game", "/gamepedia/:slug",  GameDetailPage),
];

// ---------------------------------------------------------------------------
// Initializer
// ---------------------------------------------------------------------------
app.initializers.add("resofire-gamepedia", function () {

  // Sidenav link — extend IndexSidebar.navItems (2.x pattern)
  extendUtil(IndexSidebar.prototype, "navItems", function (items) {
    if (!app.forum.attribute("gamepediaCanView") && !app.session.user?.isAdmin()) return;
    items.add("gamepedia", m(LinkButton, {
      href: app.route("gamepedia"),
      icon: "fas fa-gamepad",
    }, "Gamepedia"), 80);
  });

  // Keyboard shortcut Ctrl+Shift+G
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "G") {
      e.preventDefault();
      if (!app.composer || !app.composer.isVisible()) return;
      if (!app.forum.attribute("gamepediaCanLinkGame") && !app.session.user?.isAdmin()) return;
      if (!app.composer.bodyMatches("flarum/forum/components/DiscussionComposer")) return;
      openGamePicker(app.composer);
    }
  });

  // Game cards in discussion sidebar (desktop) — string-path for chunk module
  extendUtil("flarum/forum/components/DiscussionPage", "sidebarItems", function (items) {
    const discussion = this.discussion;
    if (!discussion) return;
    const games = discussion.attribute("gamepediaGames");
    if (!games || games.length === 0) return;
    items.add("gamepediaGames", m(GameCardSlideshow, { games }), 50);
  });

  // Mobile banner — injected after the discussion hero, before the post stream.
  // Must use override (not extend) because extend discards the callback return value.
  overrideUtil("flarum/forum/components/DiscussionPage", "hero", function (original) {
    const discussion = this.discussion;
    const games = discussion && discussion.attribute("gamepediaGames");
    if (!games || games.length === 0) return original();
    return m("div", [
      original(),
      m(GameBannerSlideshow, { games }),
    ]);
  });

  // Gamepad toolbar button — TextEditor is in common (not a chunk), get it directly
  const TextEditor = flarum.reg.get("core", "common/components/TextEditor");
  extendUtil(TextEditor.prototype, "toolbarItems", function (items) {
    if (!app.forum.attribute("gamepediaCanLinkGame") && !app.session.user?.isAdmin()) return;
    if (!app.composer.bodyMatches("flarum/forum/components/DiscussionComposer")) return;
    items.add("gamepedia", m("button.Button.Button--icon.Button--link", {
      title:   "Link a game",
      onclick: () => openGamePicker(app.composer),
    }, m("i.fas.fa-gamepad")), -10);
  });

  // Game chips in composer header — string-path for chunk module DiscussionComposer
  extendUtil("flarum/forum/components/DiscussionComposer", "headerItems", function (items) {
    if (!app.forum.attribute("gamepediaCanLinkGame") && !app.session.user?.isAdmin()) return;
    const chips = viewGameChips(this.composer);
    if (chips) items.add("gamepediaChips", chips, -100);
  });

  // Override DiscussionComposer.onsubmit to link games after discussion creation.
  // We cannot send gamepediaGameIds as a JSON:API attribute because
  // flarum/json-api-server's assertFieldsValid rejects unknown attributes.
  // Instead we let discussion creation succeed normally, then call our
  // dedicated POST /api/gamepedia/discussions/{id}/games route.
  overrideUtil("flarum/forum/components/DiscussionComposer", "onsubmit", function (original) {
    const linked = getLinkedGames(this.composer);

    if (linked.length === 0) {
      original();
      return;
    }

    const gameIds     = linked.map((g) => g.id);
    const origSave    = app.store.createRecord.bind(app.store);

    app.store.createRecord = function (type, data) {
      app.store.createRecord = origSave;
      const record = origSave(type, data);

      if (type === "discussions") {
        const origRecordSave = record.save.bind(record);
        record.save = function (saveData) {
          return origRecordSave(saveData).then(function (discussion) {
            // Discussion created — now link games via our dedicated route
            return app.request({
              method: "POST",
              url:    app.forum.attribute("apiUrl") + "/gamepedia/discussions/" + discussion.id() + "/games",
              body:   { game_ids: gameIds },
            }).then(() => discussion, () => discussion); // swallow link errors, return discussion
          });
        };
      }

      return record;
    };

    original();
  });

});
