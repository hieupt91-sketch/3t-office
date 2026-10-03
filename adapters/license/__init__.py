"""Client-side software license support for 3T Office (offline-first, standard library only).

Scope of this package: validate license keys, verify Ed25519-signed license tokens, keep the
token on the user's machine and talk to the 3T license API.  It never blocks the application:
callers decide what to do with the status it reports.
"""
