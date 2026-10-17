# Card ke baghair browser preview

1. README ka **Open in GitHub Codespaces** button kholein.
2. **Create codespace** par click karein. Pehli dafa setup/download mein kuch minutes lagenge.
3. Application khud start hogi. **Open in Browser** par click karein. Agar browser tab na khule to neeche **PORTS** tab mein **E-11 HOSTEL — OPEN PORTAL (3000)** ka globe/Open in Browser button dabayein.
4. Portal par Login kholein: `owner@e11.demo`, password `E11Demo!2026`.

Preview private forwarded port par rehta hai; apne GitHub account mein signed in rahein. Yeh code editor ke andar picture nahi, actual running web application hai. Database, booking, dashboards aur other implemented workflows backend se connected hain.

Official GitHub documentation states that personal Free/Pro accounts have an included monthly Codespaces quota and can start without payment details. Eligibility, account restrictions and remaining quota still apply. If GitHub requests payment details or reports the free allowance exhausted, stop rather than adding a card. No paid capacity is configured by this repository.

This is a development preview, not an always-on public production deployment. Stop the codespace from `github.com/codespaces` when finished; closing a browser tab alone does not immediately stop usage. GitHub may stop idle codespaces automatically. Real resident or financial data should not be entered into this demo.

## Startup implementation

The dev container uses Python 3.12, Node.js 22 and the official Docker-in-Docker feature. Creation installs frozen dependencies and prepares PostgreSQL/Redis. Every start reapplies migrations, explicitly runs the development-only idempotent seed, and starts the application processes. The forwarded hostname is used as the exact accepted API origin and HTTPS cookies are enabled. The Next.js development asset allowlist includes only that codespace's hostname, rather than all GitHub domains.

Port 3000 is the only configured forwarded application port and defaults to GitHub's private visibility. Docker services and the API are accessed internally. The feature's Docker volumes preserve its service data within the codespace lifecycle; deleting a codespace can delete its development data.

Sources: [GitHub Codespaces overview](https://docs.github.com/en/codespaces/about-codespaces/what-are-codespaces), [official quickstart](https://docs.github.com/en/codespaces/quickstart), and [official Docker feature](https://github.com/devcontainers/features/tree/main/src/docker-in-docker).

This configuration was prepared for Codespaces; creating and validating a new GitHub-hosted codespace requires the user's account. Local application/container tests do not establish that this provider workflow has already run in a fresh account.
