# Parasite Manuel

## Introduction

### About

Parasite is a lightweight, federated torrent indexer.

### Why?

The majority of torrent indexers have several problems:

1. They aren't open source/free software.

- This goes against the file-sharing philosophy.
- The few that _are_ appear to be unmaintained.

2. They're very outdated from a technological standpoint, including:

- Being written for outdated software (Ancient versions of PHP, Python, Ruby,
  etc.)
- Having no _sane_, readily available API. You're going to have to rely on a
  seperate application to help get something you can actually use.

3. They aren't distributed/federated.

- Basically, the content uploaded to one site is limited to _just_ that one
  site. that might seem acceptable, but there are better ways to do that.
- The content might be distributed, but the means of delivering the content
  _isn't_.

Parasite is largely meant to answer these problems efficently, and effectivly.

- Free & Open-Source, under the most unrestrictive license we could think of
  (0BSD)
- Written in a modern language (TypeScript), using a modern, secure runtime
  (Deno)
- Federated, using the ActivityPub protocol - Distributing the means of
  delivering torrents to users.

### Notes

Parasite is rather minimal, compared to other torrent indexers, and especially
compared to other federated platforms. You're expected to configure the thing
yourself, and program/patch features you want yourself. This is easier than it
sounds, as it's fairly lightweight - Being under 3,500 source lines of code as
of this writing. If you have anything you might want in the API, don't be afraid
to ask!

## Installing

### Prerequisites

Parasite, in its default state, requires the following dependancies:

- Deno: Runtime
- PostgreSQL: Primary Database

### Installing the API server

Note: The database MUST be running in the background.

```
# Clone the source code
git clone --depth=1 https://github.com/bit-bandit/parasite

# Enter the directory
cd parasite/

# Edit `settings.ts` here, to your liking.

# Run the API server
deno task start-server
```

## Configuring

All configuration is readily accessable via. `settings.ts` in the base
directory. It should be fairly clear what does what in the file. If you're
confused about what something does, we recommend you either:

1. Read the source code.
2. Open an issue to ask the question directly.

### Roles

Roles are a series of permissions given to a user, that allow/disallow them to
do certain tasks. Roles can arbitrarily be added, edited, or modified.

## Usage

(**NOTE:** If you want a more direct understanding about how the API works,
check out the `routes` directory)

### Registering and Logging In

### Creating, and getting torrents

### Actions

### Lists

### Errors

All error responses follow this format:

```json
{
  "err": true,
  "msg": "Error message."
}
```

If you think something is wrong, investigate your request, check out the API
documentation, and see what might've went wrong.

## Administration

### Setting your roles.

A newly registered user is given whatever role is named in the `defaultRole`
parameter, in `settings.ts`. There's a couple of ways to give yourself an
`Admin` role, but for now, we'll talk about two ways in particular:

#### Temporarily set default role to `Admin`, register, and then change it back.

This is a very hackish method, but it works.

1. In `settings.ts`, set the `defaultRole` parameter to `Admin`.
2. Register your account (see 'Registering and Logging In' in the above section)
3. Set `defaultRole` back to `User`, unless you want every user to be an
   administrator.

#### Change it from within the database.

In the PostgreSQL shell (PSQL) enter the following command:

```sql
UPDATE users
SET roles = '{"createTorrents":true,"createLists":true,"createComments":true,"deleteOwnTorrents":true,"deleteOthersTorrents":true,"deleteOwnComments":true,"deleteOthersComments":true,"deleteOwnLists":true,"deleteOthersLists":true,"editUploads":true,"flag":true,"login":false,"vote":true}'
WHERE id = 'YourIDGoesHere'
```

### Reassigning roles

If you want to ban a user, you give them the `Banned` role. Here's how you'd do
that:

### Deleting posts

## Federating

Parasite takes multiple approaches to distributing posts, allowing for instances
owners to selectively choose what to allow on their platforms, and what to
reccomend. In `settings.ts`, the two parameters are available:

- `pooledInstances`: Instances you want to borrow items from.
- `blockedInstances`: Instances you don't want to interact with.

Here's a breif overview of what you can do with it:

### Basic Federating

This is the default behavior for instances. Basic federated instances can
deliver items towards an external post (Think commenting on a torrent, or liking
a list), and they can request items from another instance (Just by adding the
URL of the instance in their `pooledInstances`). However, items from one
instance can't be put onto another, unless it also has it pooled. That kind of
federating is covered down below:

### Pooled Federation

Pooled federating is identical to basic federating, with the exception that both
instances allow for content to be retrieved from both ends. Items like torrents,
or lists from both instances will be combined together in searches, and tags.

### Blocking

Blocking can be done from the user, and instance level. To block an instance,
add the host to the `blockedInstances` array in `settings.ts`

## Hacking

Modifying Parasites source code is encouraged. If you have any improvements,
send a pull request, or submit it as a patch.
