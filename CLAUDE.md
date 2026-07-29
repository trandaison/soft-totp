# Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

feat:     new feature
fix:      bug fix
chore:    tooling, dependencies, config
refactor: code change that neither fixes nor adds
docs:     documentation only
style:    formatting, missing semicolons, etc (no code change)
test:     adding or fixing tests
```

Examples: `feat: add TOTP QR code scanning`, `fix: handle empty secret key gracefully`