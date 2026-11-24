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
    const PILL_ATTR = 'data-dsh-read-state-pill';
    const CELL_ATTR = 'data-dsh-read-state-cell';
    const QUIET_ATTR = 'data-dsh-read-state-quiet';

    const zh = {
      'meta.title': '会话已读标记',
      'meta.description':
        '在侧栏右键点击会话（或点行末的“…”），一键标为已读或未读；未读的会话在标题旁显示“新”标记，标为已读会收起该会话“已完成”的提示直到再次打开。标记保存在本浏览器中，不会写入会话记录，也不影响模型看到的内容。',
      'menu.markRead': '标为已读会话',
      'menu.markUnread': '标为未读会话',
      'menu.icon': '会话已读标记',
      'toast.read': '已标为已读',
      'toast.unread': '已标为未读',
      'toast.undo': '撤销',
      'toast.undoFailed': '无法撤销，请重试',
      'pill.unread': '新',
      'pill.unreadLabel': '已标记为未读',
    };
    const en = {
      'meta.title': 'Session read state',
      'meta.description':
        'Right-click a session in the sidebar (or use its "..." menu) to mark it read or unread; unread sessions show a "New" pill beside the title, and a read mark hides that session\'s "done" prompt until you open it again. Marks stay in this browser, nothing is written to the session log, and the model never sees them.',
      'menu.markRead': 'Mark session read',
      'menu.markUnread': 'Mark session unread',
      'menu.icon': 'Session read state',
      'toast.read': 'Marked as read',
      'toast.unread': 'Marked as unread',
      'toast.undo': 'Undo',
      'toast.undoFailed': 'Could not undo, retry',
      'pill.unread': 'New',
      'pill.unreadLabel': 'Marked as unread',
    };

    // ---- mark store -------------------------------------------------------
    //
    // A read mark is stored as a read watermark: the Session's `updatedAt`
    // when the mark was made. It covers the finished-turn signal while that
    // value stands and lifts as soon as a newer turn moves it, so the mark
    // never needs to observe the moment a turn finishes.

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
     * Apply the facts the Client already publishes. Only ever clears marks:
     * a Session open in the main view is read for good, and a read watermark
     * lifts once its Session moves past the turn it covered. DSH's own
     * completion flag needs no sweep — it only feeds {@link quiet}, which
     * follows it live — so callers may omit the status snapshot.
     * @param open - Session ids retained by the main view.
     * @param updatedAt - Session id -> latest activity timestamp.
     */
    function reconcile(open, updatedAt) {
      let next = null;
      for (const [id, entry] of marks) {
        const stale = entry.state === 'read' && (updatedAt(id) ?? 0) > entry.at;
        if (!open.has(id) && !stale) continue;
        next = next ?? new Map(marks);
        next.delete(id);
      }
      if (next !== null) commit(next);
    }

    function markedRead(sessionId, updatedAt) {
      const entry = marks.get(sessionId);
      return entry !== undefined && entry.state === 'read' && !((updatedAt(sessionId) ?? 0) > entry.at);
    }

    function markedUnread(sessionId) {
      const entry = marks.get(sessionId);
      return entry !== undefined && entry.state === 'unread';
    }

    /**
     * Whether the row's finished-but-unviewed signal should be hidden. Only
     * that one signal: the row shows an approval, a question, or a running
     * subagent in the same cell and ranks it above "done", so a row with any
     * of those keeps its cell whatever the mark says.
     * @param sessionId - the row's Session.
     * @param statuses - unified Session status snapshot, when available.
     * @param updatedAt - Session id -> latest activity timestamp.
     */
    function quiet(sessionId, statuses, updatedAt) {
      if (!markedRead(sessionId, updatedAt)) return false;
      const status = statuses === undefined ? undefined : statuses.get(sessionId);
      if (status === undefined || status.completionUnread !== true) return false;
      return status.pendingInteraction === undefined && status.running !== true;
    }

    /** Whether the row reads unread: its own mark, otherwise DSH's fact. */
    function unread(sessionId, statuses, updatedAt) {
      if (markedUnread(sessionId)) return true;
      return !quiet(sessionId, statuses, updatedAt) && completionUnread(statuses, sessionId);
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

    const PILL_STYLE = [
      'flex:none',
      'margin-inline-start:6px',
      'padding:0 5px',
      'height:16px',
      'min-width:16px',
      'box-sizing:border-box',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'border-radius:8px',
      'font-size:10px',
      'line-height:16px',
      'white-space:nowrap',
      'color:var(--dsw-alias-brand-primary)',
      'background:var(--dsw-alias-bg-layer-2)',
    ].join(';');

    /**
     * Show or drop the pill of one title cell. The pill is a DOM node, not a
     * React element, so a re-render of the row keeps it; the observer below
     * notices when React replaced the title span and paints a fresh one.
     * @param cell - the row's title cell.
     * @param text - pill text, or null to remove the pill.
     */
    function paintCell(cell, text) {
      const existing = cell.querySelector(`:scope > span[${PILL_ATTR}]`);
      if (text === null) {
        if (existing !== null) existing.remove();
        if (cell.hasAttribute(CELL_ATTR)) cell.removeAttribute(CELL_ATTR);
        return;
      }
      if (existing !== null) {
        if (existing.textContent !== text) existing.textContent = text;
        return;
      }
      const title = cell.firstElementChild;
      if (title === null) return;
      const pill = document.createElement('span');
      pill.setAttribute(PILL_ATTR, '');
      pill.setAttribute('aria-hidden', 'true');
      pill.setAttribute('style', PILL_STYLE);
      pill.textContent = text;
      cell.setAttribute(CELL_ATTR, '');
      title.after(pill);
    }

    /**
     * Hide or restore the row's status cell. A row whose finished-but-unviewed
     * status is covered by a read mark keeps its 16px cell (so the title does
     * not move) but paints nothing in it; the cell's child is React's, so the
     * plugin only writes the visibility of the cell itself.
     * @param cell - the row's status cell.
     * @param hidden - whether the row's unviewed signal is covered.
     */
    function paintStatusCell(cell, hidden) {
      if (cell === null) return;
      if (hidden) {
        if (cell.getAttribute(QUIET_ATTR) === 'true') return;
        cell.setAttribute(QUIET_ATTR, 'true');
        cell.style.visibility = 'hidden';
      } else if (cell.hasAttribute(QUIET_ATTR)) {
        cell.removeAttribute(QUIET_ATTR);
        cell.style.visibility = '';
      }
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
        const updatedAt = (sessionId) => {
          const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
          return summary === undefined ? undefined : summary.updatedAt;
        };
        const openIds = () => {
          const snapshot = ctx.sessions.list.getSnapshot();
          const open = new Set();
          for (const [id, summary] of Object.entries(snapshot.byId ?? {})) {
            if (summary !== null && typeof summary === 'object' && (summary.retainedBy?.mainView ?? 0) > 0) open.add(id);
          }
          return open;
        };
        const sync = () => reconcile(openIds(), updatedAt);
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

        // The list reports both facts that clear a mark: a Session landing in
        // the main view, and a finished turn moving its `updatedAt`. Both
        // subscriptions repaint too: the status snapshot can flip between
        // "done" and a live state without touching the page tree.
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
        // One row over the captured Session, after Fork and before Copy Session
        // ID, naming the action the Session's current state calls for.
        ctx.effect(() => ctx.contextMenus.register({
          id: 'session-read-state.read-state',
          target: 'session',
          order: 350,
          observe: () => [store],
          resolve: ({ sessionId }) => {
            const read = markedUnread(sessionId)
              || !(markedRead(sessionId, updatedAt) || completionUnread(statuses(), sessionId));
            if (read) {
              return [{
                id: 'mark-read',
                label: t('menu.markRead'),
                icon: { key: 'session-read-state.read' },
                run: () => apply(sessionId, { state: 'read', at: updatedAt(sessionId) ?? Date.now() }, 'toast.read'),
              }];
            }
            return [{
              id: 'mark-unread',
              label: t('menu.markUnread'),
              icon: { key: 'session-read-state.unread' },
              run: () => apply(sessionId, { state: 'unread' }, 'toast.unread'),
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

        // The row decorations: the pill on unread rows, and the hidden status
        // cell for a finished turn a read mark covers. A MutationObserver
        // rather than slot entries: React owns every cell of the row and would
        // drop a child it did not render, so both are re-applied after each
        // re-render instead of registered as components.
        //
        // Only rows that carry something to draw are touched: decoration is
        // removed from them when their state clears, and an undecorated row is
        // never written to. A collapsed group, another filter, or an archived
        // row simply gets its decoration when it is next on screen.
        let frame;
        let observer;
        const flush = () => {
          frame = undefined;
          const source = statuses();
          let decorated = false;
          for (const row of rows()) {
            const sessionId = sessionIdOf(row);
            const title = titleCell(row);
            if (sessionId === null || title === null) continue;
            const hidden = quiet(sessionId, source, updatedAt);
            const unreadNow = unread(sessionId, source, updatedAt);
            const marked = hidden || unreadNow || title.hasAttribute(CELL_ATTR);
            if (!marked) continue;
            decorated = true;
            paintCell(title, unreadNow ? t('pill.unread') : null);
            paintStatusCell(statusCell(row), hidden);
          }
          // Watch the page from the first page that carries decoration on, so
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
            document.querySelectorAll(`[${PILL_ATTR}]`).forEach((pill) => pill.remove());
            document.querySelectorAll(`[${CELL_ATTR}]`).forEach((cell) => cell.removeAttribute(CELL_ATTR));
            document.querySelectorAll(`[${QUIET_ATTR}]`).forEach((cell) => {
              cell.removeAttribute(QUIET_ATTR);
              cell.style.visibility = '';
            });
          };
        }, 'session-read-state: row decoration');
      },
    };
  },
});
