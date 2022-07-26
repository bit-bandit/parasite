# Parasite Manual

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

```sh
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

(**NOTE:** If you're using a frontend, most of this stuff is probably abstracted
to hell and back, so it's probably better to read the documentation for _that_
than this.)

### Registering and Logging In

Creating an account on a vanilla instance of Parasite is stupidly easy. Send the
following payload to wherever your instance is hosted on:

```
POST /register
Content-Type: application/json
{ 
  "username": "yourUsername", 
  "password": "yourPassword" 
}
```

If nothing went wrong, the server should respond back with an idication that it
went though successfully.

Once that's done, post the same JSON payload, but this time, pointed to
`/login`. If nothing goes wrong, you'll be shown a JWT bearer token. You're
gonna wanna keep this, as it's used to verify requests on an instance, via the
`Authorization` header. More on that in a moment.

### Creating, and getting torrents

Being a torrent indexer, you can guess that torrents are pretty important to
Parasite - and as such, are made to be fairly easy to add.

To add a torrent, `POST` the following:

```
POST /t/
Content-Type: application/json
Authorization: Bearer <JWT Bearer Token>
{
  "type": "Create",
  "name": "A torrent!",
  "content": "Specifically, it's from the Blender Project! Cool guys!",
  "tags": "action,adventure,fantasy",
  "href":
    "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent",
}
```

Notes: The `content` tag is formatted in Markdown. The tags are comma-seperated.

Once successful, you'll get a response that's something around the lines of
this:

```
201 CREATED
Location: http://www.example.com/t/4dbc66e6ee4367dd62
Content-Type: application/activity+json
{ 
  msg: "Torrent 4dbc66e6ee4367dd62 created" 
}
```

Visit the URL in the `Location` header, and you'll get something like this:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/t/484c8038fc11f03753b5",
  "type": "Note",
  "attributedTo": "http://www.example.com/u/larvae",
  "name": "Torrent",
  "content": "<p>Specifically, it&#39;s from the Blender Project! Cool guys!</p>\n",
  "tag": [
    "http://www.example.com/i/action",
    "http://www.example.com/i/adventure",
    "http://www.example.com/i/fantasy"
  ],
  "attachment": {
    "type": "Link",
    "href": "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent"
  },
  "to": [
    "https://www.w3.org/ns/activitystreams#Public"
  ],
  "replies": "http://www.example.com/t/484c8038fc11f03753b5/r"
}
```

Congrats, You've just made your first torrent!

### Lists

Lists are simply collections of other things, including torrents, and even other
lists, and are rather dynamic by design.

To get started with a list, first gather a the URLs of the items you want to
include in your list (obviously). The order counts!

Once you've gathered your list, add the name of your list, and the summary you
want to include with it. The final request should look something like this:

```
POST /l/
Content-Type: application/json
Authorization: Bearer <JWT Bearer Token>
{
  "type": "Create",
  "name": "A list!",
  "summary": "Woah! A list! Wow!!",
  "tags": "horror,birds,2010",
  "orderedItems": [
    "http://www.example.com/t/46d8b6134a7d9dee564d",
    "http://www.example.com/t/42d28331ff9921482579",
    "http://www.example.com/t/497b9080c890730dc8e4",
    "http://www.example.com/l/4b55a7db66591537e2",
    "http://www.example.com/t/4457aa170c4cac365d1b",
    "http://www.example.com/t/45f79372e19bde01d900",
    "http://www.example.com/t/49e385b86e0c2e44381a",
    "http://www.example.com/t/4b9b8026079e344ca4ab",
    "http://www.example.com/t/4e73a56edc3e1a1506ed",
    "http://www.example.com/l/4dbc66e6ee4367dd62"
  ]
}
```

Similar to how we created the torrent, isn't it? Again, send the data, and
you'll get this:

```
201 CREATED
Location: http://www.example.com/l/4dbc66e6ee4367dd62
Content-Type: application/activity+json
{ 
  msg: "List 4dbc66e6ee4367dd62 created" 
}
```

Again, visit the URL in the `Location` header...

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/l/47f6933698521870bd96",
  "type": "OrderedCollection",
  "name": "A list!",
  "attributedTo": "http://www.example.com/u/larvae",
  "summary": "<p>Woah! A list! Wow!!</p>\n",
  "totalItems": 9,
  "replies": "http://www.example.com/l/47f6933698521870bd96/r",
  "orderedItems": [
    "http://www.example.com/t/46d8b6134a7d9dee564d",
    "http://www.example.com/t/42d28331ff9921482579",
    "http://www.example.com/t/497b9080c890730dc8e4",
    "http://www.example.com/l/4b55a7db66591537e2",
    "http://www.example.com/t/4457aa170c4cac365d1b",
    "http://www.example.com/t/45f79372e19bde01d900",
    "http://www.example.com/t/49e385b86e0c2e44381a",
    "http://www.example.com/t/4b9b8026079e344ca4ab",
    "http://www.example.com/t/4e73a56edc3e1a1506ed",
    "http://www.example.com/l/4dbc66e6ee4367dd62"
  ],
  "tag": [
    "http://www.example.com/i/horror",
    "http://www.example.com/i/birds",
    "http://www.example.com/i/2010"
  ],
  "updated": "2022-07-21T01:52:23.764Z"
}
```

Now, that wasn't so hard - Wasn't it?

### Actions

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
