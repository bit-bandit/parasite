# Testing

Testing suite for Parasite.

## Prerequisites

All testing is to be done with an out-of-the-box configuration of Parasite (That
is, no modifications done to `settings.ts`, or anything else), and PostgreSQL.
We suggest using containers to make the process of setting it up less of a pain
in the ass:

```sh
docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_USER=admin -e POSTGRES_DB=parasite --name pg_db_container postgres
```

If your distribution is anal about licensing, replace `docker` with `podman`.

You MUST have a running Parasite server to do these tests. See the `readme` in
the root directory to see how to do that. Once you have one up and accepting
connections, it's as easy as:

```
deno test --allow-net user.ts torrent.ts
```

Add and remove tests to your liking.

## Writing tests

- Limit yourself to `fetch` when doing HTTP requests.
- Use whatever exportable function is available in `src/` whenever you may need
  it.
- Remember to stringify your fucking JSON.

## TODO

- Add CSV sample file to import/export data. (see
  https://skyvia.com/blog/complete-guide-on-how-to-import-and-export-csv-files-to-postgresql)
- Add tests for user authentication.
- Add tests for comment/list/torrent creation/updating/deletion.
