# Sanitize golden fixtures (Stage 1.2 — first 6 cases)

Each test case is a pair:
- `*.in.html`  (input)
- `*.out.html` (expected output)

These first 6 cases cover:
- Links: defaults, anchor stripping, disallowed scheme unwrap
- Callouts: label structure normalization, warning formatting, forbidden child stripping

Add more fixtures by following the same naming pattern.
