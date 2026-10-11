# CI/CD Policy
CI should be impact-aware but conservative.

Checks:
- formatting/lint where applicable
- compile/build
- unit/module tests
- architecture/dependency checks where automated
- secret scanning
- shared-platform 3-app smoke
- adapter/core compatibility jobs
- packaging/release jobs on release branches

CI configuration changes receive review like source code.
No bypass of required checks without recorded reason.
