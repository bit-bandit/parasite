# Actions API

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

#### GET `/x/:id`

Description: Get JSON object containing actions. Authorization: None Sample HTTP
payload:

```
GET /x/3cad06b52542ed42f2/
```

Response:

```
200 OK
Content-Type: application/activity+json
{
    "@context": "https://www.w3.org/ns/activitystreams",
    id: "http://www.example.com/x/3cad06b52542ed42f2",
    type: "Follow",
    actor: "http://www.example.com/u/larvae",
    summary: "http://www.example.com/u/larvae asks to follow http://sickos.social/u/bob",
    to: [ "https://www.w3.org/ns/activitystreams#Public" ]
}
```

#### POST `/x/follow`

Description: Attempt to follow an account.

Authorization: JWT Bearer Token.

Sample HTTP payload:

```
POST /x/follow
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "object": "http://sickos.social/u/bob"
}
```

Response:

```
201 CREATED
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "http://sickos.social/x/e0a4be5c3cd41",
  type: "Accept",
  actor: "http://sickos.social/u/bob",
  summary: "http://www.example.com/u/larvae following bob",
  to: [ "https://www.w3.org/ns/activitystreams#Public" ]
}
```

#### POST `/x/like`

Description: Attempt to like an object.

Authorization: JWT Bearer Token.

Sample HTTP payload:

```
POST /x/like
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Like",
  "object": http://www.example.com/t/cdcf46e9399a,
}
```

Response:

```
201 CREATED
Location: http://www.example.com/x/798ac40064c6d30d9c
Content-Type: application/activity+json
{
  msg: "Torrent 4f888f6071285d467433 added to likes collection"
}
```

#### POST `/x/dislike`

Description: Attempt to dislike an object.

Authorization: JWT Bearer Token.

Sample HTTP payload:

```
POST /x/like
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Dislike",
  "object": http://www.example.com/t/cdcf46e9399a,
}
```

Response:

```
201 CREATED
Location: http://www.example.com/x/d29b1c644f12ca2d03
Content-Type: application/activity+json
{
  msg: "Torrent 4f888f6071285d467433 added to dislikes collection"
}
```

#### POST `/x/comment`

Description: Attempt to comment on an object.

Authorization: JWT Bearer Token.

Sample HTTP payload:

```
POST /x/comment
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Create",
  "content": "Something different",
  "inReplyTo": http://sickos.social/t/cdcf46e9399a,
}
```

Response:

```
201 CREATED
Location: http://www.example.com/c/12ba973e8322f71bfb
Content-Type: application/activity+json
{
  msg: "Comment 3683e9ea39ce4650c7 added to Torrent http://sickos.social/t/cdcf46e9399a"
}
```

#### POST `/x/undo`

Description: Attempt to undo activities (IE Likes/Dislikes) on an object.

Authorization: JWT Bearer Token.

Sample HTTP payload:

```
POST /x/undo
Content-Type: application/json
Authorization: "Bearer 727172874583d577f674b607.0150df8c0f197555c43436b8.83b568cece6bf4c4a72ad529"
{
  "type": "Undo",
  "object": http://www.example.com/t/cdcf46e9399a,
}
```

Response:

```
201 CREATED
Location: http://www.example.com/x/1abb02aca0f181f2a8
Content-Type: application/json
{
  msg: "Actions by http://www.example.com/u/larvae on Torrent 4f888f6071285d467433 undone"
}
```
