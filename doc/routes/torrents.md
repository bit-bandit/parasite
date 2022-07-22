# Torrents API

## Format

#### METHOD `/route/`

Description: Description of route

Authorization?: Required | None

Sample HTTP payload?:

```
POST /route/
Content-Type: application/json
Authorization: Bearer foihvoicwojwpwihfg3970r7u3jode0c-9w8hi 
{
  "msg": "Hello, World!"
}
```

Response?:

```
200 OK
Content-Type: application/json
{
  "res": "Hello to you too!"
}
```

? = Option parameter/Section.

## Routes

#### GET `/t/:id`

Description: Get JSON object containing torrent.

Authorization: None

Sample HTTP payload:

```
GET /t/484c8038fc11f03753b5
```

Response:

```
200 OK
Content-Type: application/activity+json
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

#### GET `/t/:id/r`

Description: Get JSON object containing replies to torrent.

Authorization: None

Sample HTTP payload:

```
GET /t/484c8038fc11f03753b5/r
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/t/484c8038fc11f03753b5/r",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/c/c39a216fe7092b09ce"
  ]
}
```

#### GET `/t/:id/activity`

Description: Get JSON object containing ActivityStreams representation of the
creation of the torrent.

Authorization: None

Sample HTTP payload:

```
GET /t/484c8038fc11f03753b5/activity
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "id": "http://www.example.com/t/484c8038fc11f03753b5/activity",
  "actor": "http://www.example.com/u/bob",
  "object": {
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
  },
  "cc": "http://www.example.com/u/bob/followers"
}
```

#### GET `/t/:id/likes`

Description: Get JSON object containing people who liked the torrent.
Authorization: None Sample HTTP payload:

```
GET /t/484c8038fc11f03753b5/likes
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/t/484c8038fc11f03753b5/likes",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/u/bob"
  ]
}
```

#### GET `/t/:id/dislikes`

Description: Get JSON object containing people who disliked the torrent.

Authorization: None

Sample HTTP payload:

```
GET /t/484c8038fc11f03753b5/dislikes
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/t/484c8038fc11f03753b5/dislikes",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/u/bob"
  ]
}
```

#### GET `/t/:id/flags`

Description: Get JSON object containing people who flagged the torrent.

Authorization: None

Sample HTTP payload:

```
GET /t/484c8038fc11f03753b5/flags
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/t/484c8038fc11f03753b5/flags",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/u/bob"
  ]
}
```

### POST /t/

Description: Create Torrent object, and send to followers.

Authorization: JWT Bearer Token

Sample HTTP Payload:

```
POST /t/4dbc66e6ee4367dd62
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Create",
  "name": "Torrent Title!",
  "content": "Specifically, it's from the Blender Project! Cool guys!",
  "tags": "action,adventure,fantasy",
  "href":
    "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent",
}
```

Response:

```
201 CREATED
Location: http://www.example.com/t/4dbc66e6ee4367dd62
Content-Type: application/activity+json
{ 
  msg: "Torrent 4dbc66e6ee4367dd62 created" 
}
```

### POST `/t/:id` + Options

`POST /t/:id` is a broad route that encompasses nearly everything relating to
modifying a torrent/object. Much of what can be sent to it is handeled from
within `/x/` (see `doc/actions.md` for more information about that).

Every object sent to this route requires a `Type` parameter within the JSON sent
to it. Below are the actions/options that can result from altering the value of
`Type`:

#### `Type: "Create"`

**Headers required:** `Signature`: HTTP Signature.

Requires creation of a comment, with the ID of said comment in the `object`
field. If all is well, the ID of the comment will be added to the `replies`
object of the torrent.

Comments can be created via `/x/comment`

#### `Type: "Like"`

**Headers required:** `Signature`: HTTP Signature.

Requires creation of a object indicating that the user liked the object. If all
is well, the ID of the user will be added to the `likes` object of the torrent.

Like can be created via `/x/like`

#### `Type: "Dislike"`

**Headers required:** `Signature`: HTTP Signature.

Requires creation of a object indicating that the user disliked the object. If
all is well, the ID of the user will be added to the `dislikes` object of the
torrent.

Like can be created via `/x/dislike`

#### `Type: "Update"`

**Headers required:** `Authorization`: JWT Bearer Token.

**Local only - Requires `editUploads` permission** If all is well, the content
will overwrite the previous content of the torrent.

Authorization: None

Sample HTTP payload:

```
POST /t/4dbc66e6ee4367dd62
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Update",
  "name": "New Name"
  "content": "Something different",
}
```

Response:

```
200 OK
Content-Type: application/activity+json
{ 
  msg: "Torrent 4dbc66e6ee4367dd62 updated" 
}
```

#### `Type: "Remove" | "Delete"`

**Headers required:** `Signature`: HTTP Signature.

**Local only. Requires `deleteOwnComments` or `deleteOthersComments`
permission** If all is well, the torrent will be removed from the database.

```
POST /t/4dbc66e6ee4367dd62
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Remove",
}
```

Response:

```
200 OK
Content-Type: application/activity+json
{ 
  msg: "Torrent 4dbc66e6ee4367dd62 deleted" 
}
```

#### `Type: "Flag"`

**Headers required:** `Signature`: HTTP Signature.

**Local only. Requires `flag` permission** If all is well, the object will be
flagged.

```
POST /c/4dbc66e6ee4367dd62
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Flag",
}
```

```
200 OK
Content-Type: application/activity+json
{ 
  msg: "Torrent 4f888f6071285d467433 flagged"
}
```

#### `Type: "Undo"`

**Headers required:** `Signature`: HTTP Signature.

Requires user to have previously interacted with an object. If all is well, the
ID of the user will removed from the related collect of the object that they
interacted with.

Undo can be created via `/x/undo`
