# Team board release notes

## Schedule calendar update

The Home Screen now has a Schedule button opening a month calendar. Selecting a
date shows its events and tasks and pre-fills the date when adding either kind.
Recurring items remain editable as a series. Existing items without new fields
retain their existing dates and immediate board visibility.

- `monthlyMode` is optional: `date` (default), `weekday` (first through fourth
  weekday, based on the first date), or `lastWeekday`. For third-Thursday staff
  meetings, select an actual third Thursday and the same-weekday pattern.
- `boardLeadDays` is optional/null for immediate display, or 0–365 days before
  each occurrence. For monthly ceiling cleaning, select the 7th as the first due
  date, repeat monthly, and enter 6 days. It appears on the 1st; date-only tasks
  turn red and bold on the 8th. Completed occurrences advance individually.
- The calendar and All items filter include future scheduled items even before
  their board display date. Normal board filters respect the display date.
- Tasks with completion history retain their recurrence, but title, details and
  board display timing remain editable. The calendar derives completion from
  the existing sequential task history; it does not add a separate audit log.

The optional fields must be allowed by the deployed Firestore rules **before**
releasing the new web assets. These changes preserve existing approval, branch,
revision and author constraints. A Pages deployment alone does not update rules.
Use the release checks below; do not publish assets alone. No production
schedule records are pre-seeded by this change.

Local model coverage includes first/seventh/eighth-day boundaries, next-month
visibility, third Thursdays across years, last weekdays, leap February, end
dates and calendar completion history. `tests/team-schedule.browser.js` uses an
in-memory database only and exercises calendar navigation, editing, saving,
completion and phone layout. Run with Playwright installed; optionally set
`SCHEDULE_BROWSER_PATH` to a Chromium binary.

The standalone staffing parser test requires an external workbook fixture and
is unrelated to this calendar. Do not count its missing-fixture error as a
calendar regression. Production permission checks still require the release
procedure below.

Adds `team-board-model.js` and `team-board.js` after the donor board in `homeView`.
The board is layered onto the current planner release so newer calculator,
dashboard, and supply-rule changes remain intact.

## Required before publishing

The live Firestore rules were supplied by the owner on September 1, 2026. The
reviewed complete replacement is saved as `firestore.rules`. **Publish and test
that ruleset before publishing the Team board web assets.**

1. Replace the Firebase console editor with the complete `firestore.rules`. This
   preserves all supplied collection rules, adds the Team board, and corrects
   `isApproved()` so merely retaining a revoked approval document no longer
   grants database access.
3. Run Firestore emulator tests against the complete rules: deny unauthenticated,
   missing approval, approved=false, mustResetPassword=true; allow two distinct
   approved users to create/read/edit/complete/soft-delete/restore the same PDX
   item; deny branch changes, invalid schemas, changed creator, forged editor,
   stale revision, permanent deletion. Test approvedUsers self-read is permitted
   and clients cannot self-approve. Verify the planner administrator has an
   approvedUsers record; there is intentionally no email-only bypass here.
4. Check auth sign-out/revocation clears displayed board data and an open editor;
   failed saves retain entries and never show success. Verify reconnect and
   cross-device updates with two approved test accounts and synthetic records.
5. Test concurrent edits: only one succeeds for the same revision, the other
   receives the reload/review message. Test offline transactions do not queue.
6. Publish database permissions only with user authorization, then the app after
   approval. A GitHub/Cloudflare deploy does not deploy Firestore rules.

## Behavior / intentional limits

- Firestore `teamBoardItems`, scoped `branchId: pdx`. This is the current single
  branch app, not the proposed multi-branch architecture. Do not onboard another
  branch until server-enforced membership-based separation is implemented.
- All approved planner users may edit all board items, not anonymous visitors.
- No browser-only source of truth; Firebase provides shared persistence. Saving
  requires connectivity and server-confirmed approval in the current session.
- Days/weeks/months repeat every 1–365 units, optional inclusive end date.
  Pacific wall-clock time is fixed regardless of viewing device timezone.
  An empty clock is all-day/date-only. These are in-app schedules, not external
  notifications or exact-time background jobs; spring DST gaps have no timed
  delivery behavior. Dates on the 29th–31st clamp to short months, then recover
  the original day the next month. Events show today's/next occurrence.
- Tasks preserve overdue occurrences until completed one at a time. The latest
  check-off can be undone; this is not a full per-occurrence audit archive.
  After a check-off, only task title/details can be edited; changing its schedule
  requires a new task. Edit/delete labels explicitly describe series scope.
- Deletion moves the entire item/series to Trash; any approved user can restore.
  No permanent delete action. No donor data or medical identifiers in fixtures.
- Existing Firebase persistence configuration is unchanged. This module does
  not display cached approval as fresh authorization after reload and does not
  implement new offline writes. Local Firebase cache policy is inherited.

## Validation completed locally

Run `node --test tests/team-board*.test.js` and the existing cooling/dropdown/
donor timing tests. JavaScript checks and model/transaction tests do not validate
production permissions or visual layout. Browser QA and merged-rule emulator
tests remain outstanding until the release gate above is satisfied.

References: https://firebase.google.com/docs/firestore/security/get-started
and https://firebase.google.com/docs/firestore/query-data/listen
