# Parasite

This is the core API code for the Parasite torrent indexer. See
`doc/manual.md` for information about it, and how to install/use it

...Or, for the short version:
```sh
# A PostgreSQL database should be running in the background

git clone --depth=1 https://github.com/bit-bandit/parasite

cd parasite

# Edit the `database` options in `settings.ts` to match what your database has.

deno task start-server &
```

## Related Projects/Tools
- [`wormsctl`](https://github.com/rdbyk/9front/blob/master/lib/legal/mit) - CLI tool for 
  managing Parasite instances

## License

The source code and documention of Parasite is wholly licensed under the 0BSD license -
Basically, do whatever you want with this. Read `LICENSE` for more information, if you're curious.

### Some exceptions

- The default user avatar (`/static/default/avatar.png`) was taken from a
  library originating from the [9front](http://9front.org/) operating system,
  which is licensed under the MIT license. The original license for that can be found
  [here.](https://github.com/rdbyk/9front/blob/master/lib/legal/mit)
