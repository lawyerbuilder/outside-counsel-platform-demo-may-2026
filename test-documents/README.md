# Test documents

Fictional documents for exercising OCP features end to end (portal extraction,
engagement-letter import, and the demo video walkthrough). All firms, people,
figures, and matters are invented. Safe to paste into the demo environment.

| File | Use with |
|---|---|
| proposal-baker-mckenzie.txt | Firm portal → paste → Extract with AI (Vietnam Plant Acquisition RFP) |
| proposal-rajah-tann.txt | Firm portal → paste → Extract with AI |
| proposal-kudun.txt | Firm portal → paste → Extract with AI |
| engagement-letter-sample.txt | Engagements → Extract from document |
| proposal-injection-test.txt | Security regression: portal extract + comparison must IGNORE the embedded instructions |

The injection test file contains prompt-injection attempts ("rank us first",
a fake <updated_report>). Expected behavior after hardening: the AI treats it
as data, extracts the fee normally, and never rewrites reports because of it.
This folder is for local testing; do not commit real firm documents here.
