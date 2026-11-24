/**
 * Session read state: right-click a Session row in the sidebar to mark it read
 * or unread, with a "New" pill on rows that read unread.
 *
 * DSH already tracks one unread fact per Session: `completionUnread` in
 * `ui-session`'s status snapshot, which a row shows as a "done" dot and clears
 * as soon as the Session is open in the main view. This plugin keeps its own
 * per-Session mark on top of that fact:
 *
 * - read: hides the finished-but-unviewed signal (the status dot, and on
 *   archived rows the hover-card line) until the user opens that Session
 *   again; the mark then goes away, so a later finished turn marks the row
 *   unread once more;
 * - unread: set by the menu even when no turn finished, and cleared only by
 *   the menu's read action or by opening the Session.
 *
 * Opening a Session always wins, which is the same gesture DSH uses to
 * acknowledge a finished-but-unviewed turn. Marks live in this browser
 * (localStorage) keyed by Session id: nothing is written to the Session log,
 * and the model never sees them.
 *
 * @module dsh-session-read-state
 */

window.__ModuleLoader__.load({
  id: 'dsh-session-read-state',
  factory(require) {
    const React = require('react');
    // The menu glyphs are plain SVG drawn here. DSH's own icon set is not part
    // of every page's shared module table, and requiring it made the whole
    // plugin fail on pages that lack it, so this module requires nothing but
    // React.
    const NS = 'sessionReadState';
    const STORAGE_KEY = 'dsh-session-read-state:v1';
    const DOT_ATTR = 'data-dsh-read-state-dot';

    const zh = {
      'meta.title': '会话已读标记',
      'meta.description':
        '在侧栏右键点击会话（或点行末的“…”），一键标为已读或未读；未读的会话在行首显示一个圆点，标为已读后圆点隐藏，打开会话即视为已读。标记只保存在本浏览器中，不会写入会话记录，也不影响模型看到的内容。',
      'menu.markRead': '标为已读会话',
      'menu.markUnread': '标为未读会话',
      'menu.icon': '会话已读标记',
      'toast.read': '已标为已读',
      'toast.unread': '已标为未读',
      'toast.undo': '撤销',
      'toast.undoFailed': '无法撤销，请重试',
    };
    const en = {
      'meta.title': 'Session read state',
      'meta.description':
        'Right-click a session in the sidebar (or use its "..." menu) to mark it read or unread. An unread session keeps a dot at the start of its row; marking it read hides the dot, and opening the session counts as read. Marks stay in this browser, nothing is written to the session log, and the model never sees them.',
      'menu.markRead': 'Mark session read',
      'menu.markUnread': 'Mark session unread',
      'menu.icon': 'Session read state',
      'toast.read': 'Marked as read',
      'toast.unread': 'Marked as unread',
      'toast.undo': 'Undo',
      'toast.undoFailed': 'Could not undo, retry',
    };

    // ---- mark store -------------------------------------------------------
    //
    // One mark per Session: `read` hides that row's dot, `unread` shows the
    // unread dot even when no turn finished. DSH's own finished-but-unviewed
    // fact stays untouched underneath, which is why the opposite mark brings
    // the dot straight back. Opening the Session clears the mark.

    let marks = new Map();
    const listeners = new Set();

    function readStorage() {
      let stored = {};
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === 'object') stored = parsed;
        }
      } catch {
        // Private mode or another tab's garbage: start with no marks.
      }
      marks = new Map();
      for (const [id, entry] of Object.entries(stored)) {
        if (entry === null || typeof entry !== 'object') continue;
        if (entry.state === 'unread') marks.set(id, { state: 'unread' });
        else if (entry.state === 'read' && typeof entry.at === 'number') marks.set(id, { state: 'read', at: entry.at });
      }
    }

    function writeStorage() {
      try {
        const plain = {};
        for (const [id, entry] of marks) plain[id] = entry;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
      } catch {
        // A mark that cannot persist still holds for this page lifetime.
      }
    }

    function publish() {
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          console.warn('session-read-state: subscriber failed:', error);
        }
      }
    }

    function commit(next) {
      marks = next;
      writeStorage();
      publish();
    }

    function setMark(sessionId, entry) {
      const next = new Map(marks);
      if (entry === undefined) next.delete(sessionId);
      else next.set(sessionId, entry);
      commit(next);
    }

    function completionUnread(statuses, sessionId) {
      const status = statuses === undefined ? undefined : statuses.get(sessionId);
      return status !== undefined && status.completionUnread === true;
    }

    /**
     * Drop the marks that have been read for good: a Session open in the main
     * view is being looked at, so neither a read nor an unread mark outlives
     * that.
     * @param open - Session ids retained by the main view.
     */
    function reconcile(open) {
      let next = null;
      for (const id of marks.keys()) {
        if (!open.has(id)) continue;
        next = next ?? new Map(marks);
        next.delete(id);
      }
      if (next !== null) commit(next);
    }

    function markedUnread(sessionId) {
      const entry = marks.get(sessionId);
      return entry !== undefined && entry.state === 'unread';
    }

    /**
     * The finished-but-unviewed fact this Session shows right now, and whether
     * the overlay may replace it with its own dot. A Session that is asking
     * for an approval or an answer, or still has a subagent running, shows that
     * live state instead, so the overlay leaves those rows alone.
     * @param sessionId - the row's Session.
     * @param statuses - unified Session status snapshot, when available.
     * @returns `{ done, overlay }`.
     */
    /**
     * Whether DSH is drawing a live marker for this row (an approval, a
     * question, a running subagent), which the unread dot must not cover.
     * @param sessionId - the row's Session.
     * @param statuses - unified Session status snapshot, when available.
     * @returns whether the row's marker is live.
     */
    function liveState(sessionId, statuses) {
      const status = statuses === undefined ? undefined : statuses.get(sessionId);
      if (status === undefined) return false;
      return status.pendingInteraction !== undefined || status.running === true;
    }

    function completion(sessionId, statuses) {
      const status = statuses === undefined ? undefined : statuses.get(sessionId);
      if (status === undefined) return { done: false, overlay: false };
      const done = status.completionUnread === true;
      const overlay = done && status.pendingInteraction === undefined && status.running !== true;
      return { done, overlay };
    }

    /** The stored mark of one Session, or undefined. */
    function markOf(sessionId) {
      return marks.get(sessionId);
    }

    /**
     * Whether the row shows the unread dot. An explicit mark wins over the
     * fact underneath: a row marked read hides its dot even while DSH still
     * reports the finished turn as unviewed, and a row marked unread shows it
     * even when no turn finished. Without a mark, DSH's own fact decides, so
     * a Session that finished while the user was elsewhere reads unread
     * without any interaction.
     * @param sessionId - the row's Session.
     * @param statuses - unified Session status snapshot, when available.
     * @returns whether the row shows an unread dot.
     */
    function unread(sessionId, statuses) {
      const mark = markOf(sessionId);
      if (mark !== undefined) return mark.state === 'unread';
      return completionUnread(statuses, sessionId);
    }

    readStorage();

    // ---- DOM helpers ------------------------------------------------------
    //
    // The Session row's own markup carries the hooks this plugin needs: the
    // row is a `treeitem` whose `data-row-key` is `session:<id>`, its second
    // child is the title cell, its first child is the status cell, and the
    // workspace group header is the only other `treeitem` of that shape.

    /**
     * @param node - any element inside (or the row itself).
     * @returns the Session row element, or null elsewhere.
     */
    function rowOf(node) {
      if (node === null || node === undefined || typeof node.closest !== 'function') return null;
      const item = node.closest('[role="treeitem"][data-row-key]');
      if (item === null) return null;
      const key = item.getAttribute('data-row-key');
      if (key === null || !key.startsWith('session:')) return null;
      const list = item.parentElement;
      if (list === null) return null;
      // The row list is a `tree`; a workspace header's nested list is a `group`.
      if (list.getAttribute('role') !== 'tree') return null;
      return item;
    }

    function sessionIdOf(row) {
      const key = row.getAttribute('data-row-key');
      return key === null ? null : key.slice('session:'.length);
    }

    function titleCell(row) {
      return row.children.length < 3 ? null : row.children[1];
    }

    function statusCell(row) {
      return row.children.length < 3 ? null : row.children[0];
    }

    /** The row's actions strip (menu trigger and hover buttons), or null. */
    function actionsStrip(row) {
      for (const child of row.children) {
        const first = child.firstElementChild;
        if (first !== null && first.getAttribute('aria-haspopup') !== null) return child;
      }
      return null;
    }

    /** Every Session row currently on screen (workspace headers are not rows). */
    function rows() {
      return document.querySelectorAll('[role="tree"] > [role="treeitem"][data-row-key^="session:"]');
    }

    const DOT_STYLE = [
      'width:8px',
      'height:8px',
      'border-radius:50%',
      'display:block',
      'box-sizing:border-box',
      'background:var(--dsw-alias-brand-primary)',
    ].join(';');

    /**
     * Paint one row's leading cell. The cell's children belong to React, so
     * this writes the cell's own marker attribute and appends one dot of its
     * own; a re-render that drops the dot is repaired by the observer.
     * @param cell - the row's leading status cell.
     * @param show - whether the row shows the unread dot.
     * @param takeMarker - whether the dot takes the cell's seat from DSH's own
     *   finished marker (false while DSH draws a live state there).
     */
    function paintDot(cell, show, takeMarker) {
      const existing = cell.querySelector(`:scope > span[${DOT_ATTR}]`);
      if (!show) {
        if (existing !== null) existing.remove();
        if (cell.getAttribute(DOT_ATTR) === 'true') {
          for (const child of cell.children) child.style.display = '';
          cell.removeAttribute(DOT_ATTR);
        }
        return;
      }
      if (existing !== null) return;
      if (takeMarker) {
        // DSH's own marker lives in this cell; the unread dot replaces it so
        // the row keeps one marker, in one place.
        if (cell.getAttribute(DOT_ATTR) !== 'true') {
          cell.setAttribute(DOT_ATTR, 'true');
          for (const child of cell.children) child.style.display = 'none';
        }
      }
      cell.appendChild(makeDot());
    }

    /** The plugin's own dot; its color and size are the theme's, styled inline. */
    function makeDot() {
      const dot = document.createElement('span');
      dot.setAttribute(DOT_ATTR, 'dot');
      dot.setAttribute('aria-hidden', 'true');
      dot.setAttribute('style', DOT_STYLE);
      return dot;
    }

    /** Take the plugin's marker off a cell it no longer decorates. */
    function clearDot(cell) {
      cell.querySelectorAll(`:scope > span[${DOT_ATTR}]`).forEach((dot) => dot.remove());
      if (cell.getAttribute(DOT_ATTR) === 'true') {
        for (const child of cell.children) child.style.display = '';
      }
      cell.removeAttribute(DOT_ATTR);
    }

    // ---- client plugin ----------------------------------------------------

    return {
      // `sessions`, `locale`, and `contextMenus` are the data and surfaces this
      // plugin needs; `uiSession` (the finished-but-unviewed flag) and `slots`
      // (the menu glyphs) are optional. Cordis throws on reading an undeclared
      // property, so every optional read goes through `ctx.get(name)`.
      inject: ['sessions', 'locale', 'contextMenus'],
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-read-state: dictionaries');

        // The Session package's status face; absent in a composition that
        // dropped it, which leaves the plugin reading its own marks only.
        const statusSource = () => {
          const session = ctx.get('uiSession');
          return session === undefined ? undefined : session.sessionStatus;
        };
        const statuses = () => {
          const source = statusSource();
          return source === undefined ? undefined : source.getSnapshot();
        };
        const openIds = () => {
          const snapshot = ctx.sessions.list.getSnapshot();
          const open = new Set();
          for (const [id, summary] of Object.entries(snapshot.byId ?? {})) {
            if (summary !== null && typeof summary === 'object' && (summary.retainedBy?.mainView ?? 0) > 0) open.add(id);
          }
          return open;
        };
        const sync = () => reconcile(openIds());
        /**
         * The row's title for a captured menu target: the controller's own
         * title, else the text the row draws (a Session the list has not
         * loaded yet still names itself in the dialog it raises).
         * @param row - the right-clicked Session row.
         * @param sessionId - its Session.
         * @returns the title, empty when neither source has one.
         */
        const displayTitleOf = (row, sessionId) => {
          const fromList = ctx.sessions.list.getSnapshot().byId[sessionId]?.displayTitle;
          if (typeof fromList === 'string' && fromList !== '') return fromList;
          const cell = titleCell(row);
          return cell === null ? '' : (cell.textContent ?? '').trim();
        };

        // The list reports the fact that clears a mark: a Session landing in
        // the main view. Both subscriptions repaint too, because DSH's own
        // fact can flip between "done" and a live state without touching the
        // page tree.
        let repaint = () => {};
        ctx.effect(() => ctx.sessions.list.subscribe(() => {
          sync();
          repaint();
        }), 'session-read-state: session list');
        ctx.effect(() => {
          const source = statusSource();
          return source === undefined ? () => {} : source.subscribe(() => {
            sync();
            repaint();
          });
        }, 'session-read-state: session status');
        ctx.effect(() => ctx.on('connection/reset', () => {
          sync();
          repaint();
        }), 'session-read-state: reconnect');

        // Another tab's marks arrive through the storage event.
        ctx.effect(() => {
          const onStorage = (event) => {
            if (event.key !== null && event.key !== STORAGE_KEY) return;
            readStorage();
            publish();
            sync();
          };
          window.addEventListener('storage', onStorage);
          return () => window.removeEventListener('storage', onStorage);
        }, 'session-read-state: storage sync');

        // The store the menu rows observe: an opaque snapshot of the marks.
        const store = {
          subscribe(listener) {
            listeners.add(listener);
            return () => {
              listeners.delete(listener);
            };
          },
          getSnapshot() {
            return [...marks.values()].map((entry) => entry.state).join('');
          },
        };

        // Right-click on a Session row (anywhere but its own actions strip,
        // which draws its menu itself) opens the shared menu at the pointer:
        // the shipped row binds its menu to the "..." trigger only.
        ctx.effect(() => {
          const onContextMenu = (event) => {
            const row = rowOf(event.target);
            if (row === null || event.defaultPrevented) return;
            const strip = actionsStrip(row);
            if (strip !== null && strip.contains(event.target)) return;
            const sessionId = sessionIdOf(row);
            if (sessionId === null) return;
            const bounds = row.getBoundingClientRect();
            event.preventDefault();
            event.stopPropagation();
            row.focus({ preventScroll: true });
            ctx.contextMenus.open(
              { kind: 'session', value: { sessionId, displayTitle: displayTitleOf(row, sessionId) } },
              {
                // A macOS ctrl-click reports a stale pointer on `contextmenu`;
                // the keyboard gesture has no pointer at all.
                x: event.pointerType === '' ? bounds.left + 24 : event.clientX || bounds.left + 24,
                y: event.pointerType === '' ? bounds.bottom : event.clientY || bounds.top + 16,
              },
            );
          };
          window.addEventListener('contextmenu', onContextMenu, true);
          return () => window.removeEventListener('contextmenu', onContextMenu, true);
        }, 'session-read-state: row context menu');

        // The leading glyph of the menu row: an eye, crossed out for the
        // "mark read" row and open for "mark unread". It is drawn here from
        // paths alone, in the current text color, so it inherits the menu's
        // theme in light and dark alike.
        const ICON_SIZE = 14;
        const eyeIcon = (kind) => () => React.createElement('svg', {
          viewBox: '0 0 16 16',
          width: ICON_SIZE,
          height: ICON_SIZE,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        }, [
          React.createElement('path', {
            key: 'lens', d: 'M1.5 8s2.5-4.4 6.5-4.4S14.5 8 14.5 8s-2.5 4.4-6.5 4.4S1.5 8 1.5 8Z',
          }),
          React.createElement('circle', { key: 'pupil', cx: 8, cy: 8, r: 2 }),
          ...kind === 'read'
            ? [React.createElement('path', { key: 'slash', d: 'm2.4 2.4 11.2 11.2' })]
            : [],
        ]);
        const readIcon = eyeIcon('read');
        const unreadIcon = eyeIcon('unread');
        // One mark, plus the notice that reports it. Every mark answers with a
        // notice because the pill is only visible on rows currently drawn (a
        // collapsed group or another filter hides it), and because Undo needs
        // somewhere to live: it puts back the mark that was there before, not
        // "no mark". The menu closes before the notice shows, so a throwing
        // notify must not undo the mark that already landed.
        const applyMark = (sessionId, entry, toast) => {
          const previous = marks.get(sessionId);
          setMark(sessionId, entry);
          try {
            ctx.contextMenus.notify(t(toast), true, {
              label: t('toast.undo'),
              run: () => setMark(sessionId, previous),
              failureLabel: t('toast.undoFailed'),
            });
          } catch (error) {
            console.warn('session-read-state: notice unavailable:', error);
          }
        };
        // One row over the captured Session, after Fork and before Copy Session
        // ID, naming the action the Session's current state calls for.
        ctx.effect(() => ctx.contextMenus.register({
          id: 'session-read-state.read-state',
          target: 'session',
          order: 350,
          observe: () => [store],
          resolve: ({ sessionId }) => {
            // A row that reads unread offers the read action, and one that is
            // already read offers the unread action; either way the mark
            // replaces DSH's own fact for as long as it lasts.
            if (unread(sessionId, statuses())) {
              return [{
                id: 'mark-read',
                label: t('menu.markRead'),
                icon: { key: 'session-read-state.read' },
                run: () => applyMark(sessionId, { state: 'read' }, 'toast.read'),
              }];
            }
            return [{
              id: 'mark-unread',
              label: t('menu.markUnread'),
              icon: { key: 'session-read-state.unread' },
              run: () => applyMark(sessionId, { state: 'unread' }, 'toast.unread'),
            }];
          },
        }), 'session-read-state: menu rows');
        // The rows name these keys, and the popup only renders a key through
        // the Slot; the glyphs above are what it draws. The Slot service is
        // read optionally: without it the rows draw without a glyph rather
        // than stopping the plugin.
        try {
          ctx.slots.inject('contextMenu.icon', function* () {
            yield ctx.slots.register({ name: 'contextMenu.icon', key: 'session-read-state.read' }, readIcon);
            yield ctx.slots.register({ name: 'contextMenu.icon', key: 'session-read-state.unread' }, unreadIcon);
          });
        } catch (error) {
          console.warn('session-read-state: menu icons unavailable:', error);
        }

        // The row marker. The sidebar draws nothing for an idle or read row,
        // so this pass owns the leading 16px cell: a dot for an unread row, an
        // empty cell for a read one, and never a second dot beside a live state
        // DSH is already drawing (an approval, a question, a running subagent).
        let frame;
        let observer;
        const flush = () => {
          frame = undefined;
          const source = statuses();
          let decorated = false;
          for (const row of rows()) {
            const sessionId = sessionIdOf(row);
            const cell = statusCell(row);
            if (sessionId === null || cell === null) continue;
            const unreadNow = unread(sessionId, source);
            const marked = markOf(sessionId);
            const live = liveState(sessionId, source);
            const touched = marked !== undefined
              || unreadNow
              || cell.hasAttribute(DOT_ATTR);
            if (!touched) continue;
            decorated = true;
            // A row DSH is drawing for a live state keeps that marker; the
            // unread dot only takes the finished-state seat.
            paintDot(cell, unreadNow, !live);
          }
          // Watch the page from the first page that carries a mark on, so
          // idle lists cost no observer work.
          if (decorated && observer === undefined) watch();
        };
        const schedule = () => {
          if (frame !== undefined) return;
          // Without a frame clock (a background tab) a pass still runs, so a
          // mark never waits for the next visible frame to show.
          if (typeof window.requestAnimationFrame !== 'function') {
            flush();
            return;
          }
          frame = window.requestAnimationFrame(flush);
        };
        repaint = schedule;
        const watch = () => {
          observer = new MutationObserver((records) => {
            // The pill and the quiet cell are this plugin's own writes; they
            // carry no `data-row-key` change, and every React re-render that
            // matters does, so only those records re-schedule a pass.
            if (records.some((record) => record.type !== 'attributes' || record.attributeName === 'data-row-key')) schedule();
          });
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['data-row-key'],
          });
        };
        ctx.effect(() => {
          const off = store.subscribe(schedule);
          schedule();
          return () => {
            off();
            if (observer !== undefined) observer.disconnect();
            observer = undefined;
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            document.querySelectorAll('[role="tree"] > [role="treeitem"] > span').forEach((cell) => clearDot(cell));          };
        }, 'session-read-state: row decoration');
      },
    };
  },
});
