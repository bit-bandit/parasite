# Users API

## Routes

#### `POST /register`

Description: Add an account to the instance registry.

Authorization: None.

Sample HTTP payload:

```
POST /register
Content-Type: application/json
{ 
  "username": "bob", 
  "password": "subgenius" 
}
```

Response:

```
201 CREATED
Content-Type: application/json
{
  "msg": "User bob created"
}
```

#### `POST /login`

Description: Get a JWT key associated with an account in the instance registry.

Authorization: None.

Sample HTTP payload:

```
POST /login
Content-Type: application/json

{ 
  "username": "bob", 
  "password": "subgenius" 
}
```

Response:

Response:

```
200 OK
Content-Type: text/plain

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

#### `GET /u/:id`

Description: Get JSON object representing user.

Authorization: None.

Sample HTTP Payload:

```
GET http://localhost:8080/u/bob
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1"
  ],
  "type": "Person",
  "id": "http://localhost:8080/u/bob",
  "following": "http://localhost:8080/u/bob/following",
  "followers": "http://localhost:8080/u/bob/followers",
  "liked": "http://localhost:8080/u/bob/likes",
  "inbox": "http://localhost:8080/u/bob/inbox",
  "outbox": "http://localhost:8080/u/bob/outbox",
  "name": "bob",
  "summary": "",
  "publicKey": {
    "id": "http://localhost:8080/u/bob/main-key",
    "owner": "http://localhost:8080/u/bob",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2lRJx5zw9babXkfEJNrjF4vFFTnXKU0kZ1kltSVWfyRcd44gaU+yhPVitez/YRJvihOdc1NeKzPBwfgJlnU1a6EEh71IlyZdkp+rIIPij5tIcSkyq+u4oDR5xkiXQhcxk2L5eYZlrIr3LKkfehEtwwRIoq14aXBlK9nMT0WdkogOwmDyQRwLaWcUFq7ZcBCw0xCClZpiOWS7+7tj3g2TxwEUPUuQdcXEDMyNOKTuoUq7BxFtKwu14AN1lMO6jVAHhrKOD9gFrgfULNDsIax0BcDDEQYzeASeZdKMsOo47+zAw6nipzUloZAb8huCBRVl1GyE9lYUOG1m/slo+fTd2wIDAQAB\n-----END PUBLIC KEY-----"
  },
  "icon": [
    "http://localhost:8080/m/u/bob/avatar.png"
  ],
  "image": "http://localhost:8080/m/u/bob/banner.png"
}
```

#### `GET /u/:id/outbox`

Description: Get JSON object containing posts created by the user.

Authorization: None.

Sample HTTP Payload:

```
GET http://localhost:8080/u/bob/outbox
```

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://localhost:8080/u/bob/outbox",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    {
      "@context": "https://www.w3.org/ns/activitystreams",
      "type": "Create",
      "id": "http://localhost:8080/c/12ba973e8322f71bfb/activity",
      "actor": "http://localhost:8080/u/bob",
      "object": {
        "@context": "https://www.w3.org/ns/activitystreams",
        "id": "http://localhost:8080/c/12ba973e8322f71bfb",
        "type": "Note",
        "published": "2022-07-22T17:31:54.423Z",
        "attributedTo": "http://localhost:8080/u/bob",
        "content": "<p>Something different</p>\n",
        "inReplyTo": "http://localhost:8080/t/4ed4b00f08c0118ab260",
        "to": [
          "https://www.w3.org/ns/activitystreams#Public"
        ],
        "replies": "http://localhost:8080/c/12ba973e8322f71bfb/r"
      },
      "published": "2022-07-22T17:31:54.423Z",
      "cc": "http://localhost:8080/u/bob/followers"
    }
  ]
}
```

#### `GET /u/:id/inbox`

Description: Get JSON object containing posts created by followed users.

Authorization: None.

Sample HTTP Payload:

```
GET http://localhost:8080/u/bob/inbox
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://localhost:8080/u/bob/inbox",
  "type": "OrderedCollection",
  "totalItems": 19,
  "orderedItems": [
    "http://localhost:8080/t/4ed4b00f08c0118ab260/activity",
    "http://localhost:8080/c/12ba973e8322f71bfb/activity",
    "http://localhost:8080/c/fd99468cd9047e874b/activity",
    "http://localhost:8080/t/4f0591b02ba53da45417/activity",
    "http://localhost:8080/c/ff99495509e68a8846/activity",
    "http://localhost:8080/c/b38f857ff5b27a8ff0/activity",
    "http://localhost:8080/t/434dad670fafa7339002/activity",
    "http://localhost:8080/t/46b9b94aca5b986a70e8/activity",
    "http://localhost:8080/t/4079adaaac18ff4076e9/activity",
    "http://localhost:8080/t/403b99fbcb736d21d6a4/activity",
    "http://localhost:8080/t/4c35b2e3bf9ece5ba37b/activity",
    "http://localhost:8080/t/4fbcb7011f997b6308be/activity",
    "http://localhost:8080/t/4951a15e7b205064489d/activity",
    "http://localhost:8080/t/47048fdfe083d759f0b6/activity",
    "http://localhost:8080/t/450ea86c756bb8c51d6f/activity",
    "http://localhost:8080/t/4bbc8e5ab32d5604d729/activity",
    "http://localhost:8080/l/4a2eaecdb49840be719b/activity",
    "http://localhost:8080/c/33aba1aa73e01859fb/activity",
    "http://localhost:8080/c/36a9ca26d8e7503a2c/activity"
  ]
}
```

#### `GET /u/:id/following`

Description: Get JSON object containing individuals that the user follows.

Authorization: None.

Sample HTTP Payload:

```
GET http://localhost:8080/u/larvae/following
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://localhost:8080/u/larvae/following",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://localhost:8080/u/bob"
  ]
}
```

#### `GET /u/:id/followers`

Description: Get JSON object containing individuals that are following the user.

Authorization: None.

Sample HTTP Payload:

```
GET http://localhost:8080/u/bob/followers
```

Response:

```
200 OK
Content-Type: application/activity+json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://localhost:8080/u/bob/followers",
  "type": "OrderedCollection",
  "totalItems": 1,
  "orderedItems": [
    "http://localhost:8080/u/larvae"
  ]
}
```

#### `GET /u/:id/main-key`

Description: Get user public key - For cryptography purposes. Plain text.

Authorization: None.

Sample HTTP Payload:

```
GET http://localhost:8080/u/bob/main-key
```

Response:

```
200 OK
Content-Type: text/plain
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2lRJx5zw9babXkfEJNrjF4vFFTnXKU0kZ1kltSVWfyRcd44gaU+yhPVitez/YRJvihOdc1NeKzPBwfgJlnU1a6EEh71IlyZdkp+rIIPij5tIcSkyq+u4oDR5xkiXQhcxk2L5eYZlrIr3LKkfehEtwwRIoq14aXBlK9nMT0WdkogOwmDyQRwLaWcUFq7ZcBCw0xCClZpiOWS7+7tj3g2TxwEUPUuQdcXEDMyNOKTuoUq7BxFtKwu14AN1lMO6jVAHhrKOD9gFrgfULNDsIax0BcDDEQYzeASeZdKMsOo47+zAw6nipzUloZAb8huCBRVl1GyE9lYUOG1m/slo+fTd2wIDAQAB
-----END PUBLIC KEY-----
```

#### `POST /u/:id/outbox` + Types

##### `type: "Follow"`

Used to indicate that the actor who sent the request wants to recieve posts sent
by the user. We reccomend you do this via. `/x/follow`

##### `type: "Undo"`

Used to indicate that the actor who sent the request no longer wants to recieve
posts sent by the user. We reccomend you do this via. `/x/undo`

#### `POST /u/:id/inbox` + Types

##### `type: "Create" | "Update"`

Will add URL of recieved object to inbox - Will occur with the creation of a
comment, list, or torrent.

#### `POST /u/:id/` + Types

##### `type "Update"`

Will overwrite data with provided. The available types are as follows:

- `name`: Name of the user (Not the ID!). Text only.
- `summary`: Summary of the user. Text only.
- `icon`: User avatar. Must be an image (JPG/PNG) encoded as a `UInt8Array`.
- `banner`: User banner. Must be an image (JPG/PNG) encoded as a `UInt8Array`.
