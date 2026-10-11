# Security
Office files are untrusted input.

Review:
malformed files, macros, embedded objects, archives, links, remote content, filesystem paths, plugins, external process, command execution, credentials.

Rules:
- validate boundary inputs
- prevent path traversal
- safe temp files
- no shell concatenation with untrusted values
- no plaintext secrets in logs
- no silent exception swallowing for security checks
