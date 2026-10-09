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

The panel uses the public [eggs.download API](https://eggs.download/api-docs).
No API key is needed. Catalog results are cached for ten minutes, egg previews
for five minutes, and API failures show a retry message. If an egg changes after
you open its preview, review the current version before importing.
