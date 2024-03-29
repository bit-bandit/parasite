// ActivityStreams/ActivityPub helper stuff.

// Before we get into the code, read this wall of text:

// Resources (You're gonna need them):
//   ActivityStreams spec: https://www.w3.org/TR/activitystreams-core/
//   ActivityStreams vocab: https://www.w3.org/TR/activitystreams-vocabulary/
//   Introduction to ActivityPub: https://socialhub.activitypub.rocks/t/introduction-to-activitypub/508
//   Reading ActivityPub: https://tinysubversions.com/notes/reading-activitypub/
//   ActivityPub spec: https://www.w3.org/TR/activitypub/
//   Guide for ActivityPub implementers: https://socialhub.activitypub.rocks/t/guide-for-new-activitypub-implementers/479

// Additionally, we'll link some blogs written by people who've actually had to go
// through the hell of implimenting just *some* of ActivityPub, and a Git repo
// of a basic instance.

// https://docs.joinmastodon.org/spec/activitypub/
// https://hacks.mozilla.org/2018/11/decentralizing-social-interactions-with-activitypub/
// https://blog.joinmastodon.org/2018/07/how-to-make-friends-and-verify-requests/
// https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/
// https://docs.joinmastodon.org/spec/activitypub/
// https://github.com/dariusk/express-activitypub

// Now That that's all out of the way; Know that only a small portion of this matters.
// We're only implimenting a small subsection of ActivityPub (Hell, we're not even using JSON-LD),
// Because we, fundamentally, don't need a *lot* to do it. All we're implimenting, as of right now,
// Are:

// ActivityPub:
// Inbox/Outbox (5.1, 5.2)
// Following/Follows (5.3, 5.4)
// Liked Posts (5.7)
// Actors (4)
// Server-to-server applications (7)

// ActivityStreams:
// `actor` objects
// `object` objects (Mainly just Notes)
// `replies`
// `OrderedCollection`
// `Like`
// `Dislike`
// `inReplyTo`
// `url/href`
// `icon`
// `id`

// Shared inbox(7.1.3 ) may be implimented in the future.

// That may have been a hyge list, but trust us when we say it's nothing
// in the grand scheme of ActivityPub/Streams.
// We don't use a lot, mainly because a lot of it isn't nessicary for
// the application we need (What purpose does sharing a post have with a
// Torrent index, for example?)

// Types for ActivityStreams.
// A LOT of this came from a different, seperate file I wrote a while back.
// Be aware this might be buggy as shit/noncomplaint.
export interface ActivityCrypto {
  id: string;
  owner: string;
  publicKeyPem: string;
}

export interface ActivityLink {
  /**
   * Anything that can be a URL component,
   */
  "type": string;
  href?: string;
  rel?: string;
  mediaType?: string;
  name?: string;
  hreflang?: string;
  // height and width have been deliberately removed.
}

export interface ActivityObject {
  "@context"?: string[] | string;
  attachment?:
    | ActivityObject[]
    | ActivityLink[]
    | ActivityObject
    | ActivityLink;
  id?: string;
  attributedTo?: string;
  audience?: string;
  content?: string;
  name?: string;
  endTime?: string;
  generator?: string;
  icon?: string[] | string;
  image?: ActivityImage[] | ActivityImage | string[] | string;
  inReplyTo?: string;
  location?: string;
  preview?: string;
  published?: string;
  replies?:
    | ActivityCollection[]
    | ActivityObject[]
    | ActivityCollection
    | string;
  startTime?: string;
  summary?: string;
  tag?: ActivityLink[] | ActivityObject[];
  type?:
    | "Article"
    | "Audio"
    | "Collection"
    | "Document"
    | "Event"
    | "Image"
    | "Note"
    | "Page"
    | "Place"
    | "Profile"
    | "Relationship"
    | "Tombstone"
    | "Video";
  updated?: string;
  url?: string;
  to?: string[] | string;
  bto?: string;
  cc?: string[] | string;
  bcc?: string[] | string;
  mediaType?: string;
  duration?: string;
  publicKey?: ActivityCrypto;
}

export interface ActivityCollection extends Omit<ActivityObject, "type"> {
  type?: "Collection" | "OrderedCollection";
  totalItems?: number;
  current?: string;
  first?: string;
  last?: string;
  items?: ActivityObject[] | string[];
}

// Have to seperate this one from the others because of collision reasons...interface ActivityCollectionPage extends Omit<ActivityObject, "type"> {
export interface ActivityCollectionPage extends Omit<ActivityObject, "type"> {
  type?: "CollectionPage";
  totalItems?: number;
  current?: string;
  first?: string;
  last?: string;
  items?: ActivityObject[] | string[];
  orderedItems?: ActivityObject[] | string[];
  partOf?: string;
  next?: string;
}

export interface ActivityWrapper extends Omit<ActivityObject, "type"> {
  type: string; // Gonna be lazy with this one...
  object: ActivityObject;
}

export interface ActivityImage extends ActivityLink {
  height?: number;
  width?: number;
  preview?: string;
}

// Generate the actual object with the magnet link (AKA; The 'Pub' part of ActivityPub)
export function genObj(params: unknown = {}): ActivityObject {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": params.id,
    "type": params.type ?? "Note", // In case we can't be shitted to write this down, keep note in.
    "published": params.published,
    "attributedTo": params.actor,
    "name": params.name,
    "mediaType": "text/html",
    "content": params.content,
    "tag": params.tags,
    "attachment": {
      "type": "Link",
      "mediaType": "application/x-bittorrent;x-scheme-handler/magnet",
      "href": params.link,
    },
    "to": ["https://www.w3.org/ns/activitystreams#Public"], // All posts are public; Sorry!
    "replies": `${params.id}/r`,
  };
}
// Create reply object.
export function genReply(params: unknown = {}): ActivityObject {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": params.id,
    "type": params.type ?? "Note", // In case we can't be shitted to write this down, keep note in.
    "published": params.published, // TODO: Figure out how the fuck ActivityStreams does dates
    "attributedTo": params.actor,
    "mediaType": "text/html",
    "content": params.content,
    "inReplyTo": params.inReplyTo,
    "to": ["https://www.w3.org/ns/activitystreams#Public"], // All posts are public; Sorry!
    "replies": `${params.id}/r`,
  };
}

export function genInvitationReply(params: unknown = {}) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": params.id,
    "type": params.type ?? "Note", // In case we can't be shitted to write this down, keep note in.
    "actor": params.actor,
    "summary": params.summary,
    "object": params.object,
    "to": ["https://www.w3.org/ns/activitystreams#Public"], // All posts are public; Sorry!
  };
}

export function genVote(params: unknown = {}) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "type": params.type,
    "actor": params.actor,
    "summary": `Voted: ${params.actor}`,
    "object": params.object,
    "to": ["https://www.w3.org/ns/activitystreams#Public"],
    "cc": params.to,
  };
}

// See 4.1: Actor objects for more understandings on how to do this shit.

export function actorObj(params: unknown = {}) {
  // Notes: Image is used for user banners, icons are used for, well, icons.
  // This is because Mastodon, and Pleroma do it, so we're gonna have to
  // follow the bandwagon, there.
  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    "type": "Person",
    "id": params.actor,
    "following": params.following,
    "followers": params.followers,
    "liked": params.liked,
    "inbox": params.inbox,
    "outbox": params.outbox,
    "name": params.name,
    "preferredUsername": params.preferredUsername,
    "summary": params.summary,
    "publicKey": {
      "id": params.keyURL,
      "owner": params.actor,
      "publicKeyPem": params.key,
    },
    "icon": params.icon,
    "image": params.banner,
  };
}

// We should note this isn't *required* by the standard, but due to paranoia,
// we're adding it anyways.
export function wrapperCreate(params: unknown = {}): ActivityWrapper {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "type": "Create",
    // NOTE: ID is NOT the object ID; it's a seperate URL that indicates an object is created. (6.2)
    "id": params.id,
    "actor": params.actor,
    "object": params.object,
    "published": params.object.published,
    "cc": params.to,
  };
}

export function wrapperUpdate(params: unknown = {}): ActivityWrapper {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "type": "Update",
    // NOTE: ID is NOT the object ID; it's a seperate URL that indicates an object is updated. (6.2)
    "id": params.id,
    "actor": params.actor,
    "object": params.object,
    "published": params.object.published,
    "cc": params.to,
  };
}

// With some exceptions - Namely for inboxes/outboxes, and search results
// - We only store items via. their URLs.
export function genOrderedCollection(
  id: string,
  items: (ActivityObject | ActivityLink)[] = [],
  params: unknown = {},
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": id,
    "type": "OrderedCollection",
    "name": params.name,
    "attributedTo": params.actor,
    "published": params.published,
    "mediaType": "text/html",
    "summary": params.summary,
    "totalItems": items.length,
    "replies": params.replies,
    "orderedItems": items,
    "tag": params.tags,
  };
}
