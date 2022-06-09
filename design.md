# Design of the Parasite torrent indexer

## Introduction
The following document is a an overview/cohesive explaination of Parasite.

### Recommended reading
Reading the following documents is suggested, before diving into this:
- [ActivityPub specification](https://www.w3.org/TR/activitypub/)
- [ActivtyStreams specification](https://www.w3.org/TR/activitystreams-vocabulary/)
- [*Reading ActivityPub*, a highly informal post explaining certain aspects of the standard.](https://tinysubversions.com/notes/reading-activitypub/)
- [ActivityPub implimentation sheet by Mastodon](https://docs.joinmastodon.org/spec/activitypub/)
- [W3C Security Vocab Specification](https://w3c-ccg.github.io/security-vocab/)

### Placeholders used throughout
- `https://torrents.sickos.social` is used as an example URL throughout this document.
- `larvae`, `mothra`, and `phillip` are example users we'll constantly refer to throughout.

## Torrents
Torrents - Indicated by `/t/` - Are the core of Parasite. A sample JSON payload of one, following a `GET` request, is like so: 
```json
{
   "@context":"https://www.w3.org/ns/activitystreams",
   "id":"https://sickos.social/t/c-4f6085236902",
   "type":"Create",
   "actor":"https://sickos.social/u/sigma-ffa4dd",
   "to":[
"https://www.w3.org/ns/activitystreams#Public"
   ],
   "object":{
      "id":"https://torrents.sickos.social/t/500df719166b",
      "type":"Note",
      "published":"2022-02-13T22:33:24.315Z",
      "attributedTo":"https://torrents.sickos.social/u/larvae",
      "name": "Sintel (Torrent)",
      "content":"<p>Have a torrent you won't get sued over! Kudos to the Blender foundation for making this one, and for free!</p>",
      "attachment": {
         "type": "Link",
         "href": "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent"
         },
      "to":["https://www.w3.org/ns/activitystreams#Public"]
   }
}
```
Torrent IDs are randomized. All torrents are explicitly public.

### Tags
Tags, directly from the `tag` element from ActivityStreams, are used to indicate the content of the object in question. So, if a person
wanted to tag a torrent, or list as being apart of the 'Western' tag, that would be represented as:

```json
"tag": [
    {
      "id": "https://torrents.sickos.social/tags/western", // This is in the spec, which is why I was trying to push it earlier...
      "name": "Western"
    }
  ]
```

These apply to only torrents, or lists. 

## Users
Users: `/u/:id`

## Comments
Comments: `/c/:id`

An ID of a comment consists of the ID of the torrent being replied to, and a random UUID, joined with a hyphen. So an ID of a comment, replying to
a torrent with an ID of `500df719166b` may look like:

`/c/500df719166b-3e5d915717e3`

## Lists
A list is, in ActivityStreams vocabulary, an `OrderedCollection`. What this means in practice is that it can store just about any piece of arbitrary
information available - Including torrents, users, and even other lists. Some built in redundancy prevention is included - You can't add an item to a
list if it is already present within it.

## Voting
Voting is a two-way system, allowing for users to either **upvote**, or **downvote** an object.

## Administration

### Roles

## Instance settings
