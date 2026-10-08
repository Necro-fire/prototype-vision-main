<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Prototype architecture
- Keep shared demo catalogs, clients, schedules and bookings in the root ShopProvider so public and administrative screens reflect the same session data; the prototype has no persistence or production authentication.
- Separate public content into leaf routes and wrap administrative modules in a parent route with Outlet; every content route supplies its own localized metadata.
- Keep scheduling validation in a pure availability function and test phone normalization, opening hours and duration-based conflicts to make domain rules reusable.
- Import photographs through asset pointer JSON files; never render the uploaded reference screenshot as website content.
