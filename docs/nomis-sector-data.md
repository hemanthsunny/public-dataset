# Adding non-food sectors (IT, manufacturing, ...) to the Acquisition Opportunity Finder

The Acquisition Opportunity Finder's sector dropdown started out food-only
(pubs, hotels, convenience retail, takeaways, restaurants) because its only
data source was the **FSA food hygiene ratings register**
([ratings.food.gov.uk/open-data](https://ratings.food.gov.uk/open-data)) —
a register of food businesses. It has no visibility into non-food sectors
at all: there's no FSA record for a software company, a factory, or a
building firm.

This doc covers the second, separate data source that adds those sectors:
**ONS/Nomis UK Business Counts**, and how to pull it in.

## What it is

[Nomis](https://www.nomisweb.co.uk/) (run by Durham University on behalf of
ONS) publishes **UK Business Counts** — counts of enterprises from the
Inter-Departmental Business Register (IDBR), broken down by local authority
and [UK SIC 2007](https://www.ons.gov.uk/methodology/classificationsandstandards/ukstandardindustrialclassificationofeconomicactivities/uksic2007)
industry section. It's Crown copyright / Open Government Licence, the same
licence family as the FSA register and ONS population estimates already
used elsewhere in this app.

- Dataset landing page: <https://www.nomisweb.co.uk/query/select/getdatasetbytheme.asp>
- API overview: <https://www.nomisweb.co.uk/api/v01/help>
- UK SIC 2007 section reference: <https://www.ons.gov.uk/methodology/classificationsandstandards/ukstandardindustrialclassificationofeconomicactivities/uksic2007>

## Why the ingestion script doesn't hardcode a query URL

Nomis's API addresses datasets, geographies and industries by internal
numeric codes (not plain SIC letters), and those codes vary by dataset
vintage. Guessing them would risk silently pulling the wrong numbers. Nomis's
own documented workflow is to build the query visually on their site and
copy the generated URL — so that's what this integration does too.

## Data model

`la_sector_counts` (migration `0008_la_sector_counts.sql`) is a **tidy /
long-format** table: one row per *(local authority, sector)*, not one
column per sector. That's deliberate — it's what `la_opportunity_metrics`
does for the FSA sub-sectors (`pubs_est`, `hotels_est`, ...), and that
design means every new column needs a migration. Adding a sector to
`la_sector_counts` is just inserting rows; the UI (`OpportunityExplorer`)
already reads whatever sector keys are present and adds them to the
dropdown automatically — see `sectorValue()` and `dynamicSectors` in
`src/components/acquisition/OpportunityExplorer.tsx`.

| column          | meaning                                                              |
| ---------------- | --------------------------------------------------------------------- |
| `la_name`        | must match `la_opportunity_metrics.la_name` exactly                   |
| `sector_key`      | short machine key, e.g. `it_comms`                                    |
| `sector_label`    | shown in the UI dropdown, e.g. `IT & communications`                  |
| `count`           | enterprise count for that LA + sector                                 |
| `per_10k`         | `count` normalised per 10,000 population (computed by the script)     |
| `is_exact`        | Nomis counts are exact IDBR snapshot figures, so always `true` today  |
| `source`          | human-readable source label, shown in the UI tooltip                  |
| `source_url`      | the exact Nomis query URL used, for provenance                        |
| `fetch_date`      | when the script pulled it                                             |
| `method_notes`    | one-line note on the SIC section used                                 |

## Step-by-step: generate a Nomis query URL for one sector

Repeat this once per sector (IT & communications, Manufacturing,
Professional & scientific services, Construction, or any other SIC
section):

1. Go to <https://www.nomisweb.co.uk/query/select/getdatasetbytheme.asp>
   and open **"Business" → "UK Business Counts - enterprises"** (the
   current IDBR-based release; the exact name may show a year suffix).
2. Under **geography**, choose *"local authorities: district / unitary
   (as of April 2023)"* (or whichever current LA geography matches
   `la_opportunity_metrics`) and select **all** local authorities in
   England.
3. Under **industry**, choose the single SIC 2007 **section** you want
   (not a finer subclass) — e.g. for IT & communications pick section
   **J — Information and communication**. Use this mapping for the four
   sectors this feature was built for:

   | sector key         | label                                    | SIC 2007 section |
   | ------------------- | ----------------------------------------- | ----------------- |
   | `it_comms`          | IT & communications                       | J                  |
   | `manufacturing`      | Manufacturing                             | C                  |
   | `prof_scientific`    | Professional & scientific services        | M                  |
   | `construction`       | Construction                              | F                  |

4. Leave employment size band as *"total"* (all sizes) and legal status as
   *"total"* unless you want to filter further.
5. Run the query, then use Nomis's **"Download"** or **"API"** option to
   get a CSV download link — copy that URL (it will look like
   `https://www.nomisweb.co.uk/api/v01/dataset/NM_xxx_1.data.csv?...`).
6. Paste that URL into the matching sector's `csvUrl` in
   `scripts/nomis-sectors.config.json` (see setup below).

## Setup & running the ingestion script

```bash
cp scripts/nomis-sectors.config.example.json scripts/nomis-sectors.config.json
# edit scripts/nomis-sectors.config.json: paste in each sector's csvUrl
# from the steps above (nomis-sectors.config.json is gitignored — it's
# local config, not committed, since the exact URL can change over time)

# .env.local needs:
#   NEXT_PUBLIC_SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY   (service role, not anon — this writes data)

npm run nomis:fetch
```

The script (`scripts/fetch-nomis-sectors.ts`):

1. Reads populations from `la_opportunity_metrics` (to compute `per_10k`).
2. Fetches each sector's CSV from Nomis.
3. Matches each Nomis geography name to an existing `la_name` — any Nomis
   row that doesn't match, or any local authority Nomis has no row for, is
   printed as a warning rather than silently dropped (local authority
   naming can drift slightly between ONS releases — e.g. "Herefordshire,
   County of" vs "Herefordshire" — so check the warnings on first run and
   adjust names in Supabase if needed).
4. Upserts into `la_sector_counts`, keyed on `(la_name, sector_key)` — safe
   to re-run any time to refresh the numbers.

It's safe to run from any machine that can reach `nomisweb.co.uk` and your
Supabase project directly — this cloud sandbox and the connected local
device VM used during development both have `nomisweb.co.uk` blocked by
their egress policy, the same restriction that blocks live FSA/Netlify
fetches from those sandboxes. Run it from a normal terminal, or wire it
into CI/a scheduled Netlify function later the same way `agent1:run` is
wired up.

## Extending further

To add a fifth sector later: generate one more Nomis query URL (steps
above), add one more entry to `nomis-sectors.config.json`, re-run
`npm run nomis:fetch`. No migration, no component change — `SECTORS` in
`OpportunityExplorer.tsx` is built from whatever `sector_key`s are present
in the data.

To add a sector from a different source entirely (not Nomis), insert rows
into `la_sector_counts` with a new `sector_key`/`sector_label`/`source` by
whatever means fits that source — the UI doesn't care where the row came
from.

## Not yet done

- The deprivation-based spending-power index mentioned in the product
  banner isn't built — that would be a separate ONS Indices of Multiple
  Deprivation import, out of scope for this change.
- `la_sector_counts` RLS mirrors `la_opportunity_metrics` (public read, no
  public write) — only the service-role key used by the ingestion script
  can write to it.
