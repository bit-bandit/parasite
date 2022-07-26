# Lists API

## Format

#### METHOD `/route/`

Description: Description of route Authorization?: Required | None

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

#### GET `/l/:id`

Description: Get JSON object containing list. Authorization: None Sample HTTP
payload:

```
GET /l/47f6933698521870bd96
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/l/47f6933698521870bd96",
  "type": "OrderedCollection",
  "name": "A list!",
  "attributedTo": "http://www.example.com/u/bob",
  "summary": "<p>Something different</p>\n",
  "totalItems": 10,
  "replies": "http://www.example.com/l/47f6933698521870bd96/r",
  "orderedItems": [
    "http://www.example.com/t/46d8b6134a7d9dee564d",
    "http://www.example.com/t/42d28331ff9921482579",
    "http://www.example.com/t/497b9080c890730dc8e4",
    "http://www.example.com/t/4b55a7db665915371be2",
    "http://www.example.com/t/4457aa170c4cac365d1b",
    "http://www.example.com/t/45f79372e19bde01d900",
    "http://www.example.com/t/49e385b86e0c2e44381a",
    "http://www.example.com/t/4b9b8026079e344ca4ab",
    "http://www.example.com/t/4e73a56edc3e1a1506ed",
    "http://www.example.com/t/48e2bad4a4beff405b70"
  ],
  "tag": [
    "http://www.example.com/i/horror",
    "http://www.example.com/i/birds",
    "http://www.example.com/i/2010"
  ],
  "updated": "2022-07-21T01:52:23.764Z"
}
```

#### GET `/l/:id/r`

Description: Get JSON object containing replies to the list.

Authorization: None

Sample HTTP payload:

```
GET /l/47f6933698521870bd96/r
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/l/47f6933698521870bd96/r",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/c/b69f57da012c3e0b06"
  ]
}
```

#### GET `/l/:id/activity`

Description: Get JSON object containing ActivityStreams representation of the
creation of the list.

Authorization: None

Sample HTTP payload:

```
GET /l/47f6933698521870bd96/activity
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
  "type": "Update",
  "id": "http://www.example.com/l/47f6933698521870bd96/activity",
  "actor": "http://www.example.com/u/bob",
  "object": {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": "http://www.example.com/l/47f6933698521870bd96",
    "type": "OrderedCollection",
    "name": "A list!",
    "attributedTo": "http://www.example.com/u/bob",
    "summary": "<p>Something different</p>\n",
    "totalItems": 10,
    "replies": "http://www.example.com/l/47f6933698521870bd96/r",
    "orderedItems": [
      "http://www.example.com/t/46d8b6134a7d9dee564d",
      "http://www.example.com/t/42d28331ff9921482579",
      "http://www.example.com/t/497b9080c890730dc8e4",
      "http://www.example.com/t/4b55a7db665915371be2",
      "http://www.example.com/t/4457aa170c4cac365d1b",
      "http://www.example.com/t/45f79372e19bde01d900",
      "http://www.example.com/t/49e385b86e0c2e44381a",
      "http://www.example.com/t/4b9b8026079e344ca4ab",
      "http://www.example.com/t/4e73a56edc3e1a1506ed",
      "http://www.example.com/t/48e2bad4a4beff405b70"
    ],
    "tag": [
      "http://www.example.com/i/horror",
      "http://www.example.com/i/birds",
      "http://www.example.com/i/2010"
    ],
    "updated": "2022-07-21T01:52:23.764Z"
  },
  "cc": "http://www.example.com/u/bob/followers"
}
```

#### GET `/l/:id/likes`

Description: Get JSON object containing people who liked the list.
Authorization: None Sample HTTP payload:

```
GET /l/47f6933698521870bd96/likes
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/l/47f6933698521870bd96/likes",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/u/bob"
  ]
}
```

#### GET `/l/:id/dislikes`

Description: Get JSON object containing people who disliked the list.

Authorization: None

Sample HTTP payload:

```
GET /l/47f6933698521870bd96/dislikes
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/l/47f6933698521870bd96/dislikes",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/u/bob"
  ]
}
```

#### GET `/l/:id/flags`

Description: Get JSON object containing people who flagged the list.

Authorization: None

Sample HTTP payload:

```
GET /l/47f6933698521870bd96/flags
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://www.example.com/l/47f6933698521870bd96/flags",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://www.example.com/u/bob"
  ]
}
```

### POST /l/

Description: Create list object, and send to followers.

Authorization: JWT Bearer Token

Sample HTTP Payload:

```
POST /l/
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Create",
  "name": "A list!",
  "summary": "Woah! A list! Wow!!",
  "tags": "horror,birds,2010",
  "orderedItems": [
    "http://www.example.com/t/46d8b6134a7d9dee564d",
    "http://www.example.com/t/42d28331ff9921482579",
    "http://www.example.com/t/497b9080c890730dc8e4",
    "http://www.example.com/t/4b55a7db665915371be2",
    "http://www.example.com/t/4457aa170c4cac365d1b",
    "http://www.example.com/t/45f79372e19bde01d900",
    "http://www.example.com/t/49e385b86e0c2e44381a",
    "http://www.example.com/t/4b9b8026079e344ca4ab",
    "http://www.example.com/t/4e73a56edc3e1a1506ed",
    "http://www.example.com/t/48e2bad4a4beff405b70",
  ]
}
```

Response:

```
201 CREATED
Location: http://www.example.com/l/4dbc66e6ee4367dd62
Content-Type: application/activity+json
{ 
  msg: "List 4dbc66e6ee4367dd62 created" 
}
```

### POST `/l/:id` + Options

`POST /l/:id` is a broad route that encompasses nearly everything relating to
modifying a list. Much of what can be sent to it is handeled from within `/x/`
(see `doc/actions.md` for more information about that).

Every object sent to this route requires a `Type` parameter within the JSON sent
to it. Below are the actions/options that can result from altering the value of
`Type`:

#### `Type: "Create"`

**Headers required:** `Authorization`: HTTP Signature.

Requires creation of a comment, with the ID of said comment in the `object`
field. If all is well, the ID of the comment will be added to the `replies`
object of the list.

Comments can be created via `/x/comment`

#### `Type: "Like"`

**Headers required:** `Authorization`: HTTP Signature.

Requires creation of a object indicating that the user liked the object. If all
is well, the ID of the user will be added to the `likes` object of the list.

Like can be created via `/x/like`

#### `Type: "Dislike"`

**Headers required:** `Authorization`: HTTP Signature.

Requires creation of a object indicating that the user disliked the object. If
all is well, the ID of the user will be added to the `dislikes` object of the
list.

Like can be created via `/x/dislike`

#### `Type: "Update"`

**Headers required:** `Authorization`: JWT Bearer Token.

**Local only - Requires `editUploads` permission** If all is well, the content
will overwrite the previous content of the list.

Authorization: None

Sample HTTP payload:

```
POST /l/4dbc66e6ee4367dd62
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Update",
  "name": "New Name"
  "content": "Something different",
  "orderedItems": [
    "http://www.example.com/t/1247f47a9ea79b461ba2",
    "http://www.example.com/t/38f7a376db05fc10eca2",
  ]
}
```

Response:

```
200 OK
Content-Type: application/activity+json
{ 
  msg: "List 4dbc66e6ee4367dd62 updated" 
}
```

#### `Type: "Remove" | "Delete"`

**Headers required:** `Authorization`: HTTP Signature.

**Local only. Requires `deleteOwnLists` or `deleteOwnLists` permission** If all
is well, the list will be removed from the database.

```
POST /l/4dbc66e6ee4367dd62
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
  msg: "List 4dbc66e6ee4367dd62 deleted" 
}
```

#### `Type: "Flag"`

**Headers required:** `Authorization`: HTTP Signature.

**Local only. Requires `flag` permission** If all is well, the object will be
flagged.

```
POST /l/4dbc66e6ee4367dd62
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
  msg: "List 4f888f6071285d467433 flagged"
}
```

#### `Type: "Undo"`

**Headers required:** `Authorization`: HTTP Signature.

Requires user to have previously interacted with an object. If all is well, the
ID of the user will removed from the related collect of the object that they
interacted with.

Undo can be created via `/x/undo`
