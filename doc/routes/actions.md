# Actions API

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

#### GET `/x/:id`
Description: Get JSON object containing actions.
Authorization: None
Sample HTTP payload:
```
GET /x/3cad06b52542ed42f2/
```
Response:
```
200 OK
Content-Type: application/activity+json
{
    "@context": "https://www.w3.org/ns/activitystreams",
    id: "http://localhost:8080/x/3cad06b52542ed42f2",
    type: "Follow",
    actor: "http://localhost:8080/u/larvae",
    summary: "http://localhost:8080/u/larvae asks to follow http://localhost:8080/u/bob",
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
{
  "object": "http://localhost:8080/u/bob"
}
```

Response:

```
POST /x/follow
Content-Type: application/json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  id: "http://localhost:8080/x/e0a4be5c3cd41",
  type: "Accept",
  actor: "http://localhost:8080/u/bob",
  summary: "http://localhost:8080/u/larvae following bob",
  to: [ "https://www.w3.org/ns/activitystreams#Public" ]
}
```

