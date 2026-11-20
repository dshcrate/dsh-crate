# Security policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Use GitHub's
private vulnerability reporting instead:

<https://github.com/dshcrate/dsh-crate/security/advisories/new>

That form is private between you and the maintainers, and it is the channel
this project checks. A public issue is fine for anything that is not a
security problem — an ordinary bug, a crash, a wrong message.

If the private form is unavailable to you, say so in an issue **without the
details** (no request paths, no payloads, no reproducer) and we will find
another channel first.

## What this project is, and what that means for severity

`dshmarket` is a plugin market that runs *inside* DeepSeek Harness. It is not
a standalone service:

- It holds **no credentials of its own** — no GitHub token, no account. Gist
  backups use a token the user pastes in per action, and nothing is stored.
- Its HTTP routes are registered with the host's web server and are meant to
  be reachable only where the host is reachable. It does not implement its
  own login.
- It runs shell commands (`pnpm`, `dsh plugin`, `git`) against the user's own
  profile, by design — that is what installing a plugin is.

The most useful reports are about the boundaries: a request that reaches a
mutating route without the host authenticating it; a plugin install that
reads or writes outside the profile it was pointed at; a place where a
plugin's own metadata (its name, its manifest, a URL in its spec) is trusted
for something it should not be.

## Anonymous usage count

The plugin sends one anonymous count a day. It is on by default and can be
turned off. It is sent from the Node side of the plugin, never from the
browser, and never carries a path, a plugin list, a hostname or a username.

- **Fields**, exactly five, as JSON: `id` (a random 128-bit hex string made on
  first use and kept in `<DSH_HOME>/dsh-crate/telemetry.json`), `v` (plugin
  version), `hv` (DSH version, or null), `kind` (`desktop` or `web`) and
  `region` (the download region, `global` or `china`).
- **Endpoint**: `POST https://dshcrate.com/api/telemetry`, at most once per UTC
  day per install, with a 10 second timeout. A failure is not retried before
  the next scheduled check and never surfaces as an error.
- **Retention**: rows older than 400 days are deleted. We do not store the
  sender's IP address.
- **Turn it off**: the "Anonymous usage count" switch in the plugin's card
  under Settings, which takes effect immediately and deletes nothing else; or
  set `DSH_CRATE_TELEMETRY=0` or `DO_NOT_TRACK=1` in the environment. It is
  also never sent when `CI` is set or under test runs.

## Supported versions

The latest published version on npm is the one that gets fixes. There are no
maintained back-branches.
