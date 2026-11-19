# Egg Library

Open **Admin → Service Management → Egg Library** to browse eggs from
[eggs.download](https://eggs.download/). Search by name, category, or repository;
use the source and category filters to narrow the results. Pterodactyl is the
default source. Pelican and community entries are also available.

Select **Preview & import** to read the description, images, startup command,
installation script, variables, and repository setup notes. **Download JSON**
saves the egg file to your computer.

To add it to the panel, choose a **Destination nest** and select **Import egg**.
You can select **Create a new nest** and give it a name in the same form. The
imported egg opens in the normal egg editor and becomes available when creating
servers.

An egg with the same name and author in the destination nest is shown as already
available. **Open existing egg** opens that configuration; importing it again
does not overwrite custom settings or create a second copy. The library accepts
PTDL_v1 and PTDL_v2 files through the panel's existing importer. Other formats
can be previewed and downloaded but cannot be imported.

The panel uses the public [eggs.download API](https://eggs.download/api-docs):
`/api/v1/eggs/_index.json` for the catalog and `/api/v1/eggs/<slug>.json` for
previews and imports. No API key is needed. Search and filters run locally against
the catalog. Catalog results are cached for ten minutes, egg previews for five
minutes, and API failures are not cached. If an egg changes after you open its
preview, review the current version before importing.

If the entire library reports that an egg is no longer available, update to
v1.1-beta.4 or later: older versions use the legacy `/api/eggs` endpoints, which can return 404
even when the catalog exists. Current versions distinguish a missing catalog
from a missing individual egg and refresh caches from the versioned API.

For other failures, check HTTPS/DNS connectivity from the **panel host or
container** to `eggs.download`; browser access alone does not test that path.
Keep certificate verification enabled. If only one preview reports that its egg
is unavailable, return to the library and select a currently indexed egg.
