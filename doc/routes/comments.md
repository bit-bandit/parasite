# Comments API

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

#### GET `/c/:id`

Description: Get JSON object containing comment. Authorization: None Sample HTTP
payload:

```
GET /c/4dbc66e6ee4367dd62
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "http://localhost:8080/c/4dbc66e6ee4367dd62",
  type: "Note",
  published: "2022-07-18T01:19:27.132Z",
  attributedTo: "http://localhost:8080/u/larvae",
  content: "<p>Worms!</p>\n",
  inReplyTo: "http://localhost:8080/t/d784e375b5a9fdd6b4",
  to: [ "https://www.w3.org/ns/activitystreams#Public" ],
  replies: "http://localhost:8080/c/4dbc66e6ee4367dd62/r"
}
```

#### GET `/c/:id/r`

Description: Get JSON object containing replies to comment. Authorization: None
Sample HTTP payload:

```
GET /c/4dbc66e6ee4367dd62/r
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "http://localhost:8080/c/4dbc66e6ee4367dd62/r",
  type: "OrderedCollection",
  totalItems: 1,
  orderedItems: [ "http://localhost:8080/c/d784e375b5a9fdd6b4" ]
}
```

#### GET `/c/:id/activity`

Description: Get JSON object containing ActivityStreams representation of the
creation of the comment. Authorization: None Sample HTTP payload:

```
GET /c/fg23821cadc2/activity
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  type: "Create",
  id: "http://localhost:8080/c/4dbc66e6ee4367dd62/activity",
  actor: "http://localhost:8080/u/larvae",
  object: {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: "http://localhost:8080/c/4dbc66e6ee4367dd62",
    type: "Note",
    published: "2022-07-18T01:19:27.132Z",
    attributedTo: "http://localhost:8080/u/larvae",
    content: "<p>Worms!</p>\n",
    inReplyTo: "http://localhost:8080/t/d784e375b5a9fdd6b4",
    to: [ "https://www.w3.org/ns/activitystreams#Public" ],
    replies: "http://localhost:8080/c/4dbc66e6ee4367dd62/r"
  },
  published: "2022-07-18T01:19:27.132Z",
  cc: "http://localhost:8080/u/bob/followers"
}
```

#### GET `/c/:id/likes`

Description: Get JSON object containing people who liked the comment.
Authorization: None Sample HTTP payload:

```
GET /c/fg23821cadc2/likes
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "http://localhost:8080/c/4dbc66e6ee4367dd62/likes",
  type: "OrderedCollection",
  totalItems: 1,
  orderedItems: [ "http://localhost:8080/u/bob" ]
}
```

#### GET `/c/:id/dislikes`

Description: Get JSON object containing people who disliked the comment.

Authorization: None

Sample HTTP payload:

```
GET /c/fg23821cadc2/dislikes
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "http://localhost:8080/c/4dbc66e6ee4367dd62/dislikes",
  type: "OrderedCollection",
  totalItems: 1,
  orderedItems: [ "http://localhost:8080/u/bill" ]
}
```

#### GET `/c/:id/flags`

Description: Get JSON object containing people who flagged the comment.
Authorization: None Sample HTTP payload:

```
GET /c/fg23821cadc2/flags
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "http://localhost:8080/c/4dbc66e6ee4367dd62/flags",
  type: "OrderedCollection",
  totalItems: 1,
  orderedItems: [ "http://localhost:8080/u/bill" ]
}
```

### POST `/c/:id` + Options

`POST /c/:id` is a broad route that encompasses nearly everything relating to
modifying a comment/object. Much of what can be sent to it is handeled from
within `/x/` (see `doc/actions.md` for more information about that).

Every object sent to this route requires a `Type` parameter within the JSON sent
to it. Below are the actions/options that can result from altering the value of
`Type`:

#### `Type: "Create"`

**Headers required:** `Signature`: HTTP Signature.

Requires creation of a comment, with the id of said comment in the `object`
field. If all is well, the ID of the comment will be added to the `replies`
object of the comment.

Comment can be created via `/x/comment`

#### `Type: "Like"`

**Headers required:** `Signature`: HTTP Signature.

Requires creation of a object indicating that the user liked the object. If all
is well, the ID of the user will be added to the `likes` object of the comment.

Like can be created via `/x/like`

#### `Type: "Dislike"`

**Headers required:** `Signature`: HTTP Signature.

Requires creation of a object indicating that the user disliked the object. If
all is well, the ID of the user will be added to the `dislikes` object of the
comment.

Like can be created via `/x/dislike`

#### `Type: "Update"`

**Headers required:** `Signature`: HTTP Signature.

**Local only - Requires `editUploads` permission** If all is well, the content
will overwrite the previous content of the comment.

Description: Get JSON object containing people who disliked the comment.

Authorization: None

Sample HTTP payload:

```
POST /c/4dbc66e6ee4367dd62
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Update",
  "content": "Something different",
}
```

Response:

```
200 OK
Content-Type: application/activity+json
{ 
  msg: "Comment 4dbc66e6ee4367dd62 updated" 
}
```

#### `Type: "Remove" | "Delete"`

**Headers required:** `Signature`: HTTP Signature.

**Local only. Requires `deleteOwnComments` or `deleteOthersComments`
permission** If all is well, the comment will be removed from the database.

```
POST /c/4dbc66e6ee4367dd62
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
  msg: "Comment 4dbc66e6ee4367dd62 deleted" 
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
  "type": "Remove",
}
```

```
200 OK
Content-Type: application/activity+json
{ 
  msg: "Comment 4f888f6071285d467433 flagged"
}
```

#### `Type: "Undo"`

**Headers required:** `Signature`: HTTP Signature.

Requires user to have previously interacted with an object. If all is well, the
ID of the user will removed from the object that they interacted with.

Undo can be created via `/x/undo`
